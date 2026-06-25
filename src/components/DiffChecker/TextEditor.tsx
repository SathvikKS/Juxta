import React from "react"

interface TextEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  showLineNumbers: boolean
  wrapLines: boolean
}

export function TextEditor({
  value,
  onChange,
  placeholder,
  showLineNumbers,
  wrapLines,
}: TextEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const gutterRef = React.useRef<HTMLDivElement>(null)
  const [clientWidth, setClientWidth] = React.useState<number>(0)

  const lines = value.replace(/\r/g, "").split("\n")

  // Synchronize vertical scroll from textarea to gutter
  const handleScroll = React.useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  // Monitor textarea size changes (window resize, side panel toggles, etc.)
  // to ensure the gutter's wrapping width mirrors the textarea perfectly.
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const observer = new ResizeObserver(() => {
      setClientWidth(textarea.clientWidth)
    })
    observer.observe(textarea)

    // Sync scroll initially
    handleScroll()

    return () => {
      observer.disconnect()
    }
  }, [handleScroll])

  // Sync scroll on value change or settings change
  React.useEffect(() => {
    handleScroll()
  }, [value, showLineNumbers, wrapLines, handleScroll])

  return (
    <div className="relative flex min-h-0 flex-1 w-full overflow-hidden bg-background/50">
      {showLineNumbers && (
        <div
          ref={gutterRef}
          className="absolute left-0 top-0 bottom-0 select-none pointer-events-none overflow-hidden z-10"
          style={{ width: clientWidth || "100%" }}
        >
          <div className="flex flex-col pt-4 pb-4">
            {lines.map((line, i) => (
              <div
                key={i}
                className="relative flex w-full font-mono text-sm pl-[56px] pr-4"
                style={{ lineHeight: "22px" }}
              >
                {/* Opaque Gutter background & Line Number */}
                <div className="absolute left-0 top-0 bottom-0 w-11 border-r border-border/20 bg-card select-none">
                  <div className="absolute inset-0 bg-muted/10 flex items-stretch">
                    <div className="w-full pr-2.5 text-right text-xs text-muted-foreground/45 select-none pt-[3px] font-mono">
                      {i + 1}
                    </div>
                  </div>
                </div>

                {/* Invisible text that mirrors wrapping */}
                <div
                  className={`invisible w-full select-none ${
                    wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                  }`}
                >
                  {line || " "}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        onScroll={handleScroll}
        wrap={wrapLines ? "soft" : "off"}
        className={`min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent pt-4 pb-4 pr-4 font-mono text-sm focus-visible:ring-0 focus-visible:outline-none ${
          showLineNumbers ? "pl-[56px]" : "pl-4"
        } ${
          wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
        }`}
        style={{ lineHeight: "22px" }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
