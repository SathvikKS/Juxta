import React from "react"
import {
  ArrowLeftRight,
  Trash2,
  Clipboard,
  FileText,
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsPanel, DEFAULT_SETTINGS } from "./SettingsPanel"
import type { DiffSettings } from "./SettingsPanel"
import { StatsBar } from "./StatsBar"
import { DiffViewer } from "./DiffViewer"
import {
  computeAlignedDiff,
  computeUnifiedDiff,
  computeSimilarity,
} from "@/lib/diffEngine"

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

export default function DiffChecker() {
  // Texts
  const [originalText, setOriginalText] = React.useState<string>(() => {
    return localStorage.getItem("diff_original_text") ?? SAMPLE_ORIGINAL
  })
  const [changedText, setChangedText] = React.useState<string>(() => {
    return localStorage.getItem("diff_changed_text") ?? SAMPLE_CHANGED
  })

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
  const [settings, setSettings] = React.useState<DiffSettings>(() => {
    const saved = localStorage.getItem("diff_settings")
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    return DEFAULT_SETTINGS
  })

  // Views & tabs
  const [activeTab, setActiveTab] = React.useState<string>("edit")
  const [viewMode, setViewMode] = React.useState<"split" | "unified">("split")

  // The actual texts and settings used to compute the visual diff.
  // This decoupling prevents cascading updates and allows support for manual triggers.
  const [comparedState, setComparedState] = React.useState<{
    original: string
    changed: string
    settings: DiffSettings
  }>(() => ({
    original: originalText,
    changed: changedText,
    settings,
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
    setComparedState({
      original: originalText,
      changed: changedText,
      settings,
    })
  }, [originalText, changedText, settings])

  // Auto-compare logic: when inputs/settings change, update comparedState if autoCompare is on (>= 0)
  React.useEffect(() => {
    const delay = settings.autoCompare
    if (delay >= 0) {
      if (delay === 0) {
        const timer = setTimeout(() => {
          setComparedState({
            original: originalText,
            changed: changedText,
            settings,
          })
        }, 0)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => {
          setComparedState({
            original: originalText,
            changed: changedText,
            settings,
          })
        }, delay)
        return () => clearTimeout(timer)
      }
    }
  }, [originalText, changedText, settings])

  // Reset activeTab to "edit" when autoCompare is disabled (-1)
  React.useEffect(() => {
    if (settings.autoCompare === -1) {
      const timer = setTimeout(() => {
        setActiveTab("edit")
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [settings.autoCompare])

  // Compute actual visual diffs based strictly on comparedState using useMemo
  const { alignedLines, unifiedLines, similarity } = React.useMemo(() => {
    const aligned = computeAlignedDiff(
      comparedState.original,
      comparedState.changed,
      comparedState.settings
    )
    const unified = computeUnifiedDiff(
      comparedState.original,
      comparedState.changed,
      comparedState.settings
    )
    const sim = computeSimilarity(
      comparedState.original,
      comparedState.changed,
      comparedState.settings.caseSensitive
    )
    return { alignedLines: aligned, unifiedLines: unified, similarity: sim }
  }, [comparedState])

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
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-border/70 bg-card shadow-xs"
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
          <textarea
            className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-background/50 p-4 font-mono text-sm leading-relaxed focus-visible:ring-0 focus-visible:outline-none"
            placeholder="Paste the original content here or drag-and-drop a text file..."
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
          />
        </Card>

        {/* Swap Button container in-between */}
        <div className="absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 animate-pulse cursor-pointer rounded-full border border-border bg-background shadow-md hover:animate-none hover:bg-muted"
            onClick={handleSwap}
            title="Swap contents"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </Button>
        </div>

        {/* Right Input Pane: Changed */}
        <Card
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-border/70 bg-card shadow-xs"
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
          <textarea
            className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-background/50 p-4 font-mono text-sm leading-relaxed focus-visible:ring-0 focus-visible:outline-none"
            placeholder="Paste the changed content here or drag-and-drop a text file..."
            value={changedText}
            onChange={(e) => setChangedText(e.target.value)}
          />
        </Card>
      </div>
    )
  }

  // Stats calculation
  const addedCount = unifiedLines.filter((l) => l.type === "added").length
  const removedCount = unifiedLines.filter((l) => l.type === "removed").length
  const totalLines = alignedLines.length

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-hidden p-4 md:p-6">
      {/* Header Panel */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/80 pb-5 md:flex-row md:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary dark:bg-primary/20">
              <ArrowLeftRight className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              Differ
            </h1>
            <span className="rounded-md border border-border/50 bg-muted/80 px-2 py-0.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Offline
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            A fully local, secure, and client-side text differences visualizer.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <SettingsPanel settings={settings} onSettingsChange={setSettings} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="cursor-pointer gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>

          {settings.autoCompare === -1 && (
            <Button
              size="sm"
              onClick={() => {
                handleCompare()
                setActiveTab("diff")
              }}
              className="cursor-pointer gap-2 font-semibold shadow-xs"
            >
              <Play className="h-4 w-4 fill-current" />
              Run Compare
            </Button>
          )}
        </div>
      </div>

      {/* Tabs / Live Layout */}
      {settings.autoCompare >= 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-5">
          {renderInputPanes(true)}
          
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Sync scroll controls / view mode switcher */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-1.5 shrink-0">
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-xs font-semibold text-muted-foreground">Live Visual Diff</span>
              </div>
              <div className="flex items-center gap-2">
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
            </div>

            {/* Stats Bar */}
            <StatsBar
              similarity={similarity}
              addedCount={addedCount}
              removedCount={removedCount}
              totalLines={totalLines}
            />

            {/* Interactive Viewer */}
            <DiffViewer
              alignedLines={alignedLines}
              unifiedLines={unifiedLines}
              viewMode={viewMode}
              showLineNumbers={settings.showLineNumbers}
              wrapLines={settings.wrapLines}
              scrollLock={settings.scrollLock}
            />
          </div>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full flex-1 flex-col gap-4"
        >
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 p-1.5 sm:flex-row sm:items-center">
            <TabsList className="gap-1 border-0 bg-transparent p-0">
              <TabsTrigger
                value="edit"
                className="cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                1. Input Text
              </TabsTrigger>
              <TabsTrigger
                value="diff"
                className="cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                2. Visual Diff
              </TabsTrigger>
            </TabsList>

            {/* Sub-controls when in Visual Diff mode */}
            {activeTab === "diff" && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
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
            )}
          </div>

          <TabsContent
            value="edit"
            className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
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
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Diff Output Pane */}
          <TabsContent
            value="diff"
            className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
          >
            {/* Stats Bar */}
            <StatsBar
              similarity={similarity}
              addedCount={addedCount}
              removedCount={removedCount}
              totalLines={totalLines}
            />

            {/* Interactive Viewer */}
            <DiffViewer
              alignedLines={alignedLines}
              unifiedLines={unifiedLines}
              viewMode={viewMode}
              showLineNumbers={settings.showLineNumbers}
              wrapLines={settings.wrapLines}
              scrollLock={settings.scrollLock}
            />

            {/* Back button */}
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab("edit")}
                className="cursor-pointer gap-2"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Edit Text
              </Button>

              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                Compares client-side only. Data never leaves your device.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
