import assert from "node:assert/strict"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"
import ts from "typescript"

const outDir = join(tmpdir(), "juxta-settings-engine-test")
const checkerOutDir = join(outDir, "src/components/DiffChecker")
const presetsOutDir = join(checkerOutDir, "presets")
const libOutDir = join(outDir, "src/lib")
const outPath = join(checkerOutDir, "settingsEngine.mjs")
const presetOutPath = join(presetsOutDir, "index.mjs")
const diffEngineOutPath = join(libOutDir, "diffEngine.mjs")
const diffRenderOutPath = join(checkerOutDir, "diffRenderEngine.mjs")
const diffPackageUrl = pathToFileURL(
  resolve("node_modules/diff/libesm/index.js")
).href

mkdirSync(presetsOutDir, { recursive: true })
mkdirSync(libOutDir, { recursive: true })

function transpileFile(sourcePath) {
  return ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2023,
      verbatimModuleSyntax: true,
    },
  }).outputText
}

function writeTranspiled(sourcePath, outputPath, replacements = []) {
  let output = transpileFile(resolve(sourcePath))
  for (const [from, to] of replacements) {
    output = output.replaceAll(from, to)
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, output)
}

writeTranspiled("src/lib/diffEngine.ts", diffEngineOutPath, [
  ['from "diff"', `from "${diffPackageUrl}"`],
])
writeTranspiled("src/components/DiffChecker/presets/env.ts", join(presetsOutDir, "env.mjs"))
writeTranspiled("src/components/DiffChecker/presets/index.ts", presetOutPath, [
  ['from "./env"', 'from "./env.mjs"'],
])
writeTranspiled("src/components/DiffChecker/settingsEngine.ts", outPath, [
  ['from "./presets"', 'from "./presets/index.mjs"'],
])
writeTranspiled("src/components/DiffChecker/diffRenderEngine.ts", diffRenderOutPath, [
  ['from "@/lib/diffEngine"', 'from "../../lib/diffEngine.mjs"'],
  ['from "./settingsEngine"', 'from "./settingsEngine.mjs"'],
])

const {
  DEFAULT_SETTINGS,
  applyPreset,
  getActivePresetOptions,
  hydrateSettings,
  removePreset,
  settingsReducer,
  updateSetting,
  updatePresetOption,
} = await import(pathToFileURL(outPath).href)
const { PRESETS } = await import(pathToFileURL(presetOutPath).href)
const { buildDiffRenderResult } = await import(pathToFileURL(diffRenderOutPath).href)

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
    "trimLeadingWhitespace",
    "trimTrailingWhitespace",
    "whitespaceSensitive",
  ])
  assert.equal(applied.lineEndingSensitive, false)
})

test("applying a preset initializes preset-only option defaults", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")

  assert.deepEqual(applied.presetState?.options, {
    ignoreValues: false,
    showDiffOnly: false,
  })
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

test("preset-only option changes stay in preset state", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const updated = updatePresetOption(applied, "showDiffOnly", true)
  const removed = removePreset(updated)

  assert.equal(updated.preset, "env")
  assert.equal(updated.presetState?.options.showDiffOnly, true)
  assert.equal(updated.presetState?.previousValues, applied.presetState?.previousValues)
  assert.equal(removed.preset, "none")
  assert.equal(removed.presetState, undefined)
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

test("legacy trimWhitespace hydrates as trailing trim only", () => {
  const hydrated = hydrateSettings(
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      trimWhitespace: true,
    })
  )

  assert.equal(hydrated.trimLeadingWhitespace, false)
  assert.equal(hydrated.trimTrailingWhitespace, true)
})

test("saved presets with delta metadata hydrate as active presets", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const hydrated = hydrateSettings(JSON.stringify(applied))

  assert.equal(hydrated.preset, "env")
  assert.deepEqual(hydrated.presetState, applied.presetState)
})

test("saved preset options hydrate with defaults and known overrides only", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const hydrated = hydrateSettings(
    JSON.stringify({
      ...applied,
      presetState: {
        ...applied.presetState,
        options: {
          ignoreValues: true,
          showDiffOnly: "yes",
          unknownOption: true,
        },
      },
    })
  )

  assert.deepEqual(hydrated.presetState?.options, {
    ignoreValues: true,
    showDiffOnly: false,
  })
})

test("legacy active env preset migrates split trim settings", () => {
  const legacyActivePreset = JSON.stringify({
    ...DEFAULT_SETTINGS,
    ...PRESETS.env.settings,
    trimLeadingWhitespace: undefined,
    trimTrailingWhitespace: undefined,
    trimWhitespace: true,
    preset: "env",
    presetState: {
      id: "env",
      previousValues: {
        trimWhitespace: false,
      },
    },
  })

  const hydrated = hydrateSettings(legacyActivePreset)
  const removed = removePreset(hydrated)

  assert.equal(hydrated.preset, "env")
  assert.equal(hydrated.trimLeadingWhitespace, true)
  assert.equal(hydrated.trimTrailingWhitespace, true)
  assert.equal(removed.trimLeadingWhitespace, false)
  assert.equal(removed.trimTrailingWhitespace, false)
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

test("env ignoreValues option is applied through preset runtime behavior", () => {
  const settings = settingsReducer(
    applyPreset(DEFAULT_SETTINGS, "env"),
    { type: "updatePresetOption", key: "ignoreValues", value: true }
  )
  const result = buildDiffRenderResult({
    original: "A=1\nB=2",
    changed: "A=9\nB=2",
    settings,
  })

  assert.equal(getActivePresetOptions(settings).ignoreValues, true)
  assert.equal(result.similarity, 100)
  assert.equal(result.unifiedLines.every((line) => line.type === "normal"), true)
})

test("env showDiffOnly option hides matching rendered rows", () => {
  const settings = settingsReducer(
    applyPreset(DEFAULT_SETTINGS, "env"),
    { type: "updatePresetOption", key: "showDiffOnly", value: true }
  )
  const result = buildDiffRenderResult({
    original: "A=1\nB=2\nC=3",
    changed: "A=1\nB=9\nC=3",
    settings,
  })

  assert.equal(result.alignedLines.length, 1)
  assert.deepEqual(
    result.unifiedLines.map((line) => line.type),
    ["removed", "added"]
  )
})

test("inactive preset-only options do not affect rendering", () => {
  const withEnvOption = settingsReducer(
    applyPreset(DEFAULT_SETTINGS, "env"),
    { type: "updatePresetOption", key: "ignoreValues", value: true }
  )
  const customSettings = removePreset(withEnvOption)
  const result = buildDiffRenderResult({
    original: "A=1",
    changed: "A=9",
    settings: customSettings,
  })

  assert.equal(customSettings.preset, "none")
  assert.equal(result.similarity < 100, true)
  assert.equal(result.unifiedLines.some((line) => line.type !== "normal"), true)
})
