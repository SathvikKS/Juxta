import type { DiffSettings } from "./SettingsPanel"

export type SettingCategory = "comparison" | "editor" | "behavior"

export interface SettingOption<T> {
  value: T
  label: string
}

export type SettingDefinition =
  | {
      key: keyof DiffSettings
      label: string
      description: string
      tooltip?: string
      category: SettingCategory
      type: "switch"
    }
  | {
      key: keyof DiffSettings
      label: string
      description: string
      tooltip?: string
      category: SettingCategory
      type: "select"
      options: SettingOption<any>[]
    }
  | {
      key: keyof DiffSettings
      label: string
      description: string
      tooltip?: string
      category: SettingCategory
      type: "number"
      min?: number
      max?: number
      step?: number
    }
  | {
      key: "theme"
      label: string
      description: string
      tooltip?: string
      category: "editor"
      type: "select"
      options: SettingOption<"light" | "dark" | "system">[]
    }

export const SETTINGS_CATEGORIES: { value: SettingCategory; label: string }[] = [
  { value: "comparison", label: "Comparison" },
  { value: "editor", label: "Editor & View" },
  { value: "behavior", label: "Behavior" },
]

export const SETTINGS_SCHEMA: SettingDefinition[] = [
  // Comparison Settings
  {
    key: "sortKeyValuePairs",
    label: "Sort Key-Value Pairs",
    description: "Align and sort environment or properties files by key",
    tooltip: "When enabled, lines matching KEY=VALUE (like .env or .properties files) will be sorted alphabetically by key before comparison. This ignores differences caused purely by key reordering.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "ignoreEmptyLines",
    label: "Ignore Empty Lines",
    description: "Do not show empty lines as differences",
    tooltip: "When enabled, empty or blank lines are skipped during comparison, preventing them from showing up as additions or deletions.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "caseSensitive",
    label: "Case Sensitive",
    description: "Distinguish uppercase and lowercase",
    tooltip: 'When enabled, "A" and "a" will be treated as different. If disabled, casing difference is ignored.',
    category: "comparison",
    type: "switch",
  },
  {
    key: "whitespaceSensitive",
    label: "Whitespace Sensitive",
    description: "Highlight changes in spacing and tabs",
    tooltip: "When enabled, changes in spaces or tabs are highlighted. If disabled, leading and trailing whitespaces are ignored.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "trimWhitespace",
    label: "Trim Whitespace",
    description: "Automatically strip trailing spaces on lines",
    tooltip: "When enabled, whitespaces at the end of lines are automatically stripped before running the comparison.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "lineEndingSensitive",
    label: "Line Ending Sensitive (CR/LF)",
    description: "Compare carriage returns and line feeds",
    tooltip: "When enabled, differences between Windows line endings (\\r\\n) and Unix line endings (\\n) are treated as diffs. If disabled, line endings are normalized.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "ignoreLastLineNewline",
    label: "Ignore Last Line Newline",
    description: "Do not treat trailing final newline as a difference",
    tooltip: "When enabled, any trailing newline character at the end of the file/text is ignored during comparison.",
    category: "comparison",
    type: "switch",
  },
  {
    key: "inlineDiffMode",
    label: "Inline Diff Highlighting",
    description: "How details inside lines are highlighted",
    tooltip: "Select how to highlight specific edits within modified lines. Character-level is most detailed, while Word-level is cleaner for text paragraphs.",
    category: "comparison",
    type: "select",
    options: [
      { value: "char", label: "Character-level" },
      { value: "word", label: "Word-level" },
      { value: "none", label: "None" },
    ],
  },
  // Editor & View Settings
  {
    key: "scrollLock",
    label: "Sync Scrolling (Scroll Lock)",
    description: "Keep split view scrolling synchronized",
    tooltip: "When enabled, scrolling either column will scroll the other at the same time to keep the comparison aligned.",
    category: "editor",
    type: "switch",
  },
  {
    key: "showLineNumbers",
    label: "Show Line Numbers",
    description: "Show line counts in visual diff pane",
    category: "editor",
    type: "switch",
  },
  {
    key: "wrapLines",
    label: "Wrap Lines",
    description: "Soft-wrap lines that overflow the container",
    category: "editor",
    type: "switch",
  },
  {
    key: "disableSpellCheck",
    label: "Disable Spell Check",
    description: "Disable browser spell check and red underlines",
    category: "editor",
    type: "switch",
  },
  {
    key: "theme",
    label: "Color Theme",
    description: "Select color appearance style",
    category: "editor",
    type: "select",
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
      { value: "system", label: "System" },
    ],
  },
  // Behavior Settings
  {
    key: "autoDetectPresets",
    label: "Auto-Detect Presets",
    description: "Suggest presets based on input text format",
    tooltip: "When enabled, Juxta will analyze your input text and suggest applying suitable presets (like .env files) if it detects matching formats.",
    category: "behavior",
    type: "switch",
  },
  {
    key: "autoCompare",
    label: "Auto-Compare (ms)",
    description: "-1: manual, 0: instant, >0: debounce delay",
    tooltip: "Set to -1 to disable auto-compare. Set to 0 for instant comparison. Any value greater than 0 defines the debounce delay in milliseconds.",
    category: "behavior",
    type: "number",
    min: -1,
    step: 50,
  },
]
