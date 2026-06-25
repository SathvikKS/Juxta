import type { Change } from "diff"
import type { AlignedLine, UnifiedLine } from "@/lib/diffEngine"

interface DiffViewerProps {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  viewMode: "split" | "unified"
  showLineNumbers: boolean
  wrapLines: boolean
}

export function DiffViewer({
  alignedLines,
  unifiedLines,
  viewMode,
  showLineNumbers,
  wrapLines,
}: DiffViewerProps) {
  
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
                    ? "bg-red-500/25 dark:bg-red-500/40 text-red-950 dark:text-red-100 px-0.5 rounded-xs font-semibold border-b border-red-500/50"
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
                    ? "bg-green-500/30 dark:bg-green-500/45 text-green-950 dark:text-green-100 px-0.5 rounded-xs font-semibold border-b border-green-500/50"
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

  const lineWrapClass = wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"

  if (viewMode === "split") {
    return (
      <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden bg-card text-card-foreground shadow-xs">
        {/* Table header */}
        <div className="flex text-xs font-semibold text-muted-foreground border-b border-border bg-muted/40 divide-x divide-border">
          <div className="w-1/2 py-2 px-4 flex items-center justify-between">
            <span>Original Version</span>
          </div>
          <div className="w-1/2 py-2 px-4 flex items-center justify-between">
            <span>Changed Version</span>
          </div>
        </div>

        {/* Aligned Diff Code Pane */}
        <div className="flex flex-col overflow-y-auto max-h-[650px] divide-y divide-border/20 font-mono text-sm leading-relaxed">
          {alignedLines.map((row, index) => (
            <div key={index} className="flex min-w-max hover:bg-muted/5 group divide-x divide-border/40">
              {/* Left Pane (Original) */}
              <div className={`w-1/2 flex items-stretch ${getLineBgClass(row.left.type)}`}>
                {showLineNumbers && (
                  <div className="w-11 select-none text-right pr-2.5 text-muted-foreground/45 border-r border-border/20 bg-muted/10 py-1 text-xs select-none">
                    {row.left.lineNumber ?? ""}
                  </div>
                )}
                <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
                  {renderLineContent(row.left.text, row.left.type, row.left.subChanges)}
                </div>
              </div>

              {/* Right Pane (Changed) */}
              <div className={`w-1/2 flex items-stretch ${getLineBgClass(row.right.type)}`}>
                {showLineNumbers && (
                  <div className="w-11 select-none text-right pr-2.5 text-muted-foreground/45 border-r border-border/20 bg-muted/10 py-1 text-xs select-none">
                    {row.right.lineNumber ?? ""}
                  </div>
                )}
                <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
                  {renderLineContent(row.right.text, row.right.type, row.right.subChanges)}
                </div>
              </div>
            </div>
          ))}

          {alignedLines.length === 0 && (
            <div className="py-12 text-center text-muted-foreground font-sans text-xs">
              No differences to display. Enter original and changed texts to compare.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Unified View
  return (
    <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden bg-card text-card-foreground shadow-xs">
      <div className="flex text-xs font-semibold text-muted-foreground border-b border-border bg-muted/40">
        <div className="py-2 px-4 flex items-center gap-2">
          <span>Unified View</span>
        </div>
      </div>

      <div className="flex flex-col overflow-y-auto max-h-[650px] divide-y divide-border/20 font-mono text-sm leading-relaxed">
        {unifiedLines.map((line, index) => (
          <div key={index} className={`flex hover:bg-muted/5 group ${getLineBgClass(line.type)}`}>
            {showLineNumbers && (
              <>
                {/* Old line no. */}
                <div className="w-11 select-none text-right pr-2 text-muted-foreground/45 border-r border-border/10 bg-muted/10 py-1 text-xs">
                  {line.oldLineNumber ?? ""}
                </div>
                {/* New line no. */}
                <div className="w-11 select-none text-right pr-2.5 text-muted-foreground/45 border-r border-border/20 bg-muted/15 py-1 text-xs">
                  {line.newLineNumber ?? ""}
                </div>
              </>
            )}
            
            {/* Diff Indicator +/- */}
            <div className={`w-7 select-none flex items-center justify-center font-semibold border-r border-border/20 text-xs py-1 ${getPrefixColorClass(line.type)}`}>
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : "\u00A0"}
            </div>

            {/* Code Line */}
            <div className={`flex-1 px-3.5 py-1 ${lineWrapClass}`}>
              {renderLineContent(line.text, line.type, line.subChanges)}
            </div>
          </div>
        ))}

        {unifiedLines.length === 0 && (
          <div className="py-12 text-center text-muted-foreground font-sans text-xs">
            No differences to display. Enter original and changed texts to compare.
          </div>
        )}
      </div>
    </div>
  )
}
