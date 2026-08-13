import { diffLines, diffChars, diffWordsWithSpace } from "diff"
import type { Change } from "diff"

export interface DiffEngineOptions {
  caseSensitive: boolean
  whitespaceSensitive: boolean
  trimLeadingWhitespace: boolean
  trimTrailingWhitespace: boolean
  lineEndingSensitive: boolean
  ignoreLastLineNewline: boolean
  inlineDiffMode: "char" | "word" | "none"
  sortKeyValuePairs: boolean
  ignoreKeyValueValueChanges?: boolean
  ignoreEmptyLines: boolean
  ignoreComments: boolean
}

export interface AlignedLine {
  left: {
    text: string
    lineNumber: number | null
    type: "removed" | "normal" | "empty"
    subChanges?: Change[]
    identity?: string
  }
  right: {
    text: string
    lineNumber: number | null
    type: "added" | "normal" | "empty"
    subChanges?: Change[]
    identity?: string
  }
}

export interface UnifiedLine {
  text: string
  oldLineNumber: number | null
  newLineNumber: number | null
  type: "added" | "removed" | "normal"
  subChanges?: Change[]
  identity?: string
}

interface KeyValueLine {
  key: string
  displayKey: string
  text: string
  isKeyValue: boolean
}

interface KeyedLinePair {
  left: KeyValueLine | null
  right: KeyValueLine | null
}

const KEY_VALUE_PATTERN = /^([ \t]*)([A-Za-z0-9_.-]+)[ \t]*[=:][ \t]*(.*)$/

function normalizeKey(key: string, options: DiffEngineOptions): string {
  return options.caseSensitive ? key : key.toLowerCase()
}

function parseKeyValueLine(
  line: string,
  options: DiffEngineOptions
): KeyValueLine | null {
  const match = line.match(KEY_VALUE_PATTERN)
  if (!match) {
    return null
  }

  return {
    key: normalizeKey(match[2], options),
    displayKey: match[2],
    text: line,
    isKeyValue: true,
  }
}

function splitDiffLines(text: string): string[] {
  const lines = text.split("\n")
  if (lines[lines.length - 1] === "") {
    lines.pop()
  }
  return lines
}

function createInlineChanges(
  leftLine: string,
  rightLine: string,
  options: DiffEngineOptions
): { leftSubChanges?: Change[]; rightSubChanges?: Change[] } {
  if (options.inlineDiffMode === "none") {
    return {}
  }

  const subDiffOptions = { ignoreCase: !options.caseSensitive }
  const charDiff =
    options.inlineDiffMode === "char"
      ? diffChars(leftLine, rightLine, subDiffOptions)
      : diffWordsWithSpace(leftLine, rightLine, subDiffOptions)

  return {
    leftSubChanges: charDiff.filter((c) => !c.added),
    rightSubChanges: charDiff.filter((c) => !c.removed),
  }
}

function normalizeComparableLine(
  line: string,
  options: DiffEngineOptions
): string {
  let comparable = line

  if (!options.whitespaceSensitive) {
    comparable = comparable.replace(/\s+/g, "")
  }

  if (!options.caseSensitive) {
    comparable = comparable.toLowerCase()
  }

  return comparable
}

function linesMatch(
  leftLine: string,
  rightLine: string,
  options: DiffEngineOptions
): boolean {
  return (
    normalizeComparableLine(leftLine, options) ===
    normalizeComparableLine(rightLine, options)
  )
}

function keyedLinesMatch(
  left: KeyValueLine,
  right: KeyValueLine,
  options: DiffEngineOptions
): boolean {
  if (
    options.ignoreKeyValueValueChanges &&
    left.isKeyValue &&
    right.isKeyValue &&
    left.key === right.key
  ) {
    return true
  }

  return linesMatch(left.text, right.text, options)
}

function displayTextForMatchedKey(
  left: KeyValueLine,
  right: KeyValueLine,
  options: DiffEngineOptions
): string {
  if (
    options.ignoreKeyValueValueChanges &&
    left.isKeyValue &&
    right.isKeyValue &&
    left.key === right.key
  ) {
    return left.displayKey
  }

  return left.text
}

function stripKeyValueValues(text: string, options: DiffEngineOptions): string {
  return splitDiffLines(text)
    .map((line) => parseKeyValueLine(line, options)?.displayKey ?? line)
    .join("\n")
}

function buildKeyedLinePairs(
  original: string,
  changed: string,
  options: DiffEngineOptions
): KeyedLinePair[] {
  const leftLines = splitDiffLines(original)
  const rightLines = splitDiffLines(changed)
  const leftLinesByKey = new Map<string, KeyValueLine[]>()
  const rightLinesByKey = new Map<string, KeyValueLine[]>()
  const nonKeyPairs: KeyedLinePair[] = []

  const addKeyedLine = (
    map: Map<string, KeyValueLine[]>,
    item: KeyValueLine
  ) => {
    const existing = map.get(item.key) ?? []
    existing.push(item)
    map.set(item.key, existing)
  }

  leftLines.forEach((line) => {
    const parsed = parseKeyValueLine(line, options)
    if (parsed) {
      addKeyedLine(leftLinesByKey, parsed)
    } else {
      nonKeyPairs.push({
        left: { key: line, displayKey: line, text: line, isKeyValue: false },
        right: null,
      })
    }
  })

  rightLines.forEach((line) => {
    const parsed = parseKeyValueLine(line, options)
    if (parsed) {
      addKeyedLine(rightLinesByKey, parsed)
    } else {
      const matchingPair = nonKeyPairs.find(
        (pair) => pair.right === null && pair.left?.text === line
      )
      if (matchingPair) {
        matchingPair.right = {
          key: line,
          displayKey: line,
          text: line,
          isKeyValue: false,
        }
      } else {
        nonKeyPairs.push({
          left: null,
          right: { key: line, displayKey: line, text: line, isKeyValue: false },
        })
      }
    }
  })

  const keys = [...new Set([...leftLinesByKey.keys(), ...rightLinesByKey.keys()])]
  keys.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  )

  const keyedPairs = keys.flatMap((key) => {
    const leftItems = leftLinesByKey.get(key) ?? []
    const rightItems = rightLinesByKey.get(key) ?? []
    const maxItems = Math.max(leftItems.length, rightItems.length)
    const pairs: KeyedLinePair[] = []

    for (let i = 0; i < maxItems; i++) {
      pairs.push({
        left: leftItems[i] ?? null,
        right: rightItems[i] ?? null,
      })
    }

    return pairs
  })

  return [...nonKeyPairs, ...keyedPairs]
}

function computeKeyedAlignedDiff(
  original: string,
  changed: string,
  options: DiffEngineOptions
): AlignedLine[] {
  const aligned: AlignedLine[] = []
  let leftLineNum = 1
  let rightLineNum = 1

  buildKeyedLinePairs(original, changed, options).forEach(({ left, right }) => {
    if (left && right) {
      const isMatch = keyedLinesMatch(left, right, options)
      const { leftSubChanges, rightSubChanges } = isMatch
        ? {}
        : createInlineChanges(left.text, right.text, options)

      aligned.push({
        left: {
          text: left.text,
          lineNumber: leftLineNum++,
          type: isMatch ? "normal" : "removed",
          subChanges: leftSubChanges,
        },
        right: {
          text: right.text,
          lineNumber: rightLineNum++,
          type: isMatch ? "normal" : "added",
          subChanges: rightSubChanges,
        },
      })
      return
    }

    if (left) {
      aligned.push({
        left: {
          text: left.text,
          lineNumber: leftLineNum++,
          type: "removed",
        },
        right: {
          text: "",
          lineNumber: null,
          type: "empty",
        },
      })
      return
    }

    if (right) {
      aligned.push({
        left: {
          text: "",
          lineNumber: null,
          type: "empty",
        },
        right: {
          text: right.text,
          lineNumber: rightLineNum++,
          type: "added",
        },
      })
    }
  })

  return aligned
}

function computeKeyedUnifiedDiff(
  original: string,
  changed: string,
  options: DiffEngineOptions
): UnifiedLine[] {
  const unified: UnifiedLine[] = []
  let oldLineNum = 1
  let newLineNum = 1

  buildKeyedLinePairs(original, changed, options).forEach(({ left, right }) => {
    if (left && right) {
      if (keyedLinesMatch(left, right, options)) {
        unified.push({
          text: displayTextForMatchedKey(left, right, options),
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          type: "normal",
        })
        return
      }

      const { leftSubChanges, rightSubChanges } = createInlineChanges(
        left.text,
        right.text,
        options
      )

      unified.push({
        text: left.text,
        oldLineNumber: oldLineNum++,
        newLineNumber: null,
        type: "removed",
        subChanges: leftSubChanges,
      })
      unified.push({
        text: right.text,
        oldLineNumber: null,
        newLineNumber: newLineNum++,
        type: "added",
        subChanges: rightSubChanges,
      })
      return
    }

    if (left) {
      unified.push({
        text: left.text,
        oldLineNumber: oldLineNum++,
        newLineNumber: null,
        type: "removed",
      })
      return
    }

    if (right) {
      unified.push({
        text: right.text,
        oldLineNumber: null,
        newLineNumber: newLineNum++,
        type: "added",
      })
    }
  })

  return unified
}

/**
 * Sorts key-value blocks in text alphabetically by key, keeping comments grouped with their corresponding keys.
 */
export function sortKeyValuePairs(text: string): string {
  const lines = text.split(/\r?\n/)
  interface Block {
    key: string
    rawLines: string[]
  }
  const blocks: Block[] = []
  const headerLines: string[] = []
  let accumulatedLines: string[] = []
  let foundFirstKey = false

  for (const line of lines) {
    const trimmed = line.trim()
    const isCommentOrBlank =
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith(";")
    const match = line.match(/^[ \t]*([A-Za-z0-9_.-]+)[ \t]*[=:][ \t]*(.*)$/)

    if (match && !isCommentOrBlank) {
      const key = match[1]
      foundFirstKey = true
      blocks.push({
        key,
        rawLines: [...accumulatedLines, line],
      })
      accumulatedLines = []
    } else {
      if (isCommentOrBlank) {
        if (!foundFirstKey) {
          headerLines.push(line)
        } else {
          accumulatedLines.push(line)
        }
      } else {
        // Continuation line of the last block
        if (blocks.length > 0) {
          blocks[blocks.length - 1].rawLines.push(line)
        } else {
          if (!foundFirstKey) {
            headerLines.push(line)
          } else {
            accumulatedLines.push(line)
          }
        }
      }
    }
  }

  // Sort blocks by key alphabetically (case-insensitive, natural numeric order)
  blocks.sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { sensitivity: "base", numeric: true })
  )

  // Combine everything
  const resultLines: string[] = []

  // Output header lines first
  resultLines.push(...headerLines)

  // Output sorted key-value blocks
  for (const block of blocks) {
    resultLines.push(...block.rawLines)
  }

  // Output trailing lines
  resultLines.push(...accumulatedLines)

  return resultLines.join("\n")
}

/**
 * Normalizes text lines and pre-processes based on settings
 */
function preprocessText(text: string, options: DiffEngineOptions): string {
  let processed = text

  // Normalize line endings to LF unless line ending sensitive
  if (!options.lineEndingSensitive) {
    processed = processed.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  }

  // Strip full-line comments if enabled
  // Supports #, //, and ; as comment markers (only when the entire line is a comment)
  if (options.ignoreComments) {
    processed = processed
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim()
        return (
          !trimmed.startsWith("#") &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith(";")
        )
      })
      .join("\n")
  }

  // Ignore empty lines if enabled
  if (options.ignoreEmptyLines) {
    processed = processed
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\n")
  }

  // Sort key-value pairs if enabled
  if (options.sortKeyValuePairs) {
    processed = sortKeyValuePairs(processed)

    // Normalize whitespace around key-value delimiters (= or :)
    // so `KEY = value` and `KEY=value` are treated identically.
    // Only applies to lines that match key-value format.
    processed = processed
      .split("\n")
      .map((line) => {
        const match = line.match(/^([ \t]*)([A-Za-z0-9_.-]+)[ \t]*[=:][ \t]*(.*)$/)
        if (match) {
          return `${match[1]}${match[2]}=${match[3]}`
        }
        return line
      })
      .join("\n")
  }

  // Trim spaces on each line if enabled
  if (options.trimLeadingWhitespace || options.trimTrailingWhitespace) {
    processed = processed
      .split("\n")
      .map((line) => {
        let trimmed = line
        if (options.trimLeadingWhitespace) {
          trimmed = trimmed.trimStart()
        }
        if (options.trimTrailingWhitespace) {
          trimmed = trimmed.trimEnd()
        }
        return trimmed
      })
      .join("\n")
  }

  // Ignore last line newline if enabled
  if (options.ignoreLastLineNewline) {
    if (processed.endsWith("\n")) {
      processed = processed.slice(0, -1)
    } else if (processed.endsWith("\r")) {
      processed = processed.slice(0, -1)
    }
  }

  return processed
}

/**
 * Computes side-by-side aligned diff lines
 */
export function computeAlignedDiff(
  oldStr: string,
  newStr: string,
  options: DiffEngineOptions
): AlignedLine[] {
  const original = preprocessText(oldStr, options)
  const changed = preprocessText(newStr, options)

  if (options.sortKeyValuePairs) {
    return computeKeyedAlignedDiff(original, changed, options)
  }

  const diffOptions = {
    ignoreCase: !options.caseSensitive,
    ignoreWhitespace: !options.whitespaceSensitive,
    stripTrailingCr: !options.lineEndingSensitive,
  }

  const rawChanges = diffLines(original, changed, diffOptions)

  interface SplitChange {
    type: "added" | "removed" | "normal"
    lines: string[]
  }

  const splitChanges: SplitChange[] = []
  rawChanges.forEach((change) => {
    const lines = change.value.split("\n")
    if (lines[lines.length - 1] === "") {
      lines.pop() // remove trailing empty split item
    }
    const type = change.added ? "added" : change.removed ? "removed" : "normal"
    if (lines.length > 0) {
      splitChanges.push({ type, lines })
    }
  })

  const aligned: AlignedLine[] = []
  let leftLineNum = 1
  let rightLineNum = 1

  for (let i = 0; i < splitChanges.length; i++) {
    const current = splitChanges[i]
    const next = splitChanges[i + 1]

    if (current.type === "removed" && next && next.type === "added") {
      // Modified chunk (deletions followed by additions)
      const R = current.lines.length
      const A = next.lines.length
      const maxLen = Math.max(R, A)

      for (let j = 0; j < maxLen; j++) {
        const leftLine = j < R ? current.lines[j] : null
        const rightLine = j < A ? next.lines[j] : null

        let leftSubChanges: Change[] | undefined
        let rightSubChanges: Change[] | undefined

        if (
          leftLine !== null &&
          rightLine !== null &&
          options.inlineDiffMode !== "none"
        ) {
          let charDiff: Change[]
          const subDiffOptions = { ignoreCase: !options.caseSensitive }

          if (options.inlineDiffMode === "char") {
            charDiff = diffChars(leftLine, rightLine, subDiffOptions)
          } else {
            charDiff = diffWordsWithSpace(leftLine, rightLine, subDiffOptions)
          }

          leftSubChanges = charDiff.filter((c) => !c.added)
          rightSubChanges = charDiff.filter((c) => !c.removed)
        }

        aligned.push({
          left: {
            text: leftLine ?? "",
            lineNumber: leftLine !== null ? leftLineNum++ : null,
            type: leftLine !== null ? "removed" : "empty",
            subChanges: leftSubChanges,
          },
          right: {
            text: rightLine ?? "",
            lineNumber: rightLine !== null ? rightLineNum++ : null,
            type: rightLine !== null ? "added" : "empty",
            subChanges: rightSubChanges,
          },
        })
      }
      i++ // skip the next change item since we paired it
    } else if (current.type === "removed") {
      // Standalone deletion
      current.lines.forEach((line) => {
        aligned.push({
          left: {
            text: line,
            lineNumber: leftLineNum++,
            type: "removed",
          },
          right: {
            text: "",
            lineNumber: null,
            type: "empty",
          },
        })
      })
    } else if (current.type === "added") {
      // Standalone addition
      current.lines.forEach((line) => {
        aligned.push({
          left: {
            text: "",
            lineNumber: null,
            type: "empty",
          },
          right: {
            text: line,
            lineNumber: rightLineNum++,
            type: "added",
          },
        })
      })
    } else {
      // Normal unchanged lines
      current.lines.forEach((line) => {
        aligned.push({
          left: {
            text: line,
            lineNumber: leftLineNum++,
            type: "normal",
          },
          right: {
            text: line,
            lineNumber: rightLineNum++,
            type: "normal",
          },
        })
      })
    }
  }

  return aligned
}

/**
 * Computes unified diff lines
 */
export function computeUnifiedDiff(
  oldStr: string,
  newStr: string,
  options: DiffEngineOptions
): UnifiedLine[] {
  const original = preprocessText(oldStr, options)
  const changed = preprocessText(newStr, options)

  if (options.sortKeyValuePairs) {
    return computeKeyedUnifiedDiff(original, changed, options)
  }

  const diffOptions = {
    ignoreCase: !options.caseSensitive,
    ignoreWhitespace: !options.whitespaceSensitive,
    stripTrailingCr: !options.lineEndingSensitive,
  }

  const rawChanges = diffLines(original, changed, diffOptions)

  interface SplitChange {
    type: "added" | "removed" | "normal"
    lines: string[]
  }

  const splitChanges: SplitChange[] = []
  rawChanges.forEach((change) => {
    const lines = change.value.split("\n")
    if (lines[lines.length - 1] === "") {
      lines.pop()
    }
    const type = change.added ? "added" : change.removed ? "removed" : "normal"
    if (lines.length > 0) {
      splitChanges.push({ type, lines })
    }
  })

  const unified: UnifiedLine[] = []
  let oldLineNum = 1
  let newLineNum = 1

  for (let i = 0; i < splitChanges.length; i++) {
    const current = splitChanges[i]
    const next = splitChanges[i + 1]

    if (current.type === "removed" && next && next.type === "added") {
      // Modified chunk (deletions followed by additions)
      const R = current.lines.length
      const A = next.lines.length

      const removedLinesSubChanges: (Change[] | undefined)[] = []
      const addedLinesSubChanges: (Change[] | undefined)[] = []

      const maxLen = Math.max(R, A)
      for (let j = 0; j < maxLen; j++) {
        const leftLine = j < R ? current.lines[j] : null
        const rightLine = j < A ? next.lines[j] : null

        if (
          leftLine !== null &&
          rightLine !== null &&
          options.inlineDiffMode !== "none"
        ) {
          let charDiff: Change[]
          const subDiffOptions = { ignoreCase: !options.caseSensitive }

          if (options.inlineDiffMode === "char") {
            charDiff = diffChars(leftLine, rightLine, subDiffOptions)
          } else {
            charDiff = diffWordsWithSpace(leftLine, rightLine, subDiffOptions)
          }

          removedLinesSubChanges[j] = charDiff.filter((c) => !c.added)
          addedLinesSubChanges[j] = charDiff.filter((c) => !c.removed)
        }
      }

      // Output all deletions first
      for (let j = 0; j < R; j++) {
        unified.push({
          text: current.lines[j],
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          type: "removed",
          subChanges: removedLinesSubChanges[j],
        })
      }

      // Output all additions next
      for (let j = 0; j < A; j++) {
        unified.push({
          text: next.lines[j],
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          type: "added",
          subChanges: addedLinesSubChanges[j],
        })
      }

      i++ // skip next
    } else if (current.type === "removed") {
      current.lines.forEach((line) => {
        unified.push({
          text: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: null,
          type: "removed",
        })
      })
    } else if (current.type === "added") {
      current.lines.forEach((line) => {
        unified.push({
          text: line,
          oldLineNumber: null,
          newLineNumber: newLineNum++,
          type: "added",
        })
      })
    } else {
      current.lines.forEach((line) => {
        unified.push({
          text: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          type: "normal",
        })
      })
    }
  }

  return unified
}

/**
 * Computes character-level similarity using Dice's Coefficient on common characters
 */
export function computeSimilarity(
  oldStr: string,
  newStr: string,
  options: DiffEngineOptions
): number {
  let original = preprocessText(oldStr, options)
  let changed = preprocessText(newStr, options)

  if (options.sortKeyValuePairs && options.ignoreKeyValueValueChanges) {
    original = stripKeyValueValues(original, options)
    changed = stripKeyValueValues(changed, options)
  }

  const s1 = options.caseSensitive ? original : original.toLowerCase()
  const s2 = options.caseSensitive ? changed : changed.toLowerCase()

  if (!s1 && !s2) return 100
  if (!s1 || !s2) return 0

  const chars = diffChars(s1, s2)
  let commonLen = 0

  chars.forEach((c) => {
    if (!c.added && !c.removed) {
      commonLen += c.value.length
    }
  })

  return Math.round(((2 * commonLen) / (s1.length + s2.length)) * 100)
}
