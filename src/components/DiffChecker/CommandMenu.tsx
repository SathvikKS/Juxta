import * as React from "react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command"
import { useTheme } from "@/components/theme-provider"
import { SETTINGS_SCHEMA } from "./settingsSchema"
import type { DiffSettings } from "./SettingsPanel"
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
} from "lucide-react"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: DiffSettings
  onSettingsChange: (settings: DiffSettings) => void
  viewMode: "split" | "unified"
  onViewModeChange: (mode: "split" | "unified") => void
  onClearAll: () => void
  onSwap: () => void
  onOpenSettingsPanel: (tab: SettingCategory, highlightKey: string) => void
  onResetSettings: () => void
}

type ViewState = "root" | "custom-auto-compare"

// Helper to resolve a distinct, colorful icon for each settings item
function getSettingIcon(key: string) {
  switch (key) {
    case "caseSensitive":
      return <Type className="h-4.5 w-4.5 text-sky-500" />
    case "whitespaceSensitive":
      return <Maximize2 className="h-4.5 w-4.5 text-emerald-500" />
    case "trimWhitespace":
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
  onSettingsChange,
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
    onSettingsChange({
      ...settings,
      [key]: !settings[key],
    })
  }

  const setSelectSetting = (key: keyof DiffSettings | "theme", value: any) => {
    if (key === "theme") {
      setTheme(value)
    } else {
      onSettingsChange({
        ...settings,
        [key]: value,
      })
    }
  }

  const setNumericSetting = (key: keyof DiffSettings, value: number, shouldClose = false) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
    if (shouldClose) {
      onOpenChange(false)
    }
  }

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
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Quickly search all settings and editor actions."
    >
      <div onKeyDown={handleKeyDown} className="flex flex-col h-full bg-card/40 backdrop-blur-md">
        <CommandInput
          placeholder={
            currentView === "custom-auto-compare"
              ? "Type delay in ms (e.g. 500) and press Enter..."
              : "Search settings or actions... (Esc to close)"
          }
          value={searchQuery}
          onValueChange={handleSearchChange}
        />
        <CommandList ref={listRef} className="max-h-[350px] p-2 space-y-1">
          <CommandEmpty className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <span>No results found.</span>
            <span className="text-xs text-muted-foreground/60">Try searching for other words like "theme", "whitespace", or "split".</span>
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
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                      <ArrowLeftRight className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-foreground">Swap Editor Texts</span>
                      <span className="text-[11px] text-muted-foreground truncate">
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
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-none p-1 bg-destructive/10 rounded-md border border-destructive/20">
                      <Trash2 className="h-4.5 w-4.5 text-destructive" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-destructive">Clear Texts</span>
                      <span className="text-[11px] text-muted-foreground truncate">
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
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                  data-checked={viewMode === "split"}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                      <Columns className="h-4.5 w-4.5 text-sky-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-foreground">Switch to Split View</span>
                      <span className="text-[11px] text-muted-foreground truncate">
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
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                  data-checked={viewMode === "unified"}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                      <Rows className="h-4.5 w-4.5 text-purple-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-foreground">Switch to Unified View</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        Display inputs combined inline
                      </span>
                    </div>
                  </div>
                </CommandItem>
              </CommandGroup>

              {/* Group 2: Settings Options (Prioritized second) */}
              <CommandGroup heading="Settings Options">
                {SETTINGS_SCHEMA.map((setting) => {
                  if (setting.type === "switch") {
                    const isChecked = settings[setting.key as keyof DiffSettings] as boolean
                    return (
                      <CommandItem
                        key={setting.key}
                        value={setting.label}
                        onSelect={() => toggleSwitchSetting(setting.key as keyof DiffSettings)}
                        className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                            {getSettingIcon(setting.key)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm text-foreground">{setting.label}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {setting.description}
                            </span>
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full select-none shrink-0 ${
                          isChecked
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground/80 border"
                        }`}>
                          {isChecked ? "On" : "Off"}
                        </div>
                      </CommandItem>
                    )
                  }

                  if (setting.type === "select") {
                    const isTheme = setting.key === "theme"
                    const currentValue = isTheme ? theme : settings[setting.key as keyof DiffSettings]

                    return (
                      <React.Fragment key={setting.key}>
                        {setting.options.map((opt) => {
                          const isOptionChecked = currentValue === opt.value
                          let optionIcon = getSettingIcon(setting.key)

                          // Provide unique icons for themes
                          if (isTheme) {
                            if (opt.value === "light") optionIcon = <Sun className="h-4.5 w-4.5 text-amber-500" />
                            if (opt.value === "dark") optionIcon = <Moon className="h-4.5 w-4.5 text-indigo-400" />
                            if (opt.value === "system") optionIcon = <Laptop className="h-4.5 w-4.5 text-slate-500" />
                          }

                          return (
                            <CommandItem
                              key={`${setting.key}-${opt.value}`}
                              value={`Set ${setting.label} to ${opt.label}`}
                              onSelect={() => setSelectSetting(setting.key, opt.value)}
                              className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                              data-checked={isOptionChecked}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                                  {optionIcon}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-sm text-foreground">
                                    Set {setting.label} to{" "}
                                    <strong className="text-primary font-semibold">{opt.label}</strong>
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
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
                    const currentVal = settings[setting.key as keyof DiffSettings] as number
                    return (
                      <React.Fragment key={setting.key}>
                        {/* Preset -1 */}
                        <CommandItem
                          value={`Disable ${setting.label} (Manual)`}
                          onSelect={() => setNumericSetting(setting.key as keyof DiffSettings, -1)}
                          className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                          data-checked={currentVal === -1}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                              <Timer className="h-4.5 w-4.5 text-muted-foreground opacity-60" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-foreground">Disable {setting.label} (Manual)</span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                Disable auto-compiling, must compare manually
                              </span>
                            </div>
                          </div>
                        </CommandItem>

                        {/* Preset 0 */}
                        <CommandItem
                          value={`Instant ${setting.label} (0ms)`}
                          onSelect={() => setNumericSetting(setting.key as keyof DiffSettings, 0)}
                          className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                          data-checked={currentVal === 0}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                              <Zap className="h-4.5 w-4.5 text-amber-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-foreground">Instant {setting.label} (0ms)</span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                Recompute changes instantly on keystroke
                              </span>
                            </div>
                          </div>
                        </CommandItem>

                        {/* Preset 250ms */}
                        <CommandItem
                          value={`Debounce ${setting.label} (250ms)`}
                          onSelect={() => setNumericSetting(setting.key as keyof DiffSettings, 250)}
                          className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                          data-checked={currentVal === 250}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                              <Timer className="h-4.5 w-4.5 text-indigo-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-foreground">Debounce {setting.label} (250ms)</span>
                              <span className="text-[11px] text-muted-foreground truncate">
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
                          className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                              <SettingsIcon className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm text-foreground">Custom delay for {setting.label}...</span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                Type a custom delay in milliseconds
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted/50 text-muted-foreground shrink-0">
                            Current: {currentVal === -1 ? "Disabled" : `${currentVal}ms`}
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
                    className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all group/locate"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30 text-muted-foreground group-data-selected/locate:text-primary">
                        <ExternalLink className="h-4.5 w-4.5 transition-colors" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm text-muted-foreground group-data-selected/locate:text-foreground">
                          Locate: <strong className="text-foreground">{setting.label}</strong>
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          Highlight item inside the Settings Dialog
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-data-selected/locate:text-muted-foreground transition-transform group-data-selected/locate:translate-x-0.5 shrink-0" />
                  </CommandItem>
                ))}

                <CommandItem
                  value="Reset Settings to Defaults"
                  onSelect={() => {
                    onResetSettings()
                    onOpenChange(false)
                  }}
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg! transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-none p-1 bg-muted/40 rounded-md border border-border/30">
                      <RotateCcw className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm text-foreground">Reset Settings to Defaults</span>
                      <span className="text-[11px] text-muted-foreground truncate">
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
                className="cursor-pointer flex items-center p-2.5 rounded-lg! transition-all"
              >
                <ArrowLeft className="mr-3 h-4.5 w-4.5 text-muted-foreground" />
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-sm">Back to search</span>
                  <span className="text-xs text-muted-foreground">Return to the settings search menu</span>
                </div>
                <CommandShortcut className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-muted border select-none">Esc</CommandShortcut>
              </CommandItem>

              <CommandItem
                value={searchQuery}
                onSelect={handleCustomNumberSubmit}
                className="cursor-pointer flex items-center p-2.5 rounded-lg! transition-all font-mono"
                disabled={searchQuery.length === 0}
              >
                <Check className="mr-3 h-4.5 w-4.5 text-emerald-500" />
                <div className="flex flex-col flex-1 font-sans">
                  <span className="font-medium text-sm text-foreground">
                    Set Auto-Compare delay to:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-base font-semibold">
                      {searchQuery || "..."} ms
                    </strong>
                  </span>
                  <span className="text-xs text-muted-foreground">Press Enter to save this value</span>
                </div>
                <CommandShortcut className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-muted border select-none">Enter</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </div>
    </CommandDialog>
  )
}
