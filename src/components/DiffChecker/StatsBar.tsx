import { Check, Plus, Minus, Info } from "lucide-react"

interface StatsBarProps {
  similarity: number
  addedCount: number
  removedCount: number
  totalLines: number
}

export function StatsBar({
  similarity,
  addedCount,
  removedCount,
  totalLines,
}: StatsBarProps) {
  // Similarity badge color
  let simColorClass = "bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20"
  if (similarity >= 80) {
    simColorClass = "bg-green-500/10 text-green-500 border-green-500/20 dark:bg-green-500/20"
  } else if (similarity >= 40) {
    simColorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20"
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-2.5 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-medium">
      {/* Similarity */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-1">
          <Info className="h-3.5 w-3.5" /> Similarity:
        </span>
        <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${simColorClass}`}>
          {similarity}%
        </span>
      </div>

      <div className="h-4 w-px bg-border/80 hidden sm:block" />

      {/* Insertions */}
      <div className="flex items-center gap-1.5">
        <span className="p-0.5 bg-green-500/10 text-green-500 rounded-sm dark:bg-green-500/20">
          <Plus className="h-3 w-3 stroke-[3]" />
        </span>
        <span className="text-muted-foreground">Additions:</span>
        <span className="text-green-500 font-semibold">{addedCount} {addedCount === 1 ? "line" : "lines"}</span>
      </div>

      <div className="h-4 w-px bg-border/80 hidden sm:block" />

      {/* Deletions */}
      <div className="flex items-center gap-1.5">
        <span className="p-0.5 bg-red-500/10 text-red-500 rounded-sm dark:bg-red-500/20">
          <Minus className="h-3 w-3 stroke-[3]" />
        </span>
        <span className="text-muted-foreground">Deletions:</span>
        <span className="text-red-500 font-semibold">{removedCount} {removedCount === 1 ? "line" : "lines"}</span>
      </div>

      <div className="h-4 w-px bg-border/80 hidden sm:block" />

      {/* Total Lines */}
      <div className="flex items-center gap-1.5">
        <span className="p-0.5 bg-blue-500/10 text-blue-500 rounded-sm dark:bg-blue-500/20">
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
        <span className="text-muted-foreground">Aligned Rows:</span>
        <span className="text-blue-500 font-semibold">{totalLines}</span>
      </div>
    </div>
  )
}
