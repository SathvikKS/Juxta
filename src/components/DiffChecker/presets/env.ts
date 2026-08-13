import type { PresetDefinition } from "./types"

function isKeyValueFormat(text: string): boolean {
  if (!text || text.trim() === "") return false

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line !== "" &&
        !line.startsWith("#") &&
        !line.startsWith("//") &&
        !line.startsWith(";")
    )

  if (lines.length === 0) return false

  // Avoid treating JSON, CSS, JavaScript, or TypeScript as key-value files.
  if (
    text.includes("{") ||
    text.includes("}") ||
    text.includes("const ") ||
    text.includes("let ") ||
    text.includes("import ")
  ) {
    return false
  }

  const linesToTest = lines.slice(0, 30)
  const matchCount = linesToTest.filter((line) =>
    /^[A-Za-z0-9_.-]+\s*[=:]/.test(line)
  ).length

  return matchCount / linesToTest.length > 0.7
}

export const envPreset: PresetDefinition = {
  id: "env",
  label: ".env",
  detect: (original, changed) =>
    isKeyValueFormat(original) || isKeyValueFormat(changed),
  settings: {
    sortKeyValuePairs: true,
    ignoreEmptyLines: true,
    ignoreComments: true,
    whitespaceSensitive: false,
    trimLeadingWhitespace: true,
    trimTrailingWhitespace: true,
    lineEndingSensitive: false,
  },
  options: [
    {
      key: "ignoreValues",
      label: "Ignore values",
      description: "Treat matching keys as unchanged even when values differ",
      tooltip:
        "When enabled, lines with the same key are considered matching even if their values are different.",
      type: "switch",
      defaultValue: false,
    },
    {
      key: "showDiffOnly",
      label: "Show diff only",
      description: "Hide rows that match after preset processing",
      tooltip:
        "When enabled, unchanged rows are hidden from the rendered split and unified diff views.",
      type: "switch",
      defaultValue: false,
    },
  ],
  getDiffOptions: (options) => ({
    ignoreKeyValueValueChanges: options.ignoreValues,
  }),
  filterDiffResult: (result, options) => {
    if (!options.showDiffOnly) {
      return result
    }

    return {
      ...result,
      alignedLines: result.alignedLines.filter(
        (row) => row.left.type !== "normal" || row.right.type !== "normal"
      ),
      unifiedLines: result.unifiedLines.filter(
        (line) => line.type !== "normal"
      ),
    }
  },
}
