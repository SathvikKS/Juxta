import { envPreset } from "./env"
import type { PresetDefinition } from "./types"
import type { PresetType } from "../settingsEngine"

export const PRESETS: Record<PresetType, PresetDefinition> = {
  none: {
    id: "none",
    label: "None",
    settings: {},
  },
  env: envPreset,
}

export type {
  PresetDefinition,
  PresetDiffResult,
  PresetOptionDefinition,
  PresetOptions,
  PresetOptionValue,
} from "./types"
