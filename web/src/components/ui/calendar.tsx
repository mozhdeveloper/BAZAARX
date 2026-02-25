import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  mode: "range";
  selected: { from: Date | undefined; to: Date | undefined };
  onSelect: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function Calendar({ selected, onSelect }: CalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);

    if (!selected.from || (selected.from && selected.to)) {
      onSelect({ from: clickedDate, to: undefined });
    } else if (clickedDate < selected.from) {
      onSelect({ from: clickedDate, to: selected.from });
    } else {
      onSelect({ from: selected.from, to: clickedDate });
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (selected.from && d.getTime() === selected.from.getTime()) return true;
    if (selected.to && d.getTime() === selected.to.getTime()) return true;
    return false;
  };

  const isInRange = (day: number) => {
    if (!selected.from || !selected.to) return false;
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    return d > selected.from && d < selected.to;
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
          const selectedStyle = isSelected(day) ? "bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent)] hover:text-white hover:font-bold" : "";
          const rangeStyle = isInRange(day) ? "bg-[var(--brand-accent-light)] text-[var(--brand-primary)]" : "";

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={cn(
                "h-8 w-8 text-xs rounded-md transition-all hover:bg-[var(--bg-accent-light)] hover:text-[var(--brand-accent)] hover:font-bold",
                selectedStyle,
                rangeStyle
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