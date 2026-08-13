import { computeJsonStructuralDiff } from "@/lib/jsonDiff"
import type { PresetDefinition } from "./types"

export const jsonPreset: PresetDefinition = {
  id: "json",
  label: "JSON",
  settings: {},
  detect: (original, changed) => {
    try {
      const left = JSON.parse(original)
      const right = JSON.parse(changed)
      return (
        typeof left === "object" &&
        left !== null &&
        typeof right === "object" &&
        right !== null
      )
    } catch {
      return false
    }
  },
  options: [
    {
      key: "ignoreValues",
      label: "Ignore values",
      description: "Treat matching JSON leaf paths as unchanged",
      tooltip:
        "When enabled, scalar values are ignored only when their structural JSON path matches. Containers and structure still differ.",
      type: "switch",
      defaultValue: false,
    },
    {
      key: "showDiffOnly",
      label: "Show diff only",
      description: "Hide JSON paths that match after structural comparison",
      tooltip:
        "When enabled, unchanged JSON containers and leaves are hidden from the rendered diff.",
      type: "switch",
      defaultValue: false,
    },
  ],
  renderDiff: ({ original, changed, options, presetOptions }) => {
    const result = computeJsonStructuralDiff(
      original,
      changed,
      options,
      presetOptions.ignoreValues
    )

    if (!presetOptions.showDiffOnly) return result

    return {
      ...result,
      alignedLines: result.alignedLines.filter(
        (row) => row.left.type !== "normal" || row.right.type !== "normal"
      ),
      unifiedLines: result.unifiedLines.filter((line) => line.type !== "normal"),
    }
  },
}
