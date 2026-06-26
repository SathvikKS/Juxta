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
}

export interface PresetDefinition {
  id: PresetType
  label: string
  settings: PresetSettings
  options?: PresetOptionDefinition[]
  getDiffOptions?: (options: PresetOptions) => Partial<DiffEngineOptions>
  filterDiffResult?: (
    result: PresetDiffResult,
    options: PresetOptions
  ) => PresetDiffResult
}
