import {
  computeAlignedDiff,
  computeSimilarity,
  computeUnifiedDiff,
} from "@/lib/diffEngine"
import type { AlignedLine, UnifiedLine } from "@/lib/diffEngine"
import {
  getActivePresetDefinition,
  getActivePresetOptions,
} from "./settingsEngine"
import type { DiffSettings } from "./settingsEngine"

export interface DiffRenderRequest {
  original: string
  changed: string
  settings: DiffSettings
}

export interface DiffRenderResult {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  similarity: number
  parseErrors?: {
    original: string | null
    changed: string | null
  } | null
}

export interface DiffStats {
  modifiedCount: number
  addedCount: number
  removedCount: number
  totalRows: number
}

export function computeDiffStats(alignedLines: AlignedLine[]): DiffStats {
  return alignedLines.reduce<DiffStats>(
    (stats, row) => {
      if (row.left.type === "removed" && row.right.type === "added") {
        stats.modifiedCount++
      } else if (row.left.type === "empty" && row.right.type === "added") {
        stats.addedCount++
      } else if (row.left.type === "removed" && row.right.type === "empty") {
        stats.removedCount++
      }

      stats.totalRows++
      return stats
    },
    { modifiedCount: 0, addedCount: 0, removedCount: 0, totalRows: 0 }
  )
}

export interface DiffRenderState {
  status: "ready" | "scheduled" | "computing"
  token: number
  request: DiffRenderRequest
  result: DiffRenderResult
}

export type DiffRenderAction =
  | { type: "schedule"; request: DiffRenderRequest; token: number }
  | { type: "start"; token: number }
  | { type: "complete"; token: number; result: DiffRenderResult }

function getDiffOptions(request: DiffRenderRequest) {
  const activePreset = getActivePresetDefinition(request.settings)
  const presetOptions = getActivePresetOptions(request.settings)

  return {
    ...request.settings,
    ...activePreset?.getDiffOptions?.(presetOptions),
  }
}

export function buildDiffRenderResult(
  request: DiffRenderRequest
): DiffRenderResult {
  const options = getDiffOptions(request)
  const activePreset = getActivePresetDefinition(request.settings)
  const presetOptions = getActivePresetOptions(request.settings)
  const result = activePreset?.renderDiff?.({
    original: request.original,
    changed: request.changed,
    options,
    presetOptions,
  }) ?? {
    alignedLines: computeAlignedDiff(request.original, request.changed, options),
    unifiedLines: computeUnifiedDiff(request.original, request.changed, options),
    similarity: computeSimilarity(request.original, request.changed, options),
    parseErrors: null,
  }

  return activePreset?.filterDiffResult?.(result, presetOptions) ?? result
}

export function createDiffRenderState(
  request: DiffRenderRequest
): DiffRenderState {
  return {
    status: "ready",
    token: 0,
    request,
    result: buildDiffRenderResult(request),
  }
}

export function isSameDiffRenderRequest(
  left: DiffRenderRequest,
  right: DiffRenderRequest
) {
  return (
    left.original === right.original &&
    left.changed === right.changed &&
    left.settings === right.settings
  )
}

export function isDiffRenderPending(
  state: DiffRenderState,
  request: DiffRenderRequest,
  hasPendingSourceChange: boolean
) {
  return (
    hasPendingSourceChange ||
    state.status !== "ready" ||
    !isSameDiffRenderRequest(state.request, request)
  )
}

export function diffRenderReducer(
  state: DiffRenderState,
  action: DiffRenderAction
): DiffRenderState {
  switch (action.type) {
    case "schedule":
      return {
        ...state,
        status: "scheduled",
        token: action.token,
        request: action.request,
      }
    case "start":
      if (action.token !== state.token) return state
      return {
        ...state,
        status: "computing",
      }
    case "complete":
      if (action.token !== state.token) return state
      return {
        ...state,
        status: "ready",
        result: action.result,
      }
    default:
      return state
  }
}
