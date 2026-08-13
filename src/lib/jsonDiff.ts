import { diffChars, diffWordsWithSpace } from "diff"
import type { Change } from "diff"
import type {
  AlignedLine,
  DiffEngineOptions,
  UnifiedLine,
} from "./diffEngine"

export type JsonPathSegment =
  | { type: "property"; key: string }
  | { type: "index"; index: number }

export interface JsonRecord {
  identity: string
  displayPath: string
  kind: "object" | "array" | "scalar"
  value: unknown
  text: string
}

export interface JsonDocument {
  records: JsonRecord[]
  error: string | null
}

export interface JsonStructuralDiff {
  alignedLines: AlignedLine[]
  unifiedLines: UnifiedLine[]
  similarity: number
  parseErrors: {
    original: string | null
    changed: string | null
  }
}

function jsonIsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function jsonSerializeScalar(value: unknown): string {
  const serialized = JSON.stringify(value)
  return serialized === undefined ? "undefined" : serialized
}

function jsonSerializeValue(value: unknown, kind: JsonRecord["kind"]): string {
  if (kind === "object") return "{}"
  if (kind === "array") return "[]"
  return jsonSerializeScalar(value)
}

function jsonDisplayPath(
  parent: string,
  segment: JsonPathSegment | null
): string {
  if (!segment) return "$"
  if (segment.type === "index") {
    return parent === "$" ? `[${segment.index}]` : `${parent}[${segment.index}]`
  }

  if (parent === "$") {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment.key)
      ? segment.key
      : `[${JSON.stringify(segment.key)}]`
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment.key)
    ? `${parent}.${segment.key}`
    : `${parent}[${JSON.stringify(segment.key)}]`
}

function jsonIdentity(path: JsonPathSegment[]): string {
  return JSON.stringify(path)
}

function jsonRecordKind(value: unknown): JsonRecord["kind"] {
  if (Array.isArray(value)) return "array"
  if (jsonIsObject(value)) return "object"
  return "scalar"
}

function appendJsonRecord(
  records: JsonRecord[],
  value: unknown,
  path: JsonPathSegment[],
  parentDisplayPath: string,
  segment: JsonPathSegment | null
) {
  const kind = jsonRecordKind(value)
  const displayPath = jsonDisplayPath(parentDisplayPath, segment)
  records.push({
    identity: jsonIdentity(path),
    displayPath,
    kind,
    value,
    text: `${displayPath}: ${jsonSerializeValue(value, kind)}`,
  })

  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      appendJsonRecord(
        records,
        child,
        [...path, { type: "index", index }],
        displayPath,
        { type: "index", index }
      )
    )
  } else if (jsonIsObject(value)) {
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .forEach((key) =>
        appendJsonRecord(
          records,
          value[key],
          [...path, { type: "property", key }],
          displayPath,
          { type: "property", key }
        )
      )
  }
}

export function traverseJson(value: unknown): JsonRecord[] {
  const records: JsonRecord[] = []
  appendJsonRecord(records, value, [], "$", null)
  return records
}

export function parseJsonDocument(text: string): JsonDocument {
  try {
    return { records: traverseJson(JSON.parse(text)), error: null }
  } catch (error) {
    return {
      records: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function jsonRecordsByIdentity(records: JsonRecord[]) {
  return new Map(records.map((record) => [record.identity, record]))
}

function jsonRecordsMatch(
  left: JsonRecord,
  right: JsonRecord,
  ignoreValues: boolean
) {
  if (left.kind !== right.kind) return false
  if (ignoreValues && left.kind === "scalar") return true
  return (
    jsonSerializeValue(left.value, left.kind) ===
    jsonSerializeValue(right.value, right.kind)
  )
}

function jsonInlineChanges(
  leftText: string,
  rightText: string,
  options: DiffEngineOptions
): { leftSubChanges?: Change[]; rightSubChanges?: Change[] } {
  if (options.inlineDiffMode === "none") return {}
  const changes =
    options.inlineDiffMode === "char"
      ? diffChars(leftText, rightText)
      : diffWordsWithSpace(leftText, rightText)
  return {
    leftSubChanges: changes.filter((change) => !change.added),
    rightSubChanges: changes.filter((change) => !change.removed),
  }
}

function jsonOrderedIdentities(left: JsonRecord[], right: JsonRecord[]) {
  const leftOrder = new Map(left.map((record, index) => [record.identity, index]))
  const rightOrder = new Map(right.map((record, index) => [record.identity, index]))
  return [...new Set([...left, ...right].map((record) => record.identity))].sort(
    (a, b) => {
      const aLeft = leftOrder.get(a) ?? Number.MAX_SAFE_INTEGER
      const bLeft = leftOrder.get(b) ?? Number.MAX_SAFE_INTEGER
      if (aLeft !== bLeft) return aLeft - bLeft
      return (
        (rightOrder.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (rightOrder.get(b) ?? Number.MAX_SAFE_INTEGER)
      )
    }
  )
}

export function computeJsonStructuralDiff(
  original: string,
  changed: string,
  options: DiffEngineOptions,
  ignoreValues = false
): JsonStructuralDiff {
  const leftDocument = parseJsonDocument(original)
  const rightDocument = parseJsonDocument(changed)
  const parseErrors = {
    original: leftDocument.error,
    changed: rightDocument.error,
  }

  if (leftDocument.error || rightDocument.error) {
    return { alignedLines: [], unifiedLines: [], similarity: 0, parseErrors }
  }

  const leftByIdentity = jsonRecordsByIdentity(leftDocument.records)
  const rightByIdentity = jsonRecordsByIdentity(rightDocument.records)
  const identities = jsonOrderedIdentities(leftDocument.records, rightDocument.records)
  const alignedLines: AlignedLine[] = []
  const unifiedLines: UnifiedLine[] = []
  let oldLineNumber = 1
  let newLineNumber = 1
  let matchingRecords = 0

  identities.forEach((identity) => {
    const left = leftByIdentity.get(identity) ?? null
    const right = rightByIdentity.get(identity) ?? null
    const same = Boolean(left && right && jsonRecordsMatch(left, right, ignoreValues))
    if (same) matchingRecords++

    const leftNumber = left ? oldLineNumber++ : null
    const rightNumber = right ? newLineNumber++ : null
    const leftChanges = left && right && !same
      ? jsonInlineChanges(left.text, right.text, options).leftSubChanges
      : undefined
    const rightChanges = left && right && !same
      ? jsonInlineChanges(left.text, right.text, options).rightSubChanges
      : undefined

    alignedLines.push({
      left: left
        ? {
            text: left.text,
            lineNumber: leftNumber,
            type: same ? "normal" : "removed",
            identity: left.identity,
            subChanges: leftChanges,
          }
        : { text: "", lineNumber: null, type: "empty" },
      right: right
        ? {
            text: right.text,
            lineNumber: rightNumber,
            type: same ? "normal" : "added",
            identity: right.identity,
            subChanges: rightChanges,
          }
        : { text: "", lineNumber: null, type: "empty" },
    })

    if (same && left && right) {
      unifiedLines.push({
        text: left.text,
        oldLineNumber: leftNumber,
        newLineNumber: rightNumber,
        type: "normal",
        identity,
      })
    } else {
      if (left) {
        unifiedLines.push({
          text: left.text,
          oldLineNumber: leftNumber,
          newLineNumber: null,
          type: "removed",
          identity,
          subChanges: leftChanges,
        })
      }
      if (right) {
        unifiedLines.push({
          text: right.text,
          oldLineNumber: null,
          newLineNumber: rightNumber,
          type: "added",
          identity,
          subChanges: rightChanges,
        })
      }
    }
  })

  return {
    alignedLines,
    unifiedLines,
    similarity:
      identities.length === 0
        ? 100
        : Math.round((matchingRecords / identities.length) * 100),
    parseErrors,
  }
}

