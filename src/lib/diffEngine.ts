import { diffLines, diffChars, diffWordsWithSpace } from "diff"
import type { Change } from "diff"

export interface DiffEngineOptions {
  caseSensitive: boolean
  whitespaceSensitive: boolean
  trimWhitespace: boolean
  lineEndingSensitive: boolean
  ignoreLastLineNewline: boolean
  inlineDiffMode: "char" | "word" | "none"
  sortKeyValuePairs: boolean
  ignoreEmptyLines: boolean
}

export interface AlignedLine {
  left: {
    text: string
    lineNumber: number | null
    type: "removed" | "normal" | "empty"
    subChanges?: Change[]
  }
  right: {
    text: string
    lineNumber: number | null
    type: "added" | "normal" | "empty"
    subChanges?: Change[]
  }
}

export interface UnifiedLine {
  text: string
  oldLineNumber: number | null
  newLineNumber: number | null
  type: "added" | "removed" | "normal"
  subChanges?: Change[]
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
  let headerLines: string[] = []
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
  }

  // Trim spaces on each line if enabled
  if (options.trimWhitespace) {
    processed = processed
      .split("\n")
      .map((line) => line.trimEnd())
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
  const original = preprocessText(oldStr, options)
  const changed = preprocessText(newStr, options)

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
