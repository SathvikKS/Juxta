import { envPreset } from "./env"
import { jsonPreset } from "./json"
import type { PresetDefinition } from "./types"
import type { PresetType } from "../settingsEngine"

export const PRESETS: Record<PresetType, PresetDefinition> = {
  none: {
    id: "none",
    label: "None",
    settings: {},
  },
  custom: {
    id: "custom",
    label: "Custom",
    settings: {},
  },
  env: envPreset,
  json: jsonPreset,
}

export type {
  PresetDefinition,
  PresetDiffResult,
  PresetOptionDefinition,
  PresetOptions,
  PresetOptionValue,
  PresetRenderContext,
  PresetDetector,
} from "./types"
