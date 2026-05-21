import React, { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";

interface Preset {
  label: string;
  getRange: () => { from: Date | undefined; to: Date | undefined };
}

const PRESETS: Preset[] = [
  { label: "Today", getRange: () => { const today = new Date(); return { from: today, to: today }; } },
  { label: "Yesterday", getRange: () => { const yesterday = subDays(new Date(), 1); return { from: yesterday, to: yesterday }; } },
  { label: "Last 7 Days", getRange: () => { return { from: subDays(new Date(), 7), to: new Date() }; } },
  { label: "Last 30 Days", getRange: () => { return { from: subDays(new Date(), 30), to: new Date() }; } },
  { label: "This Month", getRange: () => { const today = new Date(); return { from: startOfMonth(today), to: today }; } },
  { label: "Last Month", getRange: () => { const lastMonth = subMonths(new Date(), 1); return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }; } },
  { label: "This Year", getRange: () => { return { from: startOfYear(new Date()), to: new Date() }; } },
  { label: "All Time", getRange: () => { return { from: undefined, to: undefined }; } },
];

interface DateRangePickerProps {
  dateFrom?: Date | string;
  dateTo?: Date | string;
  onApply: (range: { dateFrom: Date | undefined; dateTo: Date | undefined }) => void;
  placeholder?: string;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onApply,
  placeholder = "Pick a date range",
  align = "start",
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date | undefined>(undefined);
  const [tempDateTo, setTempDateTo] = useState<Date | undefined>(undefined);
  const [activePreset, setActivePreset] = useState("Custom Range");

  useEffect(() => {
    if (isOpen) {
      setTempDateFrom(dateFrom ? new Date(dateFrom) : undefined);
      setTempDateTo(dateTo ? new Date(dateTo) : undefined);
      if (!dateFrom && !dateTo) {
        setActivePreset("All Time");
      } else {
        setActivePreset("Custom Range");
      }
    }
  }, [isOpen, dateFrom, dateTo]);

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getRange();
    setTempDateFrom(range.from);
    setTempDateTo(range.to);
    setActivePreset(preset.label);
  };

  const handleCalendarSelect = (range: { from: Date | undefined; to?: Date | undefined } | undefined) => {
    setTempDateFrom(range?.from);
    setTempDateTo(range?.to);
    setActivePreset("Custom Range");
  };

  const handleApply = () => {
    onApply({ dateFrom: tempDateFrom, dateTo: tempDateTo });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onApply({ dateFrom: undefined, dateTo: undefined });
  };

  let displayString = placeholder;
  if (dateFrom && dateTo) {
    displayString = `${format(new Date(dateFrom), "MMM dd, yyyy")} – ${format(new Date(dateTo), "MMM dd, yyyy")}`;
  } else if (dateFrom) {
    displayString = `${format(new Date(dateFrom), "MMM dd, yyyy")} – ...`;
  } else if (dateTo) {
    displayString = `... – ${format(new Date(dateTo), "MMM dd, yyyy")}`;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`justify-start text-left font-normal bg-accent/50 rounded-2xl border border-border/30 h-9 px-3 ${!dateFrom && !dateTo ? 'text-muted-foreground' : 'text-foreground'} ${className}`}
        >
          <CalendarIcon className="mr-2 size-4 opacity-70" />
          <span className="truncate pr-4">{displayString}</span>

          {(dateFrom || dateTo) && (
            <span
              className="absolute right-2.5 p-0.5 rounded-full bg-muted/60 hover:bg-muted cursor-pointer transition-colors"
              onClick={handleClear}
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-lg border border-border/40" align={align}>
        <div className="flex flex-col sm:flex-row">
          <div className="border-r border-border/20 p-3 flex flex-col gap-1 min-w-[150px] bg-muted/20">
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.label;
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`justify-start text-xs h-8 rounded-lg font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              );
            })}

            <Button
              variant={activePreset === "Custom Range" ? "default" : "ghost"}
              size="sm"
              className={`justify-start text-xs h-8 rounded-lg font-medium transition-colors mt-auto ${activePreset === "Custom Range" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              onClick={() => setActivePreset("Custom Range")}
            >
              Custom Range
            </Button>
          </div>

          <div className="flex flex-col">
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={tempDateFrom || new Date()}
                selected={tempDateFrom && tempDateTo ? { from: tempDateFrom, to: tempDateTo } : tempDateFrom ? { from: tempDateFrom } : undefined}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
                className="p-0"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3 border-t border-border/20 bg-muted/10">
              <div className="text-xs text-muted-foreground hidden sm:block font-medium">
                {(tempDateFrom && tempDateTo) ? (
                  `${format(tempDateFrom, "yyyy-MM-dd")} - ${format(tempDateTo, "yyyy-MM-dd")}`
                ) : tempDateFrom ? (
                  `${format(tempDateFrom, "yyyy-MM-dd")} - Select end date`
                ) : (
                  "No dates selected"
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none h-8 rounded-lg">
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  className="flex-1 sm:flex-none h-8 rounded-lg shadow-sm"
                  disabled={!!(tempDateFrom && !tempDateTo)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
