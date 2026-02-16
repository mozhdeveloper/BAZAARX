import { useState } from "react";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar"; 

interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

export function OrderDateFilter({ onRangeChange }: { onRangeChange: (range: DateRange) => void }) {
  const [activeLabel, setActiveLabel] = useState("All Time");
  const [showCustom, setShowCustom] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const presets = [
    { label: "Today", getValue: () => ({ start: new Date(new Date().setHours(0,0,0,0)), end: new Date() }) },
    { label: "Last 7 Days", getValue: () => ({ start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }) },
    { label: "This Month", getValue: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() }) },
    { label: "All Time", getValue: () => ({ start: null, end: null }) },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setActiveLabel(preset.label);
    setShowCustom(false);
    onRangeChange({ ...preset.getValue(), label: preset.label });
  };

  const handleCustomSubmit = () => {
    if (selectedRange.from && selectedRange.to) {
      const label = `${selectedRange.from.toLocaleDateString()} - ${selectedRange.to.toLocaleDateString()}`;
      setActiveLabel(label);
      onRangeChange({ start: selectedRange.from, end: selectedRange.to, label });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-10 border-gray-200 gap-2 px-3 hover:bg-gray-50">
          <CalendarIcon className="w-4 h-4 text-[#FF5722]" />
          <span className="text-sm font-medium text-gray-700">{activeLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="flex flex-col gap-2">
          {!showCustom ? (
            <>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                    activeLabel === preset.label ? "bg-orange-50 text-[#FF5722]" : "hover:bg-gray-100 text-gray-600"
                  )}
                >
                  {preset.label}
                  {activeLabel === preset.label && <Check className="w-4 h-4" />}
                </button>
              ))}
              <button
                onClick={() => setShowCustom(true)}
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 text-blue-600 font-medium"
              >
                + Custom Range
              </button>
            </>
          ) : (
            <div className="space-y-3">
                <Calendar
                    mode="range"
                    selected={selectedRange}
                    onSelect={(range) => setSelectedRange(range)}
                />
                <div className="flex gap-2 p-2 border-t">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowCustom(false)}>
                    Back
                    </Button>
                    <Button 
                    size="sm" 
                    className="flex-1 bg-[#FF5722] hover:bg-orange-600 text-white"
                    disabled={!selectedRange.from || !selectedRange.to}
                    onClick={handleCustomSubmit}
                    >
                    Apply
                    </Button>
                </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}