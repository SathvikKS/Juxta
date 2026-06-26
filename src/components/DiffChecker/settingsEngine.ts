import { PRESETS } from "./presetDefinitions"
import type { PresetDefinition } from "./presetDefinitions"

export type PresetType = "none" | "env"

type ActivePresetType = Exclude<PresetType, "none">

export interface ActivePresetState {
  id: ActivePresetType
  previousValues: Partial<DiffSettingData>
}

export interface DiffSettings {
  sortKeyValuePairs: boolean
  ignoreEmptyLines: boolean
  ignoreComments: boolean
  caseSensitive: boolean
  whitespaceSensitive: boolean
  trimLeadingWhitespace: boolean
  trimTrailingWhitespace: boolean
  lineEndingSensitive: boolean
  ignoreLastLineNewline: boolean
  inlineDiffMode: "char" | "word" | "none"
  autoCompare: number
  showLineNumbers: boolean
  wrapLines: boolean
  scrollLock: boolean
  disableSpellCheck: boolean
  preset: PresetType
  autoDetectPresets: boolean
  presetState?: ActivePresetState
}

export type DiffSettingData = Omit<DiffSettings, "preset" | "presetState">
export type PresetControlledSettingKey = keyof DiffSettingData
export type PresetSettings = Partial<DiffSettingData>

export const DEFAULT_SETTINGS: DiffSettings = {
  sortKeyValuePairs: false,
  ignoreEmptyLines: false,
  ignoreComments: false,
  caseSensitive: true,
  whitespaceSensitive: true,
  trimLeadingWhitespace: false,
  trimTrailingWhitespace: false,
  lineEndingSensitive: false,
  ignoreLastLineNewline: false,
  inlineDiffMode: "word",
  autoCompare: -1,
  showLineNumbers: true,
  wrapLines: true,
  scrollLock: true,
  disableSpellCheck: true,
  preset: "none",
  autoDetectPresets: true,
}

export type { PresetDefinition }

export type SettingsAction =
  | { type: "applyPreset"; presetId: PresetType }
  | {
      type: "updateSetting"
      key: keyof DiffSettings
      value: DiffSettings[keyof DiffSettings]
    }
  | { type: "reset" }

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS).filter(
  (key) => key !== "preset"
) as PresetControlledSettingKey[]

function writeSetting<K extends PresetControlledSettingKey>(
  settings: DiffSettings | Partial<DiffSettingData>,
  key: K,
  value: DiffSettingData[K]
) {
  settings[key] = value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPresetType(value: unknown): value is PresetType {
  return value === "none" || value === "env"
}

function isActivePresetType(value: unknown): value is ActivePresetType {
  return value === "env"
}

function isPresetControlledSettingKey(
  value: string
): value is PresetControlledSettingKey {
  return SETTING_KEYS.includes(value as PresetControlledSettingKey)
}

function isCompatibleSettingValue<K extends PresetControlledSettingKey>(
  key: K,
  value: unknown
): value is DiffSettingData[K] {
  if (key === "inlineDiffMode") {
    return value === "char" || value === "word" || value === "none"
  }

  return typeof value === typeof DEFAULT_SETTINGS[key]
}

function clearPreset(settings: DiffSettings): DiffSettings {
  const next: DiffSettings = {
    ...settings,
    preset: "none",
    presetState: undefined,
  }
  delete next.presetState
  return next
}

function presetControlsKey(
  settings: DiffSettings,
  key: keyof DiffSettings
): key is PresetControlledSettingKey {
  if (settings.preset === "none" || key === "preset" || key === "presetState") {
    return false
  }

  return Object.prototype.hasOwnProperty.call(
    PRESETS[settings.preset].settings,
    key
  )
}

function sanitizePresetState(
  value: unknown,
  presetId: PresetType
): ActivePresetState | undefined {
  if (
    !isActivePresetType(presetId) ||
    !isRecord(value) ||
    value.id !== presetId ||
    !isRecord(value.previousValues)
  ) {
    return undefined
  }

  const presetKeys = new Set(Object.keys(PRESETS[presetId].settings))
  const previousValues: Partial<DiffSettingData> = {}

  for (const [key, previousValue] of Object.entries(value.previousValues)) {
    if (
      presetKeys.has(key) &&
      isPresetControlledSettingKey(key) &&
      isCompatibleSettingValue(key, previousValue)
    ) {
      writeSetting(previousValues, key, previousValue)
    }
  }

  if (
    typeof value.previousValues.trimWhitespace === "boolean" &&
    !Object.prototype.hasOwnProperty.call(
      previousValues,
      "trimTrailingWhitespace"
    )
  ) {
    previousValues.trimTrailingWhitespace = value.previousValues.trimWhitespace
  }

  return {
    id: presetId,
    previousValues,
  }
}

export function resetSettings(): DiffSettings {
  return { ...DEFAULT_SETTINGS }
}

export function hydrateSettings(rawValue: string | null): DiffSettings {
  if (!rawValue) {
    return resetSettings()
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    return resetSettings()
  }

  if (!isRecord(parsed)) {
    return resetSettings()
  }

  const next = resetSettings()

  for (const key of SETTING_KEYS) {
    const value = parsed[key]
    if (isCompatibleSettingValue(key, value)) {
      writeSetting(next, key, value)
    }
  }

  if (typeof parsed.trimWhitespace === "boolean") {
    next.trimTrailingWhitespace = parsed.trimWhitespace
  }

  next.preset = isPresetType(parsed.preset) ? parsed.preset : "none"

  if (next.preset !== "none") {
    const presetState = sanitizePresetState(parsed.presetState, next.preset)
    if (presetState) {
      for (const [key, presetValue] of Object.entries(
        PRESETS[next.preset].settings
      ) as [PresetControlledSettingKey, DiffSettingData[PresetControlledSettingKey]][]) {
        if (
          !Object.prototype.hasOwnProperty.call(
            presetState.previousValues,
            key
          ) &&
          next[key] !== presetValue
        ) {
          writeSetting(presetState.previousValues, key, next[key])
        }
        writeSetting(next, key, presetValue)
      }
      next.presetState = presetState
    } else {
      next.preset = "none"
      delete next.presetState
    }
  } else {
    delete next.presetState
  }

  return next
}

export function removePreset(settings: DiffSettings): DiffSettings {
  if (settings.preset === "none") {
    return clearPreset(settings)
  }

  const presetState = settings.presetState
  if (!presetState || presetState.id !== settings.preset) {
    return clearPreset(settings)
  }

  const next = { ...settings }

  for (const key of Object.keys(
    presetState.previousValues
  ) as PresetControlledSettingKey[]) {
    const previousValue = presetState.previousValues[key]
    if (previousValue !== undefined) {
      writeSetting(next, key, previousValue)
    }
  }

  return clearPreset(next)
}

export function applyPreset(
  settings: DiffSettings,
  presetId: PresetType
): DiffSettings {
  if (presetId === "none") {
    return removePreset(settings)
  }

  const preset = PRESETS[presetId]
  const base = settings.preset === "none" ? clearPreset(settings) : removePreset(settings)
  const next = { ...base }
  const previousValues: Partial<DiffSettingData> = {}

  for (const key of Object.keys(preset.settings) as PresetControlledSettingKey[]) {
    const presetValue = preset.settings[key]
    if (presetValue !== undefined && base[key] !== presetValue) {
      writeSetting(previousValues, key, base[key])
      writeSetting(next, key, presetValue)
    }
  }

  return {
    ...next,
    preset: presetId,
    presetState: {
      id: presetId,
      previousValues,
    },
  }
}

export function updateSetting<K extends keyof DiffSettings>(
  settings: DiffSettings,
  key: K,
  value: DiffSettings[K]
): DiffSettings {
  if (key === "preset") {
    return applyPreset(settings, value as PresetType)
  }

  if (key === "presetState") {
    return settings
  }

  const didChange = settings[key] !== value
  const next = { ...settings }
  writeSetting(
    next,
    key as PresetControlledSettingKey,
    value as DiffSettingData[PresetControlledSettingKey]
  )

  if (didChange && presetControlsKey(settings, key)) {
    return clearPreset(next)
  }

  return next
}

export function settingsReducer(
  settings: DiffSettings,
  action: SettingsAction
): DiffSettings {
  switch (action.type) {
    case "applyPreset":
      return applyPreset(settings, action.presetId)
    case "updateSetting":
      return updateSetting(settings, action.key, action.value)
    case "reset":
      return resetSettings()
    default:
      return settings
  }
}
