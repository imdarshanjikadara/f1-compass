import React, { useState, useEffect, useRef } from 'react';
import {
  formatDisplayDate,
  getTodayLocal,
  parseFlexibleUserDate,
  parseLocalDate,
  toDateInputString,
} from '../utils/dateRules';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerInputProps {
  id?: string;
  value: string;
  onChange: (newDateStr: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const YEAR_OPTIONS = Array.from({ length: 21 }, (_, idx) => 2018 + idx); // 2018..2038

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
  placeholder = 'Oct 9, 2026 or MM/DD/YYYY',
  size = 'md',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const parsedValueDate = parseLocalDate(value);
  const formattedValue = parsedValueDate ? formatDisplayDate(value) : '';

  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState(formattedValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  // Calendar view state (year & 0-indexed month)
  const initialRefDate = parsedValueDate || getTodayLocal();
  const [viewYear, setViewYear] = useState<number>(initialRefDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialRefDate.getMonth());

  // Detect touch/mobile pointer so tapping on mobile opens the clean calendar without covering the screen with the OS keyboard
  useEffect(() => {
    try {
      const mql = window.matchMedia('(pointer: coarse)');
      setIsCoarsePointer(mql.matches);
      const listener = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    } catch {
      // Ignore
    }
  }, []);

  // Keep displayed text in sync with external value when not actively typing
  useEffect(() => {
    const dt = parseLocalDate(value);
    const nextFormatted = dt ? formatDisplayDate(value) : '';
    if (!isFocused) {
      setTextValue(nextFormatted);
    } else if (dt) {
      // Also update textValue if value was programmatically auto-filled (e.g. EAD End Date)
      setTextValue(nextFormatted);
    }
    if (dt) {
      setViewYear(dt.getFullYear());
      setViewMonth(dt.getMonth());
    }
  }, [value, isFocused]);

  // Close calendar popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenCalendar = () => {
    if (disabled) return;
    const dt = parseLocalDate(value) || getTodayLocal();
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth());
    setIsOpen(true);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    if (raw.trim() === '') {
      onChange('');
      return;
    }

    const parsedIso = parseFlexibleUserDate(raw);
    if (parsedIso) {
      const dt = parseLocalDate(parsedIso);
      if (dt) {
        setViewYear(dt.getFullYear());
        setViewMonth(dt.getMonth());
      }
      onChange(parsedIso);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = textValue.trim();
    if (!trimmed) {
      if (value) onChange('');
      setTextValue('');
      return;
    }

    const parsedIso = parseFlexibleUserDate(trimmed);
    if (parsedIso) {
      onChange(parsedIso);
      setTextValue(formatDisplayDate(parsedIso));
    } else {
      // Revert to last valid formatted date if user left an incomplete string
      setTextValue(formattedValue);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsedIso = parseFlexibleUserDate(textValue);
      if (parsedIso) {
        e.preventDefault();
        onChange(parsedIso);
        setTextValue(formatDisplayDate(parsedIso));
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const handleSelectDay = (dayNumber: number) => {
    const selectedDt = new Date(viewYear, viewMonth, dayNumber, 12, 0, 0, 0);
    const isoStr = toDateInputString(selectedDt);
    onChange(isoStr);
    setTextValue(formatDisplayDate(isoStr));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectToday = () => {
    const today = getTodayLocal();
    const isoStr = toDateInputString(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onChange(isoStr);
    setTextValue(formatDisplayDate(isoStr));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setTextValue('');
    setIsOpen(false);
  };

  // Build calendar grid for (viewYear, viewMonth)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toDateInputString(getTodayLocal());

  const dayCells: Array<number | null> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push(d);
  }

  const paddingClasses =
    size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm';

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <div className="relative flex items-center w-full min-w-0">
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode={isCoarsePointer ? 'none' : 'text'}
          readOnly={isCoarsePointer}
          required={required}
          disabled={disabled}
          value={textValue}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setIsFocused(true);
            handleOpenCalendar();
          }}
          onClick={() => {
            if (!isOpen) handleOpenCalendar();
          }}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDownInput}
          className={`block w-full min-w-0 max-w-full box-border pr-10 ${paddingClasses} font-mono-tabular bg-white dark:bg-slate-950 border rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50 cursor-pointer sm:cursor-text ${
            hasError
              ? 'border-red-500 dark:border-red-500'
              : isOpen
              ? 'border-teal-600 dark:border-teal-500 ring-2 ring-teal-600/20'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        />

        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpenCalendar();
            }
          }}
          aria-label="Toggle calendar date picker"
          className="absolute right-2 p-1.5 text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 rounded-md transition-colors disabled:opacity-40"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className="absolute left-0 right-0 sm:right-auto z-50 mt-1.5 w-full sm:w-72 bg-white dark:bg-[#111921] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3.5 space-y-3 select-none"
        >
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
              <select
                aria-label="Select month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="px-2 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName.slice(0, 3)}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 text-xs font-mono-tabular font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                {!YEAR_OPTIONS.includes(viewYear) && (
                  <option value={viewYear}>{viewYear}</option>
                )}
                {YEAR_OPTIONS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center">
            {WEEKDAY_LABELS.map((dayLabel) => (
              <span
                key={dayLabel}
                className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-0.5"
              >
                {dayLabel}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {dayCells.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const cellIso = `${viewYear}-${String(viewMonth + 1).padStart(
                2,
                '0'
              )}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = cellIso === value;
              const isToday = cellIso === todayIso;

              return (
                <button
                  key={cellIso}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-full rounded-lg text-xs font-mono-tabular font-medium transition-colors flex items-center justify-center ${
                    isSelected
                      ? 'bg-teal-700 dark:bg-teal-600 text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-teal-600 dark:border-teal-400 text-teal-700 dark:text-teal-300 font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/50'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions: Clear & Today + Manual Typing Hint on Laptop */}
          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded transition-colors"
            >
              Clear
            </button>

            <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500">
              Click date or type above
            </span>

            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
