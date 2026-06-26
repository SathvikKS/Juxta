import assert from "node:assert/strict"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const sourcePath = resolve("src/components/DiffChecker/settingsEngine.ts")
const outDir = join(tmpdir(), "juxta-settings-engine-test")
const outPath = join(outDir, "settingsEngine.mjs")

mkdirSync(outDir, { recursive: true })

const transpiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2023,
    verbatimModuleSyntax: true,
  },
})

writeFileSync(outPath, transpiled.outputText)

const {
  DEFAULT_SETTINGS,
  PRESETS,
  applyPreset,
  hydrateSettings,
  removePreset,
  settingsReducer,
  updateSetting,
} = await import(pathToFileURL(outPath).href)

function withoutPresetState(settings) {
  const copy = { ...settings }
  delete copy.presetState
  return copy
}

function deltaKeys(settings) {
  return Object.keys(settings.presetState?.previousValues ?? {}).sort()
}

test("applying a preset records only settings that changed", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")

  assert.equal(applied.preset, "env")
  assert.deepEqual(deltaKeys(applied), [
    "ignoreComments",
    "ignoreEmptyLines",
    "sortKeyValuePairs",
    "trimWhitespace",
    "whitespaceSensitive",
  ])
  assert.equal(applied.lineEndingSensitive, false)
})

test("removing a preset restores recorded deltas", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const removed = removePreset(applied)

  assert.deepEqual(withoutPresetState(removed), DEFAULT_SETTINGS)
})

test("settings that already matched the preset survive removal", () => {
  const custom = {
    ...DEFAULT_SETTINGS,
    ignoreComments: true,
    showLineNumbers: false,
  }

  const applied = applyPreset(custom, "env")
  const removed = removePreset(applied)

  assert.equal(removed.ignoreComments, true)
  assert.equal(removed.showLineNumbers, false)
  assert.equal(removed.sortKeyValuePairs, false)
})

test("unrelated manual setting changes keep the preset active", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const updated = updateSetting(applied, "showLineNumbers", false)
  const removed = removePreset(updated)

  assert.equal(updated.preset, "env")
  assert.equal(updated.showLineNumbers, false)
  assert.deepEqual(updated.presetState, applied.presetState)
  assert.equal(removed.showLineNumbers, false)
  assert.equal(removed.sortKeyValuePairs, false)
})

test("manual changes to preset-controlled settings exit preset mode", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const updated = updateSetting(applied, "ignoreComments", false)

  assert.equal(updated.preset, "none")
  assert.equal(updated.presetState, undefined)
  assert.equal(updated.ignoreComments, false)
  assert.equal(updated.sortKeyValuePairs, true)
})

test("legacy saved presets hydrate as custom settings", () => {
  const legacy = JSON.stringify({
    ...DEFAULT_SETTINGS,
    ...PRESETS.env.settings,
    preset: "env",
  })

  const hydrated = hydrateSettings(legacy)

  assert.equal(hydrated.preset, "none")
  assert.equal(hydrated.sortKeyValuePairs, true)
  assert.equal(hydrated.ignoreComments, true)
})

test("saved presets with delta metadata hydrate as active presets", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const hydrated = hydrateSettings(JSON.stringify(applied))

  assert.equal(hydrated.preset, "env")
  assert.deepEqual(hydrated.presetState, applied.presetState)
})

test("sequential reducer actions do not corrupt preset deltas", () => {
  let state = settingsReducer(DEFAULT_SETTINGS, {
    type: "applyPreset",
    presetId: "env",
  })
  state = settingsReducer(state, { type: "applyPreset", presetId: "env" })
  state = settingsReducer(state, { type: "applyPreset", presetId: "none" })

  assert.deepEqual(withoutPresetState(state), DEFAULT_SETTINGS)
})
