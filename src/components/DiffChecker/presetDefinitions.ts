import type { PresetSettings, PresetType } from "./settingsEngine"

export interface PresetDefinition {
  id: PresetType
  label: string
  settings: PresetSettings
}

export const PRESETS: Record<PresetType, PresetDefinition> = {
  none: {
    id: "none",
    label: "None (Custom)",
    settings: {},
  },
  env: {
    id: "env",
    label: ".env",
    settings: {
      sortKeyValuePairs: true,
      ignoreEmptyLines: true,
      ignoreComments: true,
      whitespaceSensitive: false,
      trimLeadingWhitespace: true,
      trimTrailingWhitespace: true,
      lineEndingSensitive: false,
    },
  },
}
