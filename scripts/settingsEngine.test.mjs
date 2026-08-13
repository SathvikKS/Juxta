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
const jsonPresetOutPath = join(presetsOutDir, "json.mjs")
const diffEngineOutPath = join(libOutDir, "diffEngine.mjs")
const jsonDiffOutPath = join(libOutDir, "jsonDiff.mjs")
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
writeTranspiled("src/lib/jsonDiff.ts", jsonDiffOutPath, [
  ['from "diff"', `from "${diffPackageUrl}"`],
  ['from "./diffEngine"', 'from "./diffEngine.mjs"'],
])
writeTranspiled("src/components/DiffChecker/presets/env.ts", join(presetsOutDir, "env.mjs"))
writeTranspiled("src/components/DiffChecker/presets/json.ts", jsonPresetOutPath, [
  ['from "@/lib/jsonDiff"', 'from "../../../lib/jsonDiff.mjs"'],
])
writeTranspiled("src/components/DiffChecker/presets/index.ts", presetOutPath, [
  ['from "./env"', 'from "./env.mjs"'],
  ['from "./json"', 'from "./json.mjs"'],
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
  getActivePresetDefinition,
  getActivePresetOptions,
  hydrateSettings,
  removePreset,
  settingsReducer,
  updateSetting,
  updatePresetOption,
} = await import(pathToFileURL(outPath).href)
const { PRESETS } = await import(pathToFileURL(presetOutPath).href)
const { computeSimilarity } = await import(pathToFileURL(diffEngineOutPath).href)
const { computeJsonStructuralDiff, parseJsonDocument, traverseJson } =
  await import(pathToFileURL(jsonDiffOutPath).href)
const { buildDiffRenderResult, computeDiffStats } =
  await import(pathToFileURL(diffRenderOutPath).href)

function withoutPresetState(settings) {
  const copy = { ...settings }
  delete copy.presetState
  return copy
}

function deltaKeys(settings) {
  return Object.keys(settings.presetState?.previousValues ?? {}).sort()
}

function jsonSettings(options = {}) {
  let settings = applyPreset(DEFAULT_SETTINGS, "json")
  for (const [key, value] of Object.entries(options)) {
    settings = updatePresetOption(settings, key, value)
  }
  return settings
}

function jsonResult(original, changed, options = {}) {
  return buildDiffRenderResult({
    original,
    changed,
    settings: jsonSettings(options),
  })
}

function allLines(result) {
  return [...result.alignedLines, ...result.unifiedLines]
}

function lineTexts(result) {
  return allLines(result).flatMap((line) =>
    "text" in line ? [line.text] : [line.left.text, line.right.text]
  )
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

test("manual changes to preset-controlled settings transition to custom preset state and can be unapplied", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "env")
  const updated = updateSetting(applied, "ignoreComments", false)

  assert.equal(updated.preset, "custom")
  assert.notEqual(updated.presetState, undefined)
  assert.equal(updated.ignoreComments, false)
  assert.equal(updated.sortKeyValuePairs, true)

  const cleared = removePreset(updated)
  assert.equal(cleared.preset, "none")
  assert.equal(cleared.presetState, undefined)
  assert.equal(cleared.ignoreComments, false)
  assert.equal(cleared.sortKeyValuePairs, false)
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

test("generic similarity reserves 100 for processed equality", () => {
  const longPrefix = "a".repeat(1000)
  const nearEqual = computeSimilarity(
    `${longPrefix}x`,
    `${longPrefix}y`,
    DEFAULT_SETTINGS
  )
  const normalizedEqual = computeSimilarity(
    "Hello world",
    "hello world",
    { ...DEFAULT_SETTINGS, caseSensitive: false }
  )

  assert.equal(nearEqual, 99)
  assert.equal(normalizedEqual, 100)
})

test("aligned statistics separate modifications from net additions and deletions", () => {
  const result = buildDiffRenderResult({
    original: "same\nold one\nold two\ndeleted",
    changed: "same\nnew one\nadded",
    settings: DEFAULT_SETTINGS,
  })

  assert.deepEqual(computeDiffStats(result.alignedLines), {
    modifiedCount: 2,
    addedCount: 0,
    removedCount: 1,
    totalRows: 4,
  })
  assert.deepEqual(
    result.unifiedLines.reduce(
      (counts, line) => {
        counts[line.type]++
        return counts
      },
      { normal: 0, added: 0, removed: 0 }
    ),
    { normal: 1, added: 2, removed: 3 }
  )
})

test("env statistics classify keyed value edits separately", () => {
  const settings = applyPreset(DEFAULT_SETTINGS, "env")
  const result = buildDiffRenderResult({
    original: "A=1\nB=2\nREMOVED=1",
    changed: "A=9\nB=2\nADDED=1",
    settings,
  })

  assert.deepEqual(computeDiffStats(result.alignedLines), {
    modifiedCount: 1,
    addedCount: 1,
    removedCount: 1,
    totalRows: 4,
  })
})

test("env ignoreValues similarity stays below 100 for structural changes", () => {
  const settings = updatePresetOption(
    applyPreset(DEFAULT_SETTINGS, "env"),
    "ignoreValues",
    true
  )
  const keys = Array.from({ length: 200 }, (_, index) => `KEY_${index}=${index}`)
  const result = buildDiffRenderResult({
    original: keys.join("\n"),
    changed: [...keys, "ADDED=1"].join("\n"),
    settings,
  })

  assert.equal(result.similarity, 99)
  assert.equal(computeDiffStats(result.alignedLines).addedCount, 1)
})

test("the harness loads the canonical JSON preset and core renderer", () => {
  const settings = jsonSettings()
  const definition = getActivePresetDefinition(settings)
  const original = '{"user":{"name":"Ada"}}'
  const changed = '{ "user": { "name": "Ada" } }'

  assert.equal(definition, PRESETS.json)
  assert.equal(typeof definition?.renderDiff, "function")
  assert.deepEqual(
    jsonResult(original, changed),
    computeJsonStructuralDiff(original, changed, settings, false)
  )
})

test("deep JSON traversal exposes readable paths and typed identities", () => {
  const records = traverseJson({
    "dotted.key": 0,
    user: { profile: { name: "Ada" } },
    tags: ["one", { enabled: true }],
  })
  const byPath = new Map(records.map((record) => [record.displayPath, record]))

  assert.equal(byPath.get("$")?.kind, "object")
  assert.equal(byPath.get('["dotted.key"]')?.text, '["dotted.key"]: 0')
  assert.equal(byPath.get("user.profile.name")?.text, 'user.profile.name: "Ada"')
  assert.equal(byPath.get("tags[0]")?.text, 'tags[0]: "one"')
  assert.equal(byPath.get("tags[1].enabled")?.text, "tags[1].enabled: true")
  assert.equal(
    byPath.get('["dotted.key"]')?.identity,
    JSON.stringify([{ type: "property", key: "dotted.key" }])
  )
  assert.equal(
    byPath.get("tags[0]")?.identity,
    JSON.stringify([{ type: "property", key: "tags" }, { type: "index", index: 0 }])
  )
})

test("dotted keys do not collide with nested paths", () => {
  const result = jsonResult('{"a.b":1}', '{"a":{"b":2}}')
  const normalTexts = result.unifiedLines
    .filter((line) => line.type === "normal")
    .map((line) => line.text)

  assert.deepEqual(normalTexts, ["$: {}"])
  assert.equal(result.similarity < 100, true)
  assert.equal(lineTexts(result).includes('["a.b"]: 1'), true)
  assert.equal(lineTexts(result).includes("a.b: 2"), true)
})

test("numeric object keys do not collide with array indexes", () => {
  const result = jsonResult('{"0":"x"}', '["x"]')
  const texts = lineTexts(result)

  assert.equal(result.similarity < 100, true)
  assert.equal(texts.includes('["0"]: "x"'), true)
  assert.equal(texts.includes('[0]: "x"'), true)
  assert.equal(result.unifiedLines.some((line) => line.type === "normal"), false)
})

test("scalar type identity and escaped newlines are preserved", () => {
  const original = JSON.stringify({ count: 1, message: "line\nnext" })
  const changed = JSON.stringify({ count: "1", message: "line\nnext" })
  const result = jsonResult(original, changed)
  const originalMessage = result.alignedLines.find(
    (row) => row.left.text === 'message: "line\\nnext"'
  )
  const countRow = result.alignedLines.find(
    (row) => row.left.text === "count: 1" || row.right.text === 'count: "1"'
  )

  assert.equal(originalMessage?.left.text, 'message: "line\\nnext"')
  assert.equal(originalMessage?.right.text, 'message: "line\\nnext"')
  assert.equal(countRow?.left.type, "removed")
  assert.equal(countRow?.right.type, "added")
  assert.equal(result.similarity < 100, true)
})

test("pretty and minified JSON compare equally", () => {
  const value = { z: [1, 2], a: { enabled: true } }
  const result = jsonResult(JSON.stringify(value, null, 2), JSON.stringify(value))

  assert.equal(result.similarity, 100)
  assert.equal(result.alignedLines.every((row) => row.left.type === "normal"), true)
  assert.equal(result.alignedLines.every((row) => row.right.type === "normal"), true)
  assert.equal(result.unifiedLines.every((line) => line.type === "normal"), true)
})

test("object key order is ignored while array order is significant", () => {
  const objectResult = jsonResult(
    '{"first":1,"second":{"a":true,"b":false}}',
    '{"second":{"b":false,"a":true},"first":1}'
  )
  const arrayResult = jsonResult(
    '{"items":["first","second"]}',
    '{"items":["second","first"]}'
  )

  assert.equal(objectResult.similarity, 100)
  assert.equal(objectResult.unifiedLines.every((line) => line.type === "normal"), true)
  assert.equal(arrayResult.similarity < 100, true)
  assert.equal(
    arrayResult.unifiedLines.some(
      (line) => line.type !== "normal" && line.text === 'items[0]: "first"'
    ),
    true
  )
  assert.equal(
    arrayResult.unifiedLines.some(
      (line) => line.type !== "normal" && line.text === 'items[1]: "second"'
    ),
    true
  )
})

test("empty object, array, missing property, and null remain distinct", () => {
  const cases = [
    ['{"value":{}}', '{"value":[]}'],
    ['{"value":{}}', '{}'],
    ['{"value":[]}', '{}'],
    ['{"value":null}', '{}'],
    ['{"value":null}', '{"value":{}}'],
  ]

  for (const [original, changed] of cases) {
    const result = jsonResult(original, changed)
    assert.equal(result.similarity < 100, true, `${original} vs ${changed}`)
    assert.equal(
      result.unifiedLines.some((line) => line.type !== "normal"),
      true,
      `${original} vs ${changed}`
    )
  }
})

test("explicit primitive JSON roots are compared without a text fallback", () => {
  assert.equal(jsonResult("42", "42").similarity, 100)

  const result = jsonResult("42", '"42"')
  assert.equal(result.similarity, 0)
  assert.equal(result.unifiedLines.some((line) => line.text === "$: 42" && line.type === "removed"), true)
  assert.equal(result.unifiedLines.some((line) => line.text === '$: "42"' && line.type === "added"), true)
})

test("invalid JSON reports side-specific errors and emits no raw diff", () => {
  const originalInvalid = jsonResult('{"value":', '{"value":1}')
  const changedInvalid = jsonResult('{"value":1}', '{"value":')

  assert.equal(typeof originalInvalid.parseErrors?.original, "string")
  assert.equal(originalInvalid.parseErrors?.changed, null)
  assert.deepEqual(originalInvalid.alignedLines, [])
  assert.deepEqual(originalInvalid.unifiedLines, [])
  assert.equal(lineTexts(originalInvalid).length, 0)

  assert.equal(changedInvalid.parseErrors?.original, null)
  assert.equal(typeof changedInvalid.parseErrors?.changed, "string")
  assert.deepEqual(changedInvalid.alignedLines, [])
  assert.deepEqual(changedInvalid.unifiedLines, [])
})

test("ignoreValues ignores scalar leaves only and preserves structure", () => {
  const leafOnly = jsonResult(
    '{"config":{"port":1},"enabled":true}',
    '{"config":{"port":2},"enabled":false}',
    { ignoreValues: true }
  )
  const structureChange = jsonResult(
    '{"config":{"port":1}}',
    '{"config":[]}',
    { ignoreValues: true }
  )

  assert.equal(leafOnly.similarity, 100)
  assert.equal(leafOnly.unifiedLines.every((line) => line.type === "normal"), true)
  assert.equal(structureChange.similarity < 100, true)
  assert.equal(
    structureChange.unifiedLines.some(
      (line) => line.type !== "normal" && line.text === "config: {}"
    ),
    true
  )
  assert.equal(
    structureChange.unifiedLines.some(
      (line) => line.type !== "normal" && line.text === "config: []"
    ),
    true
  )
})

test("JSON similarity and statistics preserve structural differences", () => {
  const shared = Object.fromEntries(
    Array.from({ length: 220 }, (_, index) => [`key_${index}`, index])
  )
  const result = jsonResult(
    JSON.stringify({ ...shared, changed: 1, removed: true }),
    JSON.stringify({ ...shared, changed: 2, added: true }),
    { ignoreValues: true }
  )

  assert.equal(result.similarity, 99)
  assert.deepEqual(computeDiffStats(result.alignedLines), {
    modifiedCount: 0,
    addedCount: 1,
    removedCount: 1,
    totalRows: 224,
  })
})

test("JSON value edits count as modifications", () => {
  const result = jsonResult(
    '{"same":1,"changed":true,"removed":null}',
    '{"same":1,"changed":false,"added":null}'
  )

  assert.deepEqual(computeDiffStats(result.alignedLines), {
    modifiedCount: 1,
    addedCount: 1,
    removedCount: 1,
    totalRows: 5,
  })
})

test("showDiffOnly hides matching JSON paths", () => {
  const result = jsonResult(
    '{"same":1,"changed":{"value":true}}',
    '{"same":1,"changed":{"value":false}}',
    { showDiffOnly: true }
  )

  assert.equal(result.alignedLines.every((row) => row.left.type !== "normal" || row.right.type !== "normal"), true)
  assert.equal(result.unifiedLines.every((line) => line.type !== "normal"), true)
  assert.equal(result.unifiedLines.some((line) => line.text === "changed.value: true"), true)
  assert.equal(result.unifiedLines.some((line) => line.text === "changed.value: false"), true)
})

test("JSON and env detectors are checked when callable", () => {
  const jsonDetector = PRESETS.json.detect
  assert.equal(typeof jsonDetector, "function")
  assert.equal(jsonDetector?.('{"value":1}', '{"value":2}'), true)
  assert.equal(jsonDetector?.('[1]', '[2]'), true)
  assert.equal(jsonDetector?.("not json", '{"value":2}'), false)
  assert.equal(jsonDetector?.("1", "2"), false)

  const envDetector = PRESETS.env.detect
  assert.equal(typeof envDetector, "function")
  assert.equal(envDetector("A=1", "A=2"), true)
  assert.equal(envDetector("A=1", "not env"), true)
  assert.equal(envDetector("not env", "A=1"), true)
  assert.equal(envDetector('{"A":1}', '{"A":2}'), false)
})

test("JSON preset apply, option updates, remove, and hydration round-trip", () => {
  const applied = applyPreset(DEFAULT_SETTINGS, "json")
  const updated = updatePresetOption(applied, "ignoreValues", true)
  const hydrated = hydrateSettings(JSON.stringify(updated))
  const removed = removePreset(hydrated)

  assert.equal(applied.preset, "json")
  assert.deepEqual(applied.presetState?.previousValues, {})
  assert.deepEqual(applied.presetState?.options, {
    ignoreValues: false,
    showDiffOnly: false,
  })
  assert.equal(updated.presetState?.options.ignoreValues, true)
  assert.equal(hydrated.preset, "json")
  assert.equal(hydrated.presetState?.options.ignoreValues, true)
  assert.deepEqual(withoutPresetState(removed), DEFAULT_SETTINGS)
})
