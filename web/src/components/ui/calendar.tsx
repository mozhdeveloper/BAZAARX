import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  mode: "range" | "single";
  selected: { from: Date | undefined; to: Date | undefined } | Date | undefined;
  onSelect: (data: any) => void;
  disabled?: (date: Date) => boolean;
}

export function Calendar({ mode, selected, onSelect, disabled }: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);

    if (disabled && disabled(clickedDate)) {
      return;
    }

    if (mode === "single") {
      onSelect(clickedDate);
      return;
    }

    const range = selected as { from: Date | undefined; to: Date | undefined };
    if (!range.from || (range.from && range.to)) {
      onSelect({ from: clickedDate, to: undefined });
    } else if (clickedDate < range.from) {
      onSelect({ from: clickedDate, to: range.from });
    } else {
      onSelect({ from: range.from, to: clickedDate });
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (mode === "single") {
      return selected instanceof Date && d.getTime() === selected.getTime();
    }
    const range = selected as { from: Date | undefined; to: Date | undefined };
    if (range.from && d.getTime() === range.from.getTime()) return true;
    if (range.to && d.getTime() === range.to.getTime()) return true;
    return false;
  };

  const isInRange = (day: number) => {
    if (mode !== "range") return false;
    const range = selected as { from: Date | undefined; to: Date | undefined };
    if (!range.from || !range.to) return false;
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    return d > range.from && d < range.to;
  };

  return (
    <div className="p-3 w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}>
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[10px] font-medium text-gray-400 uppercase">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
          const isDisabled = disabled ? disabled(currentDate) : false;
          const selectedStyle = isSelected(day) ? "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent)] hover:text-white hover:font-bold" : "";
          const rangeStyle = isInRange(day) ? "bg-[var(--brand-accent-light)] text-[var(--brand-primary)]" : "";
          const disabledStyle = isDisabled ? "text-gray-300 cursor-not-allowed hover:bg-transparent hover:text-gray-300 hover:font-normal" : "";

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                "h-8 w-8 text-xs rounded-md transition-all hover:bg-[var(--bg-accent-light)] hover:text-[var(--brand-accent)] hover:font-bold",
                selectedStyle,
                rangeStyle,
                disabledStyle
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}