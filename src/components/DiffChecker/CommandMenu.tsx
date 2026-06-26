import * as React from "react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTheme } from "@/components/theme-provider"
import { SETTINGS_SCHEMA } from "./settingsSchema"
import { PRESETS } from "./presets"
import {
  getActivePresetOptions,
  type DiffSettings,
  type PresetOptionValue,
  type PresetType,
} from "./settingsEngine"
import type { SettingCategory } from "./settingsSchema"
import {
  Type,
  Maximize2,
  Scissors,
  CornerDownLeft,
  FileDown,
  Sparkles,
  Lock,
  Binary,
  WrapText,
  SpellCheck,
  Sun,
  Moon,
  Laptop,
  Timer,
  Settings as SettingsIcon,
  Trash2,
  ArrowLeftRight,
  Columns,
  Rows,
  ChevronRight,
  ArrowLeft,
  Check,
  Zap,
  RotateCcw,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react"

const customFilter = (value: string, search: string) => {
  const val = value.toLowerCase().trim()
  const searchStr = search.toLowerCase().trim()

  if (!searchStr) return 1

  // 1. Exact match gets highest score
  if (val === searchStr) return 1

  // 2. Starts with gets very high score
  if (val.startsWith(searchStr)) return 0.9

  // 3. Includes substring gets good score
  if (val.includes(searchStr)) {
    const index = val.indexOf(searchStr)
    return 0.8 - (index / val.length) * 0.3
  }

  // 4. Word-by-word prefix match (e.g. "split" matching "Switch to Split View")
  const words = val.split(/\s+/)
  const startsWithWord = words.some((word) => word.startsWith(searchStr))
  if (startsWithWord) return 0.5

  return 0 // No match, filter out
}

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: DiffSettings
  onSettingChange: (
    key: keyof DiffSettings,
    value: DiffSettings[keyof DiffSettings]
  ) => void
  onPresetOptionChange: (key: string, value: PresetOptionValue) => void
  viewMode: "split" | "unified"
  onViewModeChange: (mode: "split" | "unified") => void
  onClearAll: () => void
  onSwap: () => void
  onOpenSettingsPanel: (tab: SettingCategory, highlightKey: string) => void
  onResetSettings: () => void
}

type ViewState = "root" | "custom-auto-compare"
type ThemeValue = "light" | "dark" | "system"
type SelectSettingValue = DiffSettings[keyof DiffSettings] | ThemeValue

// Helper to resolve a distinct, colorful icon for each settings item
function getSettingIcon(key: string) {
  switch (key) {
    case "caseSensitive":
      return <Type className="h-4.5 w-4.5 text-sky-500" />
    case "whitespaceSensitive":
      return <Maximize2 className="h-4.5 w-4.5 text-emerald-500" />
    case "trimLeadingWhitespace":
    case "trimTrailingWhitespace":
      return <Scissors className="h-4.5 w-4.5 text-amber-500" />
    case "lineEndingSensitive":
      return <CornerDownLeft className="h-4.5 w-4.5 text-indigo-500" />
    case "ignoreLastLineNewline":
      return <FileDown className="h-4.5 w-4.5 text-rose-500" />
    case "inlineDiffMode":
      return <Sparkles className="h-4.5 w-4.5 text-violet-500" />
    case "scrollLock":
      return <Lock className="h-4.5 w-4.5 text-teal-500" />
    case "showLineNumbers":
      return <Binary className="h-4.5 w-4.5 text-cyan-500" />
    case "wrapLines":
      return <WrapText className="h-4.5 w-4.5 text-purple-500" />
    case "disableSpellCheck":
      return <SpellCheck className="h-4.5 w-4.5 text-pink-500" />
    case "theme":
      return <Sun className="h-4.5 w-4.5 text-yellow-500" />
    case "autoCompare":
      return <Timer className="h-4.5 w-4.5 text-orange-500" />
    default:
      return <SettingsIcon className="h-4.5 w-4.5 text-muted-foreground" />
  }
}

export function CommandMenu({
  open,
  onOpenChange,
  settings,
  onSettingChange,
  onPresetOptionChange,
  viewMode,
  onViewModeChange,
  onClearAll,
  onSwap,
  onOpenSettingsPanel,
  onResetSettings,
}: CommandMenuProps) {
  const [currentView, setCurrentView] = React.useState<ViewState>("root")
  const [searchQuery, setSearchQuery] = React.useState("")
  const { theme, setTheme } = useTheme()
  const listRef = React.useRef<HTMLDivElement>(null)

  // Toggle command menu with Cmd+K or Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  // Reset view when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrentView("root")
        setSearchQuery("")
      }, 150)
    }
  }, [open])

  // Reset scroll level to top when search query, view, or open state changes
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [open, searchQuery, currentView])

  // Custom key handler to intercept Escape inside subviews
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && currentView !== "root") {
      e.preventDefault()
      e.stopPropagation()
      setCurrentView("root")
      setSearchQuery("")
    }
  }

  const toggleSwitchSetting = (key: keyof DiffSettings) => {
    onSettingChange(key, !settings[key] as DiffSettings[keyof DiffSettings])
  }

  const setSelectSetting = (
    key: keyof DiffSettings | "theme",
    value: SelectSettingValue
  ) => {
    if (key === "theme") {
      setTheme(value as ThemeValue)
    } else {
      onSettingChange(key, value as DiffSettings[keyof DiffSettings])
    }
  }

  const setNumericSetting = (
    key: keyof DiffSettings,
    value: number,
    shouldClose = false
  ) => {
    onSettingChange(key, value)
    if (shouldClose) {
      onOpenChange(false)
    }
  }

  const setPreset = (presetId: PresetType) => {
    onSettingChange("preset", presetId)
  }

  const presetEntries = Object.values(PRESETS).filter((p) => p.id !== "custom")
  const activePresetId =
    settings.preset === "custom" ? settings.presetState?.id : settings.preset
  const activePreset =
    activePresetId && activePresetId !== "none" ? PRESETS[activePresetId] : undefined
  const activePresetOptions = activePreset?.options ?? []
  const activePresetOptionValues = getActivePresetOptions(settings)

  const handleCustomNumberSubmit = () => {
    const val = parseInt(searchQuery, 10)
    if (!isNaN(val)) {
      setNumericSetting("autoCompare", val, false)
      setCurrentView("root")
      setSearchQuery("")
    }
  }

  // Filter out non-numeric characters for custom inputs
  const handleSearchChange = (value: string) => {
    if (currentView === "custom-auto-compare") {
      const sanitized = value.replace(/[^0-9-]/g, "")
      setSearchQuery(sanitized)
    } else {
      setSearchQuery(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>
          Quickly search all settings and editor actions.
        </DialogDescription>
      </DialogHeader>
      <DialogContent
        className="top-[12%] translate-y-0 overflow-hidden rounded-xl! border border-border/80 bg-popover/90 p-0 shadow-2xl backdrop-blur-md sm:max-w-[540px]"
        showCloseButton={false}
      >
        <Command className="bg-transparent" filter={customFilter}>
          <div
            onKeyDown={handleKeyDown}
            className="flex h-full flex-col bg-card/40 backdrop-blur-md"
          >
            <CommandInput
              placeholder={
                currentView === "custom-auto-compare"
                  ? "Type delay in ms (e.g. 500) and press Enter..."
                  : "Search settings or actions... (Esc to close)"
              }
              value={searchQuery}
              onValueChange={handleSearchChange}
            />
            <CommandList ref={listRef} className="max-h-[350px] space-y-1 p-2">
              <CommandEmpty className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <span>No results found.</span>
                <span className="text-xs text-muted-foreground/60">
                  Try searching for other words like "theme", "whitespace", or
                  "split".
                </span>
              </CommandEmpty>

              {currentView === "root" && (
                <>
                  {/* Group 1: Editor Actions (Prioritized first) */}
                  <CommandGroup heading="Editor Actions">
                    <CommandItem
                      value="Swap Editor Texts"
                      onSelect={() => {
                        onSwap()
                        onOpenChange(false)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                          <ArrowLeftRight className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium text-foreground">
                            Swap Editor Texts
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            Swap original and changed columns
                          </span>
                        </div>
                      </div>
                    </CommandItem>

                    <CommandItem
                      value="Clear Texts"
                      onSelect={() => {
                        onClearAll()
                        onOpenChange(false)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-none rounded-md border border-destructive/20 bg-destructive/10 p-1">
                          <Trash2 className="h-4.5 w-4.5 text-destructive" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium text-destructive">
                            Clear Texts
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            Wipe both text fields clean
                          </span>
                        </div>
                      </div>
                    </CommandItem>

                    <CommandItem
                      value="Switch to Split View"
                      onSelect={() => {
                        onViewModeChange("split")
                        onOpenChange(false)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                      data-checked={viewMode === "split"}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                          <Columns className="h-4.5 w-4.5 text-sky-500" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium text-foreground">
                            Switch to Split View
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            Display inputs side-by-side
                          </span>
                        </div>
                      </div>
                    </CommandItem>

                    <CommandItem
                      value="Switch to Unified View"
                      onSelect={() => {
                        onViewModeChange("unified")
                        onOpenChange(false)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                      data-checked={viewMode === "unified"}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                          <Rows className="h-4.5 w-4.5 text-purple-500" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium text-foreground">
                            Switch to Unified View
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            Display inputs combined inline
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>

                  {/* Group 2: Presets */}
                  <CommandGroup heading="Presets">
                    {presetEntries.map((preset) => {
                      const isPureActive = settings.preset === preset.id
                      const isModifiedActive =
                        settings.preset === "custom" &&
                        settings.presetState?.id === preset.id
                      const isActive = isPureActive || isModifiedActive
                      const optionCount = preset.options?.length ?? 0

                      return (
                        <CommandItem
                          key={preset.id}
                          value={`Preset ${preset.label} ${preset.id} ${optionCount > 0 ? `${optionCount} options` : "no options"}${isModifiedActive ? " modified" : ""}`}
                          onSelect={() => setPreset(preset.id)}
                          className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                          data-checked={isActive}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                              <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="text-sm font-medium text-foreground">
                                Preset: {preset.label}
                                {isModifiedActive && (
                                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                    (modified)
                                  </span>
                                )}
                              </span>
                              <span className="truncate text-[11px] text-muted-foreground">
                                {preset.id === "none"
                                  ? "Turn off preset-specific comparison rules"
                                  : isModifiedActive
                                    ? "Re-apply default preset rules"
                                    : optionCount > 0
                                      ? `Apply preset rules and unlock ${optionCount} preset option${optionCount === 1 ? "" : "s"}`
                                      : "Apply preset-specific comparison rules"}
                              </span>
                            </div>
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>

                  {activePreset && activePresetOptions.length > 0 && (
                    <CommandGroup
                      heading={`${activePreset.label} Preset Options`}
                    >
                      {activePresetOptions.map((option) => {
                        const isChecked = Boolean(
                          activePresetOptionValues[option.key]
                        )

                        return (
                          <CommandItem
                            key={`${activePreset.id}-${option.key}`}
                            value={`${activePreset.label} preset option ${option.label} ${option.description}`}
                            onSelect={() =>
                              onPresetOptionChange(option.key, !isChecked)
                            }
                            className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                <SlidersHorizontal className="h-4.5 w-4.5 text-violet-500" />
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span className="text-sm font-medium text-foreground">
                                  {activePreset.label}: {option.label}
                                </span>
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {option.description}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold select-none ${
                                isChecked
                                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border bg-muted text-muted-foreground/80"
                              }`}
                            >
                              {isChecked ? "On" : "Off"}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}

                  {/* Group 3: Settings Options */}
                  <CommandGroup heading="Settings Options">
                    {SETTINGS_SCHEMA.map((setting) => {
                      const isMandated =
                        settings.preset !== "none" &&
                        settings.preset !== "custom" &&
                        PRESETS[settings.preset]?.settings &&
                        setting.key in PRESETS[settings.preset].settings

                      if (setting.type === "switch") {
                        const isChecked = settings[
                          setting.key as keyof DiffSettings
                        ] as boolean
                        return (
                          <CommandItem
                            key={setting.key}
                            value={setting.label}
                            onSelect={() =>
                              toggleSwitchSetting(
                                setting.key as keyof DiffSettings
                              )
                            }
                            className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                {getSettingIcon(setting.key)}
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-sm font-medium text-foreground">
                                    {setting.label}
                                  </span>
                                  {isMandated && (
                                    <span className="inline-flex shrink-0 items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary select-none">
                                      Preset Mandated
                                    </span>
                                  )}
                                </div>
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {setting.description}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold select-none ${
                                isChecked
                                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border bg-muted text-muted-foreground/80"
                              }`}
                            >
                              {isChecked ? "On" : "Off"}
                            </div>
                          </CommandItem>
                        )
                      }

                      if (setting.type === "select") {
                        const isTheme = setting.key === "theme"
                        const currentValue = isTheme
                          ? theme
                          : settings[setting.key as keyof DiffSettings]

                        return (
                          <React.Fragment key={setting.key}>
                            {setting.options.map((opt) => {
                              const isOptionChecked = currentValue === opt.value
                              let optionIcon = getSettingIcon(setting.key)

                              // Provide unique icons for themes
                              if (isTheme) {
                                if (opt.value === "light")
                                  optionIcon = (
                                    <Sun className="h-4.5 w-4.5 text-amber-500" />
                                  )
                                if (opt.value === "dark")
                                  optionIcon = (
                                    <Moon className="h-4.5 w-4.5 text-indigo-400" />
                                  )
                                if (opt.value === "system")
                                  optionIcon = (
                                    <Laptop className="h-4.5 w-4.5 text-slate-500" />
                                  )
                              }

                              return (
                                <CommandItem
                                  key={`${setting.key}-${opt.value}`}
                                  value={`Set ${setting.label} to ${opt.label}`}
                                  onSelect={() =>
                                    setSelectSetting(
                                      setting.key,
                                      opt.value as SelectSettingValue
                                    )
                                  }
                                  className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                                  data-checked={isOptionChecked}
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                      {optionIcon}
                                    </div>
                                    <div className="flex min-w-0 flex-col">
                                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                                        <span>
                                          Set {setting.label} to{" "}
                                          <strong className="font-semibold text-primary">
                                            {opt.label}
                                          </strong>
                                        </span>
                                        {isMandated && (
                                          <span className="inline-flex shrink-0 items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary select-none">
                                            Preset Mandated
                                          </span>
                                        )}
                                      </span>
                                      <span className="truncate text-[11px] text-muted-foreground">
                                        {setting.description}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </React.Fragment>
                        )
                      }

                      if (setting.type === "number") {
                        const currentVal = settings[
                          setting.key as keyof DiffSettings
                        ] as number
                        return (
                          <React.Fragment key={setting.key}>
                            {/* Preset -1 */}
                            <CommandItem
                              value={`Disable ${setting.label} (Manual)`}
                              onSelect={() =>
                                setNumericSetting(
                                  setting.key as keyof DiffSettings,
                                  -1
                                )
                              }
                              className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                              data-checked={currentVal === -1}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                  <Timer className="h-4.5 w-4.5 text-muted-foreground opacity-60" />
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    Disable {setting.label} (Manual)
                                  </span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    Disable auto-compiling, must compare
                                    manually
                                  </span>
                                </div>
                              </div>
                            </CommandItem>

                            {/* Preset 0 */}
                            <CommandItem
                              value={`Instant ${setting.label} (0ms)`}
                              onSelect={() =>
                                setNumericSetting(
                                  setting.key as keyof DiffSettings,
                                  0
                                )
                              }
                              className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                              data-checked={currentVal === 0}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                  <Zap className="h-4.5 w-4.5 text-amber-500" />
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    Instant {setting.label} (0ms)
                                  </span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    Recompute changes instantly on keystroke
                                  </span>
                                </div>
                              </div>
                            </CommandItem>

                            {/* Preset 250ms */}
                            <CommandItem
                              value={`Debounce ${setting.label} (250ms)`}
                              onSelect={() =>
                                setNumericSetting(
                                  setting.key as keyof DiffSettings,
                                  250
                                )
                              }
                              className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                              data-checked={currentVal === 250}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                  <Timer className="h-4.5 w-4.5 text-indigo-500" />
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    Debounce {setting.label} (250ms)
                                  </span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    Recompute delay after typing stops
                                  </span>
                                </div>
                              </div>
                            </CommandItem>

                            {/* Custom value drilldown option */}
                            <CommandItem
                              value={`Custom delay for ${setting.label}`}
                              onSelect={() => {
                                setCurrentView("custom-auto-compare")
                                setSearchQuery("")
                              }}
                              className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                                  <SettingsIcon className="h-4.5 w-4.5 text-primary" />
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    Custom delay for {setting.label}...
                                  </span>
                                  <span className="truncate text-[11px] text-muted-foreground">
                                    Type a custom delay in milliseconds
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                Current:{" "}
                                {currentVal === -1
                                  ? "Disabled"
                                  : `${currentVal}ms`}
                              </div>
                            </CommandItem>
                          </React.Fragment>
                        )
                      }

                      return null
                    })}
                  </CommandGroup>

                  {/* Group 3: Dialog Locators (Prioritized third) */}
                  <CommandGroup heading="Locate in Settings Panel">
                    {SETTINGS_SCHEMA.map((setting) => (
                      <CommandItem
                        key={`open-${setting.key}`}
                        value={`Locate ${setting.label} in settings`}
                        onSelect={() => {
                          onOpenChange(false)
                          // Trigger opening settings panel
                          setTimeout(() => {
                            onOpenSettingsPanel(setting.category, setting.key)
                          }, 100)
                        }}
                        className="group/locate flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1 text-muted-foreground group-data-selected/locate:text-primary">
                            <ExternalLink className="h-4.5 w-4.5 transition-colors" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="text-sm font-medium text-muted-foreground group-data-selected/locate:text-foreground">
                              Locate:{" "}
                              <strong className="text-foreground">
                                {setting.label}
                              </strong>
                            </span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              Highlight item inside the Settings Dialog
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-data-selected/locate:translate-x-0.5 group-data-selected/locate:text-muted-foreground" />
                      </CommandItem>
                    ))}

                    <CommandItem
                      value="Reset Settings to Defaults"
                      onSelect={() => {
                        onResetSettings()
                        onOpenChange(false)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg! p-2.5 transition-all"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-none rounded-md border border-border/30 bg-muted/40 p-1">
                          <RotateCcw className="h-4.5 w-4.5 text-muted-foreground" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium text-foreground">
                            Reset Settings to Defaults
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            Revert all diff options to default values
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}

              {currentView === "custom-auto-compare" && (
                <CommandGroup heading="Custom Auto-Compare delay in ms">
                  <CommandItem
                    value="back"
                    onSelect={() => {
                      setCurrentView("root")
                      setSearchQuery("")
                    }}
                    className="flex cursor-pointer items-center rounded-lg! p-2.5 transition-all"
                  >
                    <ArrowLeft className="mr-3 h-4.5 w-4.5 text-muted-foreground" />
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">
                        Back to search
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Return to the settings search menu
                      </span>
                    </div>
                    <CommandShortcut className="rounded-sm border bg-muted px-2 py-0.5 text-xs font-semibold select-none">
                      Esc
                    </CommandShortcut>
                  </CommandItem>

                  <CommandItem
                    value={searchQuery}
                    onSelect={handleCustomNumberSubmit}
                    className="flex cursor-pointer items-center rounded-lg! p-2.5 font-mono transition-all"
                    disabled={searchQuery.length === 0}
                  >
                    <Check className="mr-3 h-4.5 w-4.5 text-emerald-500" />
                    <div className="flex flex-1 flex-col font-sans">
                      <span className="text-sm font-medium text-foreground">
                        Set Auto-Compare delay to:{" "}
                        <strong className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400">
                          {searchQuery || "..."} ms
                        </strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Press Enter to save this value
                      </span>
                    </div>
                    <CommandShortcut className="rounded-sm border bg-muted px-2 py-0.5 text-xs font-semibold select-none">
                      Enter
                    </CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
