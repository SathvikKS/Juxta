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
  DialogTrigger,
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

export interface DiffSettings {
  caseSensitive: boolean
  whitespaceSensitive: boolean
  trimWhitespace: boolean
  lineEndingSensitive: boolean
  inlineDiffMode: "char" | "word" | "none"
  autoCompare: number
  showLineNumbers: boolean
  wrapLines: boolean
  scrollLock: boolean
}

export const DEFAULT_SETTINGS: DiffSettings = {
  caseSensitive: true,
  whitespaceSensitive: true,
  trimWhitespace: false,
  lineEndingSensitive: false,
  inlineDiffMode: "char",
  autoCompare: -1,
  showLineNumbers: true,
  wrapLines: true,
  scrollLock: true,
}

interface SettingsPanelProps {
  settings: DiffSettings
  onSettingsChange: (settings: DiffSettings) => void
}

export function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)

  const updateSetting = <K extends keyof DiffSettings>(
    key: K,
    value: DiffSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
  }

  const handleReset = () => {
    onSettingsChange(DEFAULT_SETTINGS)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-2 shadow-xs"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Diff Settings</DialogTitle>
          <DialogDescription>
            Configure options for comparing text. Preferences are saved
            automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="comparison"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-6 w-[calc(100%-48px)] justify-start border border-border/50 bg-muted/50 p-0.5">
            <TabsTrigger
              value="comparison"
              className="flex-1 cursor-pointer px-4 py-1.5 text-xs sm:flex-initial"
            >
              Comparison
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              className="flex-1 cursor-pointer px-4 py-1.5 text-xs sm:flex-initial"
            >
              Editor & View
            </TabsTrigger>
            <TabsTrigger
              value="behavior"
              className="flex-1 cursor-pointer px-4 py-1.5 text-xs sm:flex-initial"
            >
              Behavior
            </TabsTrigger>
          </TabsList>

          <TooltipProvider>
            <ScrollArea className="h-[320px] w-full flex-none px-6 py-4">
              <div className="space-y-4 pr-3.5">
                <TabsContent
                  value="comparison"
                  className="mt-0 space-y-4 outline-none"
                >
                  {/* Case Sensitive */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="caseSensitive"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Case Sensitive
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              When enabled, "A" and "a" will be treated as
                              different. If disabled, casing difference is
                              ignored.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Distinguish uppercase and lowercase
                      </span>
                    </div>
                    <Switch
                      id="caseSensitive"
                      checked={settings.caseSensitive}
                      onCheckedChange={(val) =>
                        updateSetting("caseSensitive", val)
                      }
                    />
                  </div>

                  {/* Whitespace Sensitive */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="whitespaceSensitive"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Whitespace Sensitive
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              When enabled, changes in spaces or tabs are
                              highlighted. If disabled, leading and trailing
                              whitespaces are ignored.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Highlight changes in spacing and tabs
                      </span>
                    </div>
                    <Switch
                      id="whitespaceSensitive"
                      checked={settings.whitespaceSensitive}
                      onCheckedChange={(val) =>
                        updateSetting("whitespaceSensitive", val)
                      }
                    />
                  </div>

                  {/* Trim Whitespace */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="trimWhitespace"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Trim Whitespace
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              When enabled, whitespaces at the end of lines are
                              automatically stripped before running the
                              comparison.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Automatically strip trailing spaces on lines
                      </span>
                    </div>
                    <Switch
                      id="trimWhitespace"
                      checked={settings.trimWhitespace}
                      onCheckedChange={(val) =>
                        updateSetting("trimWhitespace", val)
                      }
                    />
                  </div>

                  {/* CR / LF / CRLF Line Ending Sensitive */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="lineEndingSensitive"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Line Ending Sensitive (CR/LF)
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              When enabled, differences between Windows line
                              endings (\r\n) and Unix line endings (\n) are
                              treated as diffs. If disabled, line endings are
                              normalized.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Compare carriage returns and line feeds
                      </span>
                    </div>
                    <Switch
                      id="lineEndingSensitive"
                      checked={settings.lineEndingSensitive}
                      onCheckedChange={(val) =>
                        updateSetting("lineEndingSensitive", val)
                      }
                    />
                  </div>

                  {/* Inline Diff Mode */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-sm font-medium">
                          Inline Diff Highlighting
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              Select how to highlight specific edits within
                              modified lines. Character-level is most detailed,
                              while Word-level is cleaner for text paragraphs.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        How details inside lines are highlighted
                      </span>
                    </div>
                    <Select
                      value={settings.inlineDiffMode}
                      onValueChange={(val) =>
                        updateSetting(
                          "inlineDiffMode",
                          val as "char" | "word" | "none"
                        )
                      }
                    >
                      <SelectTrigger className="w-[140px] cursor-pointer">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="char" className="cursor-pointer">
                          Character-level
                        </SelectItem>
                        <SelectItem value="word" className="cursor-pointer">
                          Word-level
                        </SelectItem>
                        <SelectItem value="none" className="cursor-pointer">
                          None
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent
                  value="editor"
                  className="mt-0 space-y-4 outline-none"
                >
                  {/* Scroll Lock */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="scrollLock"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Sync Scrolling (Scroll Lock)
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              When enabled, scrolling either column will scroll
                              the other at the same time to keep the comparison
                              aligned.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Keep split view scrolling synchronized
                      </span>
                    </div>
                    <Switch
                      id="scrollLock"
                      checked={settings.scrollLock}
                      onCheckedChange={(val) =>
                        updateSetting("scrollLock", val)
                      }
                    />
                  </div>

                  {/* Show Line Numbers */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <Label
                        htmlFor="showLineNumbers"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Show Line Numbers
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Show line counts in visual diff pane
                      </span>
                    </div>
                    <Switch
                      id="showLineNumbers"
                      checked={settings.showLineNumbers}
                      onCheckedChange={(val) =>
                        updateSetting("showLineNumbers", val)
                      }
                    />
                  </div>

                  {/* Wrap Lines */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <Label
                        htmlFor="wrapLines"
                        className="cursor-pointer text-sm font-medium"
                      >
                        Wrap Lines
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Soft-wrap lines that overflow the container
                      </span>
                    </div>
                    <Switch
                      id="wrapLines"
                      checked={settings.wrapLines}
                      onCheckedChange={(val) => updateSetting("wrapLines", val)}
                    />
                  </div>

                  {/* Theme Selection */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex flex-col gap-1 pr-4">
                      <Label className="text-sm font-medium">Color Theme</Label>
                      <span className="text-xs text-muted-foreground">
                        Select color appearance style
                      </span>
                    </div>
                    <Select
                      value={theme}
                      onValueChange={(val) =>
                        setTheme(val as "light" | "dark" | "system")
                      }
                    >
                      <SelectTrigger className="w-[140px] cursor-pointer">
                        <SelectValue placeholder="Theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light" className="cursor-pointer">
                          Light
                        </SelectItem>
                        <SelectItem value="dark" className="cursor-pointer">
                          Dark
                        </SelectItem>
                        <SelectItem value="system" className="cursor-pointer">
                          System
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent
                  value="behavior"
                  className="mt-0 space-y-4 outline-none"
                >
                  {/* Auto Compare */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Label
                          htmlFor="autoCompare"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Auto-Compare (ms)
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[240px] text-xs">
                              Set to -1 to disable auto-compare. Set to 0 for instant comparison. Any value greater than 0 defines the debounce delay in milliseconds.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        -1: manual, 0: instant, &gt;0: debounce delay
                      </span>
                    </div>
                    <input
                      id="autoCompare"
                      type="number"
                      min="-1"
                      step="50"
                      value={settings.autoCompare}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        updateSetting("autoCompare", isNaN(val) ? -1 : val)
                      }}
                      className="w-24 rounded-md border border-input bg-transparent px-3 py-1.5 text-right font-mono text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </TabsContent>
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
            onClick={() => setIsOpen(false)}
            className="cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
