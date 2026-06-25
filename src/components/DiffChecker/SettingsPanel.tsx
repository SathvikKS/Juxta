/* eslint-disable react-refresh/only-export-components */
import React from "react"
import { Settings, RotateCcw, HelpCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTheme } from "@/components/theme-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SETTINGS_SCHEMA, SETTINGS_CATEGORIES } from "./settingsSchema"
import type { SettingCategory, SettingDefinition } from "./settingsSchema"

export type PresetType = "none" | "env"

export interface PresetDefinition {
  id: PresetType
  label: string
  settings: Partial<DiffSettings>
}

export const PRESETS: Record<PresetType, PresetDefinition> = {
  none: {
    id: "none",
    label: "None (Custom)",
    settings: {},
  },
  env: {
    id: "env",
    label: ".env",
    settings: {
      sortKeyValuePairs: true,
      ignoreEmptyLines: true,
      whitespaceSensitive: false,
      trimWhitespace: true,
      lineEndingSensitive: false,
    },
  },
}

export interface DiffSettings {
  sortKeyValuePairs: boolean
  ignoreEmptyLines: boolean
  caseSensitive: boolean
  whitespaceSensitive: boolean
  trimWhitespace: boolean
  lineEndingSensitive: boolean
  ignoreLastLineNewline: boolean
  inlineDiffMode: "char" | "word" | "none"
  autoCompare: number
  showLineNumbers: boolean
  wrapLines: boolean
  scrollLock: boolean
  disableSpellCheck: boolean
  preset: PresetType
  autoDetectPresets: boolean
}

export const DEFAULT_SETTINGS: DiffSettings = {
  sortKeyValuePairs: false,
  ignoreEmptyLines: false,
  caseSensitive: true,
  whitespaceSensitive: true,
  trimWhitespace: false,
  lineEndingSensitive: false,
  ignoreLastLineNewline: false,
  inlineDiffMode: "word",
  autoCompare: -1,
  showLineNumbers: true,
  wrapLines: true,
  scrollLock: true,
  disableSpellCheck: true,
  preset: "none",
  autoDetectPresets: true,
}

export function checkPresetStatus(settings: DiffSettings): DiffSettings {
  const envSettings = PRESETS.env.settings
  const matchesEnv = Object.entries(envSettings).every(
    ([key, val]) => settings[key as keyof DiffSettings] === val
  )

  const expectedPreset = matchesEnv ? "env" : "none"
  if (settings.preset !== expectedPreset) {
    return { ...settings, preset: expectedPreset }
  }
  return settings
}

interface SettingsPanelProps {
  settings: DiffSettings
  onSettingsChange: (settings: DiffSettings) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  activeTab: SettingCategory
  onActiveTabChange: (tab: SettingCategory) => void
  highlightedSettingKey: string | null
  onClearHighlight: () => void
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  isOpen,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  highlightedSettingKey,
  onClearHighlight,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme()

  const updateSetting = <K extends keyof DiffSettings>(
    key: K,
    value: DiffSettings[K]
  ) => {
    onSettingsChange(
      checkPresetStatus({
        ...settings,
        [key]: value,
      })
    )
  }

  const handleReset = () => {
    onSettingsChange(DEFAULT_SETTINGS)
  }

  // Automatically clear highlights after 2 seconds
  React.useEffect(() => {
    if (highlightedSettingKey) {
      const timer = setTimeout(() => {
        onClearHighlight()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightedSettingKey, onClearHighlight])

  // Helper to render an individual setting input based on definition
  const renderSettingItem = (
    item: SettingDefinition,
    isLast: boolean
  ) => {
    const isHighlighted = highlightedSettingKey === item.key

    const itemWrapperClass = `flex items-center justify-between transition-all duration-200 p-2 rounded-lg ${
      isHighlighted ? "animate-pulse-highlight" : ""
    } ${isLast ? "pb-1" : "border-b border-border/40 pb-3"}`

    const isMandated =
      settings.preset !== "none" &&
      PRESETS[settings.preset]?.settings &&
      item.key in PRESETS[settings.preset].settings

    if (item.type === "switch") {
      const checkedValue = settings[item.key as keyof DiffSettings] as boolean

      return (
        <div key={item.key} className={itemWrapperClass}>
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Label
                htmlFor={item.key}
                className="cursor-pointer text-sm font-medium"
              >
                {item.label}
              </Label>
              {isMandated && (
                <span className="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary select-none animate-fade-in shrink-0">
                  Preset Mandated
                </span>
              )}
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[240px] text-xs">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.description && (
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
          <Switch
            id={item.key}
            checked={checkedValue}
            onCheckedChange={(val) =>
              updateSetting(item.key as keyof DiffSettings, val)
            }
          />
        </div>
      )
    }

    if (item.type === "select") {
      const isTheme = item.key === "theme"
      const currentValue = isTheme
        ? theme
        : settings[item.key as keyof DiffSettings]

      return (
        <div key={item.key} className={itemWrapperClass}>
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Label className="text-sm font-medium">{item.label}</Label>
              {isMandated && (
                <span className="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary select-none animate-fade-in shrink-0">
                  Preset Mandated
                </span>
              )}
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[240px] text-xs">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.description && (
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
          <Select
            value={currentValue as string}
            onValueChange={(val) => {
              if (isTheme) {
                setTheme(val as "light" | "dark" | "system")
              } else {
                updateSetting(
                  item.key as keyof DiffSettings,
                  val as DiffSettings[keyof DiffSettings]
                )
              }
            }}
          >
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {item.options.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="cursor-pointer"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (item.type === "number") {
      return (
        <div key={item.key} className={itemWrapperClass}>
          <div className="flex flex-col gap-1 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Label
                htmlFor={item.key}
                className="cursor-pointer text-sm font-medium"
              >
                {item.label}
              </Label>
              {isMandated && (
                <span className="inline-flex items-center rounded-xs bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary select-none animate-fade-in shrink-0">
                  Preset Mandated
                </span>
              )}
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[240px] text-xs">{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {item.description && (
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
          <input
            id={item.key}
            type="number"
            min={item.min ?? -1}
            step={item.step ?? 1}
            value={settings[item.key as keyof DiffSettings] as number}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              updateSetting(
                item.key as keyof DiffSettings,
                isNaN(val) ? -1 : val
              )
            }}
            className="w-24 rounded-md border border-input bg-transparent px-3 py-1.5 text-right font-mono text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer gap-2 shadow-xs"
        onClick={() => {
          onActiveTabChange("comparison")
          onClearHighlight()
          onOpenChange(true)
        }}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Button>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[500px]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Diff Settings</DialogTitle>
            <DialogDescription>
              Configure options for comparing text. Preferences are saved
              automatically.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => onActiveTabChange(val as SettingCategory)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="mx-6 w-[calc(100%-48px)] justify-start border border-border/50 bg-muted/50 p-0.5">
              {SETTINGS_CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="flex-1 cursor-pointer px-4 py-1.5 text-xs sm:flex-initial"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TooltipProvider>
              <ScrollArea className="h-[320px] w-full flex-none px-6 py-4">
                <div className="space-y-4 pr-3.5">
                  {SETTINGS_CATEGORIES.map((cat) => {
                    const categorySettings = SETTINGS_SCHEMA.filter(
                      (item) => item.category === cat.value
                    )
                    return (
                      <TabsContent
                        key={cat.value}
                        value={cat.value}
                        className="mt-0 space-y-4 outline-none"
                      >
                        {categorySettings.map((item, idx) =>
                          renderSettingItem(
                            item,
                            idx === categorySettings.length - 1
                          )
                        )}
                      </TabsContent>
                    )
                  })}
                </div>
              </ScrollArea>
            </TooltipProvider>
          </Tabs>

          <DialogFooter className="flex w-full items-center gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
