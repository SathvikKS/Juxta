import React from "react"
import type { Change } from "diff"
import type { AlignedLine, UnifiedLine } from "@/lib/diffEngine"

interface DiffViewerProps {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  viewMode: "split" | "unified"
  showLineNumbers: boolean
  wrapLines: boolean
  scrollLock: boolean
}

export function DiffViewer({
  alignedLines,
  unifiedLines,
  viewMode,
  showLineNumbers,
  wrapLines,
  scrollLock,
}: DiffViewerProps) {
  const leftScrollRef = React.useRef<HTMLDivElement>(null)
  const rightScrollRef = React.useRef<HTMLDivElement>(null)
  const isSyncing = React.useRef(false)

  // Synchronized scrolling handler
  const handleScroll = (source: "left" | "right") => {
    if (!scrollLock) return
    if (isSyncing.current) return

    const sourceEl =
      source === "left" ? leftScrollRef.current : rightScrollRef.current
    const targetEl =
      source === "left" ? rightScrollRef.current : leftScrollRef.current

    if (!sourceEl || !targetEl) return

    isSyncing.current = true
    targetEl.scrollTop = sourceEl.scrollTop
    targetEl.scrollLeft = sourceEl.scrollLeft

    // Clear sync lock in next animation frame
    requestAnimationFrame(() => {
      isSyncing.current = false
    })
  }

  // Resync scrolls when scroll lock is enabled
  React.useEffect(() => {
    if (scrollLock && viewMode === "split") {
      const left = leftScrollRef.current
      const right = rightScrollRef.current
      if (left && right) {
        isSyncing.current = true
        right.scrollTop = left.scrollTop
        right.scrollLeft = left.scrollLeft
        requestAnimationFrame(() => {
          isSyncing.current = false
        })
      }
    }
  }, [scrollLock, viewMode])

  // Return background color classes for line categories
  const getLineBgClass = (type: "added" | "removed" | "normal" | "empty") => {
    switch (type) {
      case "added":
        return "bg-green-500/10 text-green-900 dark:text-green-300/90"
      case "removed":
        return "bg-red-500/10 text-red-900 dark:text-red-300/90"
      case "empty":
        return "bg-muted/15 text-muted-foreground/30 select-none relative after:absolute after:inset-0 after:bg-[linear-gradient(45deg,rgba(0,0,0,0.03)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.03)_50%,rgba(0,0,0,0.03)_75%,transparent_75%,transparent)] dark:after:bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] after:bg-[size:10px_10px]"
      default:
        return "text-foreground"
    }
  }

  // Return text color for addition/deletion indicators (+/-)
  const getPrefixColorClass = (type: "added" | "removed" | "normal") => {
    if (type === "added") return "text-green-600 dark:text-green-400"
    if (type === "removed") return "text-red-600 dark:text-red-400"
    return "text-muted-foreground/30"
  }

  // Render text content and apply inline word/character diff dark highlights
  const renderLineContent = (
    text: string,
    type: "added" | "removed" | "normal" | "empty",
    subChanges?: Change[]
  ) => {
    if (type === "empty") {
      return <div className="text-transparent select-none">&nbsp;</div>
    }

    const displayVal = text === "" ? "\u00A0" : text

    if (!subChanges || subChanges.length === 0) {
      return <span>{displayVal}</span>
    }

    return (
      <>
        {subChanges.map((part, index) => {
          if (type === "removed") {
            if (part.added) return null
            return (
              <span
                key={index}
                className={
                  part.removed
                    ? "rounded-xs border-b border-red-500/50 bg-red-500/25 px-0.5 font-semibold text-red-950 dark:bg-red-500/40 dark:text-red-100"
                    : ""
                }
              >
                {part.value}
              </span>
            )
          } else if (type === "added") {
            if (part.removed) return null
            return (
              <span
                key={index}
                className={
                  part.added
                    ? "rounded-xs border-b border-green-500/50 bg-green-500/30 px-0.5 font-semibold text-green-950 dark:bg-green-500/45 dark:text-green-100"
                    : ""
                }
              >
                {part.value}
              </span>
            )
          }
          return <span key={index}>{part.value}</span>
        })}
      </>
    )
  }

  const lineWrapClass = wrapLines
    ? "whitespace-pre-wrap break-words"
    : "whitespace-pre overflow-x-auto"

  if (viewMode === "split") {
    const rowWidthClass = wrapLines ? "w-full min-w-0" : "min-w-max"
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
        {/* Table header */}
        <div className="flex shrink-0 divide-x divide-border border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
          <div className="flex w-1/2 items-center justify-between px-4 py-2">
            <span>Original Version</span>
          </div>
          <div className="flex w-1/2 items-center justify-between px-4 py-2">
            <span>Changed Version</span>
          </div>
        </div>

        {/* Aligned Diff Code Pane */}
        <div className="flex min-h-0 flex-1 divide-x divide-border bg-background">
          {/* Left Pane (Original) */}
          <div
            ref={leftScrollRef}
            onScroll={() => handleScroll("left")}
            className="h-full w-1/2 scrollbar-thin divide-y divide-border/10 overflow-auto font-mono text-sm leading-relaxed"
          >
            {alignedLines.map((row, index) => (
              <div
                key={index}
                className={`group flex ${rowWidthClass} items-stretch ${getLineBgClass(row.left.type)}`}
              >
                {showLineNumbers && (
                  <div className="w-11 shrink-0 sticky left-0 z-10 border-r border-border/20 bg-background select-none">
                    <div className={`absolute inset-0 bg-muted/10 ${getLineBgClass(row.left.type)}`} />
                    <div className="relative z-20 py-1 pr-2.5 text-right text-xs text-muted-foreground/45 font-mono">
                      {row.left.lineNumber ?? ""}
                    </div>
                  </div>
                )}
                <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
                  {renderLineContent(
                    row.left.text,
                    row.left.type,
                    row.left.subChanges
                  )}
                </div>
              </div>
            ))}

            {alignedLines.length === 0 && (
              <div className="py-12 text-center font-sans text-xs text-muted-foreground">
                No original text to display.
              </div>
            )}
          </div>

          {/* Right Pane (Changed) */}
          <div
            ref={rightScrollRef}
            onScroll={() => handleScroll("right")}
            className="h-full w-1/2 scrollbar-thin divide-y divide-border/10 overflow-auto font-mono text-sm leading-relaxed"
          >
            {alignedLines.map((row, index) => (
              <div
                key={index}
                className={`group flex ${rowWidthClass} items-stretch ${getLineBgClass(row.right.type)}`}
              >
                {showLineNumbers && (
                  <div className="w-11 shrink-0 sticky left-0 z-10 border-r border-border/20 bg-background select-none">
                    <div className={`absolute inset-0 bg-muted/10 ${getLineBgClass(row.right.type)}`} />
                    <div className="relative z-20 py-1 pr-2.5 text-right text-xs text-muted-foreground/45 font-mono">
                      {row.right.lineNumber ?? ""}
                    </div>
                  </div>
                )}
                <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
                  {renderLineContent(
                    row.right.text,
                    row.right.type,
                    row.right.subChanges
                  )}
                </div>
              </div>
            ))}

            {alignedLines.length === 0 && (
              <div className="py-12 text-center font-sans text-xs text-muted-foreground">
                No changed text to display.
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Unified View
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
      <div className="flex shrink-0 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
        <div className="flex items-center gap-2 px-4 py-2">
          <span>Unified View</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 scrollbar-thin divide-y divide-border/20 overflow-y-auto font-mono text-sm leading-relaxed">
        {unifiedLines.map((line, index) => (
          <div
            key={index}
            className={`group flex ${getLineBgClass(line.type)}`}
          >
            {showLineNumbers && (
              <>
                {/* Old line no. */}
                <div className="w-11 border-r border-border/10 bg-muted/10 py-1 pr-2 text-right text-xs text-muted-foreground/45 select-none">
                  {line.oldLineNumber ?? ""}
                </div>
                {/* New line no. */}
                <div className="w-11 border-r border-border/20 bg-muted/15 py-1 pr-2.5 text-right text-xs text-muted-foreground/45 select-none">
                  {line.newLineNumber ?? ""}
                </div>
              </>
            )}

            {/* Diff Indicator +/- */}
            <div
              className={`flex w-7 items-center justify-center border-r border-border/20 py-1 text-xs font-semibold select-none ${getPrefixColorClass(line.type)}`}
            >
              {line.type === "added"
                ? "+"
                : line.type === "removed"
                  ? "-"
                  : "\u00A0"}
            </div>

            {/* Code Line */}
            <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
              {renderLineContent(line.text, line.type, line.subChanges)}
            </div>
          </div>
        ))}

        {unifiedLines.length === 0 && (
          <div className="py-12 text-center font-sans text-xs text-muted-foreground">
            No differences to display. Enter original and changed texts to
            compare.
          </div>
        )}
      </div>
    </div>
  )
}
