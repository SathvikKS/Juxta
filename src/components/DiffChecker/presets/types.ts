import type { AlignedLine, DiffEngineOptions, UnifiedLine } from "@/lib/diffEngine"
import type { PresetSettings, PresetType } from "../settingsEngine"

export type PresetOptionValue = boolean
export type PresetOptions = Record<string, PresetOptionValue>

export interface PresetOptionDefinition {
  key: string
  label: string
  description: string
  tooltip?: string
  type: "switch"
  defaultValue: boolean
}

export interface PresetDiffResult {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  similarity: number
  parseErrors?: {
    original: string | null
    changed: string | null
  } | null
}

export interface PresetRenderContext {
  original: string
  changed: string
  options: DiffEngineOptions
  presetOptions: PresetOptions
}

export type PresetDetector = (original: string, changed: string) => boolean

export interface PresetDefinition {
  id: PresetType
  label: string
  settings: PresetSettings
  options?: PresetOptionDefinition[]
  detect?: PresetDetector
  getDiffOptions?: (options: PresetOptions) => Partial<DiffEngineOptions>
  renderDiff?: (context: PresetRenderContext) => PresetDiffResult
  filterDiffResult?: (
    result: PresetDiffResult,
    options: PresetOptions
  ) => PresetDiffResult
}
