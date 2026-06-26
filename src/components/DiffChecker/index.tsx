import React from "react"
import {
  ArrowLeftRight,
  Trash2,
  Clipboard,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { SettingsPanel } from "./SettingsPanel"
import { PresetOptionsPopover } from "./PresetOptionsPopover"
import {
  hydrateSettings,
  settingsReducer,
} from "./settingsEngine"
import type {
  DiffSettings,
  PresetOptionValue,
  PresetType,
} from "./settingsEngine"
import type { SettingCategory } from "./settingsSchema"
import { CommandMenu } from "./CommandMenu"
import { StatsBar } from "./StatsBar"
import { DiffViewer } from "./DiffViewer"
import { TextEditor } from "./TextEditor"
import {
  buildDiffRenderResult,
  createDiffRenderState,
  diffRenderReducer,
  isDiffRenderPending,
  isSameDiffRenderRequest,
} from "./diffRenderEngine"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SAMPLE_ORIGINAL = `// Offline Text Diff Checker
// Paste your original code/text here.

function greet(user) {
  console.log("Hello, " + user.name);
  if (user.isAdmin) {
    console.log("Welcome to the admin area!");
  }
}

greet({ name: "Alice", isAdmin: true });`

const SAMPLE_CHANGED = `// Offline Text Diff Checker
// Paste your changed code/text here.

function greet(user) {
  // Greet user with their display name
  console.log(\`Hello, \${user.displayName || user.name}!\`);
  
  if (user.role === "admin") {
    console.log("Welcome to the admin panel!");
  }
}

greet({ name: "Alice", displayName: "Ally", role: "admin" });`

function isKeyValueFormat(text: string): boolean {
  if (!text || text.trim() === "") return false
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#") && !l.startsWith("//") && !l.startsWith(";"))

  if (lines.length === 0) return false

  // Check if the text contains JSON/CSS/JS/TS structural indicators to avoid false positives
  if (
    text.includes("{") ||
    text.includes("}") ||
    text.includes("const ") ||
    text.includes("let ") ||
    text.includes("import ")
  ) {
    return false
  }

  let matchCount = 0
  const linesToTest = lines.slice(0, 30)
  for (const line of linesToTest) {
    if (/^[A-Za-z0-9_.-]+\s*[=:]/.test(line)) {
      matchCount++
    }
  }
  return matchCount / linesToTest.length > 0.7
}

export default function DiffChecker() {
  // Texts
  const [originalText, setOriginalText] = React.useState<string>(() => {
    return localStorage.getItem("diff_original_text") ?? SAMPLE_ORIGINAL
  })
  const [changedText, setChangedText] = React.useState<string>(() => {
    return localStorage.getItem("diff_changed_text") ?? SAMPLE_CHANGED
  })

  // Preset dismiss tip state
  const [dismissedKeyValTip, setDismissedKeyValTip] = React.useState(false)

  // File names & sizes (if uploaded)
  const [originalFile, setOriginalFile] = React.useState<{
    name: string
    size: number
  } | null>(null)
  const [changedFile, setChangedFile] = React.useState<{
    name: string
    size: number
  } | null>(null)

  // Settings
  const [settings, dispatchSettings] = React.useReducer(
    settingsReducer,
    undefined,
    () => hydrateSettings(localStorage.getItem("diff_settings"))
  )

  // Settings Panel state control
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)
  const [settingsActiveTab, setSettingsActiveTab] = React.useState<SettingCategory>("comparison")
  const [highlightedSetting, setHighlightedSetting] = React.useState<string | null>(null)
  const [isCommandMenuOpen, setIsCommandMenuOpen] = React.useState(false)

  const handleOpenSettingsPanel = (category: SettingCategory, key: string) => {
    setSettingsActiveTab(category)
    setHighlightedSetting(key)
    setIsSettingsOpen(true)
  }

  // Views & tabs
  const [activeTab, setActiveTab] = React.useState<string>("edit")
  const [viewMode, setViewMode] = React.useState<"split" | "unified">("split")

  // Texts selected for the visual diff. Settings remain live render inputs so
  // preset changes do not leave the viewer showing a stale ready state.
  const [comparedTexts, setComparedTexts] = React.useState<{
    original: string
    changed: string
  }>(() => ({
    original: originalText,
    changed: changedText,
  }))

  // Save texts to localStorage
  React.useEffect(() => {
    localStorage.setItem("diff_original_text", originalText)
  }, [originalText])

  React.useEffect(() => {
    localStorage.setItem("diff_changed_text", changedText)
  }, [changedText])

  // Save settings to localStorage
  React.useEffect(() => {
    localStorage.setItem("diff_settings", JSON.stringify(settings))
  }, [settings])

  // Trigger manual compare
  const handleCompare = React.useCallback(() => {
    setComparedTexts({
      original: originalText,
      changed: changedText,
    })
  }, [originalText, changedText])

  // Detect if macOS for keyboard shortcut display
  const isMac = React.useMemo(() => {
    if (typeof window === "undefined") return false
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
  }, [])

  // Keyboard shortcut: Cmd+Enter/Ctrl+Enter to run compare, Escape to go back
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settings.autoCompare === -1) {
        if (
          activeTab === "edit" &&
          (e.metaKey || e.ctrlKey) &&
          e.key === "Enter"
        ) {
          e.preventDefault()
          handleCompare()
          setActiveTab("diff")
        } else if (activeTab === "diff" && e.key === "Escape") {
          e.preventDefault()
          setActiveTab("edit")
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [settings.autoCompare, activeTab, handleCompare])

  // Auto-compare logic: when inputs change, update compared texts if autoCompare is on (>= 0).
  React.useEffect(() => {
    const delay = settings.autoCompare
    if (delay >= 0) {
      if (delay === 0) {
        const timer = setTimeout(() => {
          setComparedTexts({
            original: originalText,
            changed: changedText,
          })
        }, 0)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => {
          setComparedTexts({
            original: originalText,
            changed: changedText,
          })
        }, delay)
        return () => clearTimeout(timer)
      }
    }
  }, [originalText, changedText, settings.autoCompare])

  // Reset activeTab to "edit" when autoCompare is disabled (-1)
  React.useEffect(() => {
    if (settings.autoCompare === -1) {
      const timer = setTimeout(() => {
        setActiveTab("edit")
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [settings.autoCompare])

  // Detect if key-value file format is inputted
  const isKeyValueDetected = React.useMemo(() => {
    return isKeyValueFormat(originalText) || isKeyValueFormat(changedText)
  }, [originalText, changedText])

  const handleSettingChange = (
    key: keyof DiffSettings,
    value: DiffSettings[keyof DiffSettings]
  ) => {
    dispatchSettings({ type: "updateSetting", key, value })
  }

  const handleResetSettings = () => {
    dispatchSettings({ type: "reset" })
  }

  const handleApplyPreset = (presetId: PresetType) => {
    dispatchSettings({ type: "applyPreset", presetId })
  }

  const handlePresetOptionChange = (
    key: string,
    value: PresetOptionValue
  ) => {
    dispatchSettings({ type: "updatePresetOption", key, value })
  }

  const showKeyValBanner =
    settings.autoDetectPresets &&
    isKeyValueDetected &&
    settings.preset !== "env" &&
    !dismissedKeyValTip

  const renderPresetRecommendationBanner = () => {
    if (!showKeyValBanner) return null
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs md:text-sm animate-fade-in shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-primary shrink-0 animate-pulse" />
          <span className="text-muted-foreground">
            <strong className="text-foreground font-semibold">Environment/Properties format detected.</strong>{" "}
            Apply the <span className="font-semibold text-primary">.env</span> preset to sort keys and ignore formatting differences?
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-semibold px-2.5 hover:bg-primary/15 hover:text-primary cursor-pointer"
            onClick={() => handleApplyPreset("env")}
          >
            Apply Preset
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            onClick={() => setDismissedKeyValTip(true)}
            title="Dismiss suggestion"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  const renderRequest = React.useMemo(
    () => ({
      original: comparedTexts.original,
      changed: comparedTexts.changed,
      settings,
    }),
    [comparedTexts.original, comparedTexts.changed, settings]
  )

  const [renderState, dispatchRender] = React.useReducer(
    diffRenderReducer,
    renderRequest,
    createDiffRenderState
  )
  const renderTokenRef = React.useRef(renderState.token)
  const lastScheduledRenderRequestRef = React.useRef(renderRequest)
  const hasPendingAutoCompareText =
    settings.autoCompare >= 0 &&
    (comparedTexts.original !== originalText ||
      comparedTexts.changed !== changedText)

  React.useEffect(() => {
    if (hasPendingAutoCompareText) {
      return
    }

    if (
      isSameDiffRenderRequest(
        lastScheduledRenderRequestRef.current,
        renderRequest
      )
    ) {
      return
    }

    lastScheduledRenderRequestRef.current = renderRequest
    renderTokenRef.current += 1
    const token = renderTokenRef.current
    let startTimer: ReturnType<typeof setTimeout> | undefined
    let computeTimer: ReturnType<typeof setTimeout> | undefined

    const scheduleTimer = setTimeout(() => {
      dispatchRender({ type: "schedule", request: renderRequest, token })

      startTimer = setTimeout(() => {
        dispatchRender({ type: "start", token })

        computeTimer = setTimeout(() => {
          dispatchRender({
            type: "complete",
            token,
            result: buildDiffRenderResult(renderRequest),
          })
        }, 0)
      }, 0)
    }, 0)

    return () => {
      clearTimeout(scheduleTimer)
      if (startTimer) {
        clearTimeout(startTimer)
      }
      if (computeTimer) {
        clearTimeout(computeTimer)
      }
    }
  }, [hasPendingAutoCompareText, renderRequest])

  const isComputing = isDiffRenderPending(
    renderState,
    renderRequest,
    hasPendingAutoCompareText
  )
  const { alignedLines, unifiedLines, similarity } = renderState.result

  // Swap texts
  const handleSwap = () => {
    const tempText = originalText
    setOriginalText(changedText)
    setChangedText(tempText)

    const tempFile = originalFile
    setOriginalFile(changedFile)
    setChangedFile(tempFile)
  }

  // Clear texts
  const handleClearAll = () => {
    setOriginalText("")
    setChangedText("")
    setOriginalFile(null)
    setChangedFile(null)
    dispatchSettings({ type: "applyPreset", presetId: "none" })
  }

  // File Upload Helper
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "original" | "changed"
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (target === "original") {
        setOriginalText(text)
        setOriginalFile({ name: file.name, size: file.size })
      } else {
        setChangedText(text)
        setChangedFile({ name: file.name, size: file.size })
      }
    }
    reader.readAsText(file)
  }

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, target: "original" | "changed") => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (target === "original") {
        setOriginalText(text)
        setOriginalFile({ name: file.name, size: file.size })
      } else {
        setChangedText(text)
        setChangedFile({ name: file.name, size: file.size })
      }
    }
    reader.readAsText(file)
  }

  // Format File Size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  // Count lines in text
  const getLineCount = (text: string) => {
    return text === "" ? 0 : text.split("\n").length
  }

  // Paste from clipboard helper
  const handlePaste = async (target: "original" | "changed") => {
    try {
      const text = await navigator.clipboard.readText()
      if (target === "original") {
        setOriginalText(text)
      } else {
        setChangedText(text)
      }
    } catch (err) {
      console.error("Failed to read clipboard: ", err)
    }
  }

  // Render Input Card Panes
  const renderInputPanes = (isCompact: boolean = false) => {
    return (
      <div className={`grid min-h-0 ${isCompact ? "h-[360px] lg:h-[240px] shrink-0" : "flex-1"} grid-cols-1 items-stretch gap-5 lg:grid-cols-2 relative`}>
        {/* Left Input Pane: Original */}
        <Card
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-border/70 bg-card shadow-xs py-0 gap-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "original")}
        >
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-medium shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Original Text</span>
              {originalFile && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {originalFile.name} ({formatFileSize(originalFile.size)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="mr-1 text-muted-foreground">
                {getLineCount(originalText)} lines
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer rounded-md"
                onClick={() => handlePaste("original")}
                title="Paste from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
              <label className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-border/60 px-2.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "original")}
                />
              </label>
            </div>
          </div>
          <TextEditor
            placeholder="Paste the original content here or drag-and-drop a text file..."
            value={originalText}
            onChange={setOriginalText}
            showLineNumbers={settings.showLineNumbers}
            wrapLines={settings.wrapLines}
            disableSpellCheck={settings.disableSpellCheck}
          />
        </Card>

        {/* Swap Button container in-between */}
        <div className="absolute top-1/2 left-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 cursor-pointer rounded-full border border-border bg-background shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 hover:bg-muted"
            onClick={handleSwap}
            title="Swap contents"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Right Input Pane: Changed */}
        <Card
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-border/70 bg-card shadow-xs py-0 gap-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "changed")}
        >
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 text-xs font-medium shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Changed Text</span>
              {changedFile && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {changedFile.name} ({formatFileSize(changedFile.size)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="mr-1 text-muted-foreground">
                {getLineCount(changedText)} lines
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer rounded-md"
                onClick={() => handlePaste("changed")}
                title="Paste from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
              <label className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-border/60 px-2.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "changed")}
                />
              </label>
            </div>
          </div>
          <TextEditor
            placeholder="Paste the changed content here or drag-and-drop a text file..."
            value={changedText}
            onChange={setChangedText}
            showLineNumbers={settings.showLineNumbers}
            wrapLines={settings.wrapLines}
            disableSpellCheck={settings.disableSpellCheck}
          />
        </Card>
      </div>
    )
  }

  // Stats calculation
  const addedCount = unifiedLines.filter((l) => l.type === "added").length
  const removedCount = unifiedLines.filter((l) => l.type === "removed").length
  const totalLines = alignedLines.length

  const renderDiffControls = () => (
    <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
      <PresetOptionsPopover
        settings={settings}
        onPresetOptionChange={handlePresetOptionChange}
      />
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-xs">
        <Button
          variant={viewMode === "split" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-auto cursor-pointer rounded-md px-3 text-xs font-semibold"
          onClick={() => setViewMode("split")}
        >
          Split View
        </Button>
        <Button
          variant={viewMode === "unified" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-auto cursor-pointer rounded-md px-3 text-xs font-semibold"
          onClick={() => setViewMode("unified")}
        >
          Unified View
        </Button>
      </div>
    </div>
  )

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden p-4 md:p-6">
      {/* Header Panel */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-5 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <img src="/juxta.svg" alt="Juxta Logo" className="h-9 w-9 select-none object-contain" />
            <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Juxta
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            A fully local, secure, and client-side text differences visualizer.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={settings.preset}
            onValueChange={(val) => handleApplyPreset(val as PresetType)}
          >
            <SelectTrigger className="w-[150px] h-9 cursor-pointer text-xs font-semibold border-border bg-background shadow-xs">
              <SelectValue placeholder="Preset: None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="cursor-pointer text-xs">
                Preset: None
              </SelectItem>
              <SelectItem value="env" className="cursor-pointer text-xs">
                Preset: .env
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2 shadow-xs"
            onClick={() => setIsCommandMenuOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <Kbd className="ml-0.5 text-[10px] scale-90 border-muted-foreground/30 bg-muted/50 text-muted-foreground select-none">
              {isMac ? "⌘" : "Ctrl"}K
            </Kbd>
          </Button>

          <SettingsPanel
            settings={settings}
            onSettingChange={handleSettingChange}
            onResetSettings={handleResetSettings}
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            activeTab={settingsActiveTab}
            onActiveTabChange={setSettingsActiveTab}
            highlightedSettingKey={highlightedSetting}
            onClearHighlight={() => setHighlightedSetting(null)}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="cursor-pointer gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>


        </div>
      </div>

      {/* Tabs / Live Layout */}
      {settings.autoCompare >= 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          {renderInputPanes(true)}
          
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {renderPresetRecommendationBanner()}
            {/* Stats Bar with View Switcher */}
            <StatsBar
              similarity={similarity}
              addedCount={addedCount}
              removedCount={removedCount}
              totalLines={totalLines}
              keyValueSorted={settings.sortKeyValuePairs}
              isComputing={isComputing}
            >
              {renderDiffControls()}
            </StatsBar>

            {/* Interactive Viewer */}
            <DiffViewer
              alignedLines={alignedLines}
              unifiedLines={unifiedLines}
              viewMode={viewMode}
              showLineNumbers={settings.showLineNumbers}
              wrapLines={settings.wrapLines}
              scrollLock={settings.scrollLock}
              originalText={renderRequest.original}
              changedText={renderRequest.changed}
              isComputing={isComputing}
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full flex-1 overflow-hidden">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-in-out"
            style={{
              transform: activeTab === "diff" ? "translateX(-50%)" : "translateX(0%)",
            }}
          >
            {/* Slide 1: Editor */}
            <div
              className="flex h-full w-1/2 flex-col gap-4 px-1"
              inert={activeTab !== "edit"}
            >
              {renderInputPanes(false)}

              {/* Compare Button */}
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSwap}
                  className="cursor-pointer gap-2 lg:hidden"
                >
                  <ArrowLeftRight className="h-4 w-4" /> Swap Texts
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    handleCompare()
                    setActiveTab("diff")
                  }}
                  className="cursor-pointer gap-2 px-8 font-semibold shadow-md"
                >
                  <span>Visualize Changes</span>
                  <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground/90">
                    {isMac ? "⌘" : "Ctrl"}↵
                  </Kbd>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Slide 2: Diff Visualizer */}
            <div
              className="flex h-full w-1/2 flex-col gap-4 px-1"
              inert={activeTab !== "diff"}
            >
              {renderPresetRecommendationBanner()}
              {/* Stats Bar with View Switcher */}
              <StatsBar
                similarity={similarity}
                addedCount={addedCount}
                removedCount={removedCount}
                totalLines={totalLines}
                keyValueSorted={settings.sortKeyValuePairs}
                isComputing={isComputing}
              >
                {renderDiffControls()}
              </StatsBar>

              {/* Interactive Viewer */}
              <DiffViewer
                alignedLines={alignedLines}
                unifiedLines={unifiedLines}
                viewMode={viewMode}
                showLineNumbers={settings.showLineNumbers}
                wrapLines={settings.wrapLines}
                scrollLock={settings.scrollLock}
                originalText={renderRequest.original}
                changedText={renderRequest.changed}
                isComputing={isComputing}
              />

              {/* Bottom Action Controls */}
              <div className="flex items-center justify-between gap-3 shrink-0 mt-1">
                <Button
                  size="lg"
                  onClick={() => setActiveTab("edit")}
                  className="cursor-pointer gap-2 px-8 font-semibold shadow-md"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Editor</span>
                  <Kbd className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground/90">
                    Esc
                  </Kbd>
                </Button>

                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                  Compares client-side only. Data never leaves your device.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      <CommandMenu
        open={isCommandMenuOpen}
        onOpenChange={setIsCommandMenuOpen}
        settings={settings}
        onSettingChange={handleSettingChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearAll={handleClearAll}
        onSwap={handleSwap}
        onOpenSettingsPanel={handleOpenSettingsPanel}
        onResetSettings={handleResetSettings}
      />
    </div>
  )
}
