import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import {
  getActivePresetDefinition,
  getActivePresetOptions,
} from "./settingsEngine"
import type { DiffSettings, PresetOptionValue } from "./settingsEngine"

interface PresetOptionsPopoverProps {
  settings: DiffSettings
  onPresetOptionChange: (key: string, value: PresetOptionValue) => void
}

export function PresetOptionsPopover({
  settings,
  onPresetOptionChange,
}: PresetOptionsPopoverProps) {
  const activePreset = getActivePresetDefinition(settings)
  const optionDefinitions = activePreset?.options ?? []

  if (!activePreset || optionDefinitions.length === 0) {
    return null
  }

  const optionValues = getActivePresetOptions(settings)
  const enabledCount = optionDefinitions.filter(
    (definition) => optionValues[definition.key]
  ).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 cursor-pointer gap-1.5 border-border bg-background text-xs font-semibold shadow-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{activePreset.label} options</span>
          {enabledCount > 0 && (
            <span className="ml-0.5 rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
              {enabledCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 gap-3 p-4">
        <PopoverHeader>
          <PopoverTitle>{activePreset.label} options</PopoverTitle>
          <PopoverDescription>
            Settings that only apply while this preset is active.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col divide-y divide-border/40">
          {optionDefinitions.map((definition) => (
            <div
              key={definition.key}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Label
                  htmlFor={`preset-option-${definition.key}`}
                  className="cursor-pointer text-sm font-medium"
                >
                  {definition.label}
                </Label>
                <span className="text-xs leading-snug text-muted-foreground">
                  {definition.description}
                </span>
              </div>
              <Switch
                id={`preset-option-${definition.key}`}
                size="sm"
                checked={Boolean(optionValues[definition.key])}
                onCheckedChange={(checked) =>
                  onPresetOptionChange(definition.key, checked)
                }
                aria-label={definition.label}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
