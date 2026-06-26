import type { PresetDefinition } from "./types"

export const envPreset: PresetDefinition = {
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
