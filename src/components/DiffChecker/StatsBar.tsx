import { Check, Plus, Minus, Info, Pencil } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsBarProps {
  similarity: number
  modifiedCount: number
  addedCount: number
  removedCount: number
  totalLines: number
  keyValueSorted?: boolean
  isComputing?: boolean
  children?: React.ReactNode
}

export function StatsBar({
  similarity,
  modifiedCount,
  addedCount,
  removedCount,
  totalLines,
  keyValueSorted,
  isComputing,
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
          {isComputing ? (
            <Skeleton className="h-5 w-12 rounded-full" />
          ) : (
            <>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${simColorClass}`}
              >
                {similarity}%
              </span>
              {keyValueSorted && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold text-primary animate-fade-in">
                  Keys Sorted
                </span>
              )}
            </>
          )}
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Modifications */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-amber-500/10 p-0.5 text-amber-500 dark:bg-amber-500/20">
            <Pencil className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Modifications:</span>
          {isComputing ? (
            <Skeleton className="h-4 w-14" />
          ) : (
            <span className="font-semibold text-amber-500">
              {modifiedCount} {modifiedCount === 1 ? "line" : "lines"}
            </span>
          )}
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Insertions */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-green-500/10 p-0.5 text-green-500 dark:bg-green-500/20">
            <Plus className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Additions:</span>
          {isComputing ? (
            <Skeleton className="h-4 w-14" />
          ) : (
            <span className="font-semibold text-green-500">
              {addedCount} {addedCount === 1 ? "line" : "lines"}
            </span>
          )}
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Deletions */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-red-500/10 p-0.5 text-red-500 dark:bg-red-500/20">
            <Minus className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Deletions:</span>
          {isComputing ? (
            <Skeleton className="h-4 w-14" />
          ) : (
            <span className="font-semibold text-red-500">
              {removedCount} {removedCount === 1 ? "line" : "lines"}
            </span>
          )}
        </div>

        <div className="hidden h-4 w-px bg-border/80 sm:block" />

        {/* Total Lines */}
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-blue-500/10 p-0.5 text-blue-500 dark:bg-blue-500/20">
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="text-muted-foreground">Aligned Rows:</span>
          {isComputing ? (
            <Skeleton className="h-4 w-8" />
          ) : (
            <span className="font-semibold text-blue-500">{totalLines}</span>
          )}
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
