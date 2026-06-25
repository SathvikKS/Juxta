import { Check, Plus, Minus, Info } from "lucide-react"

interface StatsBarProps {
  similarity: number
  addedCount: number
  removedCount: number
  totalLines: number
  children?: React.ReactNode
}

export function StatsBar({
  similarity,
  addedCount,
  removedCount,
  totalLines,
  children,
}: StatsBarProps) {
  // Similarity badge color
  let simColorClass =
    "bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20"
  if (similarity >= 80) {
    simColorClass =
      "bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-500/20"
  } else if (similarity >= 40) {
    simColorClass =
      "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20"
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-xs font-medium">
      <div className="flex flex-wrap items-center gap-4">
        {/* Similarity */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Similarity:
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${simColorClass}`}
          >
            {similarity}%
          </span>
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Insertions */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-green-500/10 p-0.5 text-green-500 dark:bg-green-500/20">
            <Plus className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Additions:</span>
          <span className="font-semibold text-green-500">
            {addedCount} {addedCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Deletions */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-red-500/10 p-0.5 text-red-500 dark:bg-red-500/20">
            <Minus className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Deletions:</span>
          <span className="font-semibold text-red-500">
            {removedCount} {removedCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Total Lines */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-blue-500/10 p-0.5 text-blue-500 dark:bg-blue-500/20">
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Aligned Rows:</span>
          <span className="font-semibold text-blue-500">{totalLines}</span>
        </div>
      </div>
      {children && (
        <div className="flex items-center justify-start sm:justify-end shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
