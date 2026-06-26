import {
  computeAlignedDiff,
  computeSimilarity,
  computeUnifiedDiff,
} from "@/lib/diffEngine"
import type { AlignedLine, UnifiedLine } from "@/lib/diffEngine"
import type { DiffSettings } from "./settingsEngine"

export interface DiffRenderRequest {
  original: string
  changed: string
  settings: DiffSettings
  ignoreEnvValueChanges: boolean
}

export interface DiffRenderResult {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  similarity: number
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
  return {
    ...request.settings,
    ignoreKeyValueValueChanges:
      request.settings.preset === "env" && request.ignoreEnvValueChanges,
  }
}

export function buildDiffRenderResult(
  request: DiffRenderRequest
): DiffRenderResult {
  const options = getDiffOptions(request)

  return {
    alignedLines: computeAlignedDiff(request.original, request.changed, options),
    unifiedLines: computeUnifiedDiff(request.original, request.changed, options),
    similarity: computeSimilarity(request.original, request.changed, options),
  }
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
    left.settings === right.settings &&
    left.ignoreEnvValueChanges === right.ignoreEnvValueChanges
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
