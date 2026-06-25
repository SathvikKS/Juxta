import React from "react"
import { ArrowLeftRight, Trash2, Clipboard, FileText, ArrowRight, Play, Sparkles } from "lucide-react"
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

greet({ name: "Alice", isAdmin: true });`;

const SAMPLE_CHANGED = `// Offline Text Diff Checker
// Paste your changed code/text here.

function greet(user) {
  // Greet user with their display name
  console.log(\`Hello, \${user.displayName || user.name}!\`);
  
  if (user.role === "admin") {
    console.log("Welcome to the admin panel!");
  }
}

greet({ name: "Alice", displayName: "Ally", role: "admin" });`;

export default function DiffChecker() {
  // Texts
  const [originalText, setOriginalText] = React.useState<string>(() => {
    return localStorage.getItem("diff_original_text") ?? SAMPLE_ORIGINAL
  })
  const [changedText, setChangedText] = React.useState<string>(() => {
    return localStorage.getItem("diff_changed_text") ?? SAMPLE_CHANGED
  })

  // File names & sizes (if uploaded)
  const [originalFile, setOriginalFile] = React.useState<{ name: string; size: number } | null>(null)
  const [changedFile, setChangedFile] = React.useState<{ name: string; size: number } | null>(null)

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

  // Auto-compare logic: when inputs/settings change, update comparedState if autoCompare is on
  React.useEffect(() => {
    if (settings.autoCompare) {
      const timer = setTimeout(() => {
        setComparedState({
          original: originalText,
          changed: changedText,
          settings,
        })
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [originalText, changedText, settings])

  // Compute actual visual diffs based strictly on comparedState using useMemo
  const { alignedLines, unifiedLines, similarity } = React.useMemo(() => {
    const aligned = computeAlignedDiff(comparedState.original, comparedState.changed, comparedState.settings)
    const unified = computeUnifiedDiff(comparedState.original, comparedState.changed, comparedState.settings)
    const sim = computeSimilarity(comparedState.original, comparedState.changed, comparedState.settings.caseSensitive)
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

  const handleDrop = (
    e: React.DragEvent,
    target: "original" | "changed"
  ) => {
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

  // Stats calculation
  const addedCount = unifiedLines.filter((l) => l.type === "added").length
  const removedCount = unifiedLines.filter((l) => l.type === "removed").length
  const totalLines = alignedLines.length

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 min-h-[calc(100vh-3rem)]">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl dark:bg-primary/20">
              <ArrowLeftRight className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Differ
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
              Offline
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            A fully local, secure, and client-side text differences visualizer.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <SettingsPanel settings={settings} onSettingsChange={setSettings} />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>

          <Button
            size="sm"
            onClick={() => {
              handleCompare()
              setActiveTab("diff")
            }}
            className="gap-2 cursor-pointer shadow-xs font-semibold"
          >
            <Play className="h-4 w-4 fill-current" />
            Run Compare
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/40 p-1.5 rounded-xl border border-border/60">
          <TabsList className="bg-transparent border-0 gap-1 p-0">
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
              <div className="bg-background border border-border p-1 rounded-lg flex items-center gap-1 shadow-xs">
                <Button
                  variant={viewMode === "split" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 px-3 text-xs font-semibold w-auto cursor-pointer rounded-md"
                  onClick={() => setViewMode("split")}
                >
                  Split View
                </Button>
                <Button
                  variant={viewMode === "unified" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 px-3 text-xs font-semibold w-auto cursor-pointer rounded-md"
                  onClick={() => setViewMode("unified")}
                >
                  Unified View
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Editor Pane */}
        <TabsContent value="edit" className="flex-1 flex flex-col gap-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 items-stretch">
            
            {/* Left Input Pane: Original */}
            <Card
              className="flex flex-col border-border/70 overflow-hidden shadow-xs relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "original")}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60 text-xs font-medium">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Original Text</span>
                  {originalFile && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">
                      {originalFile.name} ({formatFileSize(originalFile.size)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground mr-1">
                    {getLineCount(originalText)} lines
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md cursor-pointer"
                    onClick={() => handlePaste("original")}
                    title="Paste from clipboard"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                  <label className="h-7 px-2.5 text-[10px] border border-border/60 hover:bg-muted text-muted-foreground font-semibold rounded-md flex items-center justify-center cursor-pointer">
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
                className="flex-1 min-h-[350px] lg:min-h-[500px] p-4 font-mono text-sm leading-relaxed bg-background/50 border-0 focus-visible:ring-0 focus-visible:outline-none resize-none"
                placeholder="Paste the original content here or drag-and-drop a text file..."
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
              />
            </Card>

            {/* Swap Button container in-between */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full shadow-md bg-background border border-border hover:bg-muted h-10 w-10 cursor-pointer animate-pulse hover:animate-none"
                onClick={handleSwap}
                title="Swap contents"
              >
                <ArrowLeftRight className="h-4 w-4 text-primary" />
              </Button>
            </div>

            {/* Right Input Pane: Changed */}
            <Card
              className="flex flex-col border-border/70 overflow-hidden shadow-xs relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "changed")}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60 text-xs font-medium">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Changed Text</span>
                  {changedFile && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">
                      {changedFile.name} ({formatFileSize(changedFile.size)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground mr-1">
                    {getLineCount(changedText)} lines
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md cursor-pointer"
                    onClick={() => handlePaste("changed")}
                    title="Paste from clipboard"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                  <label className="h-7 px-2.5 text-[10px] border border-border/60 hover:bg-muted text-muted-foreground font-semibold rounded-md flex items-center justify-center cursor-pointer">
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
                className="flex-1 min-h-[350px] lg:min-h-[500px] p-4 font-mono text-sm leading-relaxed bg-background/50 border-0 focus-visible:ring-0 focus-visible:outline-none resize-none"
                placeholder="Paste the changed content here or drag-and-drop a text file..."
                value={changedText}
                onChange={(e) => setChangedText(e.target.value)}
              />
            </Card>
          </div>

          {/* Compare Button */}
          <div className="flex justify-end gap-3 items-center">
            <Button variant="ghost" onClick={handleSwap} className="gap-2 cursor-pointer lg:hidden">
              <ArrowLeftRight className="h-4 w-4" /> Swap Texts
            </Button>
            <Button
              size="lg"
              onClick={() => {
                handleCompare()
                setActiveTab("diff")
              }}
              className="gap-2 px-8 cursor-pointer shadow-md font-semibold"
            >
              <span>Visualize Changes</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Diff Output Pane */}
        <TabsContent value="diff" className="flex-1 flex flex-col gap-4 focus-visible:outline-none">
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
          />

          {/* Back button */}
          <div className="flex justify-between items-center mt-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab("edit")}
              className="gap-2 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Edit Text
            </Button>

            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              Compares client-side only. Data never leaves your device.
            </span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
