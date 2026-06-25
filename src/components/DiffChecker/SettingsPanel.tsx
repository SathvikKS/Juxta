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

export interface DiffSettings {
  caseSensitive: boolean;
  whitespaceSensitive: boolean;
  trimWhitespace: boolean;
  lineEndingSensitive: boolean;
  inlineDiffMode: "char" | "word" | "none";
  autoCompare: boolean;
  showLineNumbers: boolean;
  wrapLines: boolean;
}

export const DEFAULT_SETTINGS: DiffSettings = {
  caseSensitive: true,
  whitespaceSensitive: true,
  trimWhitespace: false,
  lineEndingSensitive: false,
  inlineDiffMode: "char",
  autoCompare: true,
  showLineNumbers: true,
  wrapLines: true,
}

interface SettingsPanelProps {
  settings: DiffSettings
  onSettingsChange: (settings: DiffSettings) => void
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)

  const updateSetting = <K extends keyof DiffSettings>(key: K, value: DiffSettings[K]) => {
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
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer shadow-xs">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Diff Settings</DialogTitle>
          <DialogDescription>
            Configure options for comparing text. Preferences are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <div className="grid gap-5 py-4">
            {/* Case Sensitive */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="caseSensitive" className="text-sm font-medium cursor-pointer">
                    Case Sensitive
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        When enabled, "A" and "a" will be treated as different. If disabled, casing difference is ignored.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">Distinguish uppercase and lowercase</span>
              </div>
              <Switch
                id="caseSensitive"
                checked={settings.caseSensitive}
                onCheckedChange={(val) => updateSetting("caseSensitive", val)}
              />
            </div>

            {/* Whitespace Sensitive */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="whitespaceSensitive" className="text-sm font-medium cursor-pointer">
                    Whitespace Sensitive
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        When enabled, changes in spaces or tabs are highlighted. If disabled, leading and trailing whitespaces are ignored.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">Highlight changes in spacing and tabs</span>
              </div>
              <Switch
                id="whitespaceSensitive"
                checked={settings.whitespaceSensitive}
                onCheckedChange={(val) => updateSetting("whitespaceSensitive", val)}
              />
            </div>

            {/* Trim Whitespace */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="trimWhitespace" className="text-sm font-medium cursor-pointer">
                    Trim Whitespace
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        When enabled, whitespaces at the end of lines are automatically stripped before running the comparison.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">Automatically strip trailing spaces on lines</span>
              </div>
              <Switch
                id="trimWhitespace"
                checked={settings.trimWhitespace}
                onCheckedChange={(val) => updateSetting("trimWhitespace", val)}
              />
            </div>

            {/* CR / LF / CRLF Line Ending Sensitive */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="lineEndingSensitive" className="text-sm font-medium cursor-pointer">
                    Line Ending Sensitive (CR/LF)
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        When enabled, differences between Windows line endings (\r\n) and Unix line endings (\n) are treated as diffs. If disabled, line endings are normalized.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">Compare carriage returns and line feeds</span>
              </div>
              <Switch
                id="lineEndingSensitive"
                checked={settings.lineEndingSensitive}
                onCheckedChange={(val) => updateSetting("lineEndingSensitive", val)}
              />
            </div>

            {/* Inline Diff Mode */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm font-medium">Inline Diff Highlighting</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        Select how to highlight specific edits within modified lines. Character-level is most detailed, while Word-level is cleaner for text paragraphs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">How details inside lines are highlighted</span>
              </div>
              <Select
                value={settings.inlineDiffMode}
                onValueChange={(val) => updateSetting("inlineDiffMode", val as "char" | "word" | "none")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="char">Character-level</SelectItem>
                  <SelectItem value="word">Word-level</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Compare */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="autoCompare" className="text-sm font-medium cursor-pointer">
                    Auto-Compare
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[240px] text-xs">
                        When enabled, the comparison updates immediately as you type (debounced). When disabled, you must click the Compare button.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-xs text-muted-foreground">Run diff automatically on input change</span>
              </div>
              <Switch
                id="autoCompare"
                checked={settings.autoCompare}
                onCheckedChange={(val) => updateSetting("autoCompare", val)}
              />
            </div>

            {/* Show Line Numbers */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <Label htmlFor="showLineNumbers" className="text-sm font-medium cursor-pointer">
                  Show Line Numbers
                </Label>
                <span className="text-xs text-muted-foreground">Show line counts in visual diff pane</span>
              </div>
              <Switch
                id="showLineNumbers"
                checked={settings.showLineNumbers}
                onCheckedChange={(val) => updateSetting("showLineNumbers", val)}
              />
            </div>

            {/* Wrap Lines */}
            <div className="flex items-center justify-between border-b pb-3 border-border/40">
              <div className="flex flex-col gap-1 pr-4">
                <Label htmlFor="wrapLines" className="text-sm font-medium cursor-pointer">
                  Wrap Lines
                </Label>
                <span className="text-xs text-muted-foreground">Soft-wrap lines that overflow the container</span>
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
                <span className="text-xs text-muted-foreground">Select color appearance style</span>
              </div>
              <Select
                value={theme}
                onValueChange={(val) => setTheme(val as "light" | "dark" | "system")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter className="flex sm:justify-between items-center w-full gap-2 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={() => setIsOpen(false)} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
