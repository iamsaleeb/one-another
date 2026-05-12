"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PriceInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function PriceInput({ value, onChange, onBlur, name, disabled, className }: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (!value) return "";
    const num = parseFloat(value);
    return isNaN(num) ? "" : num.toFixed(2);
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!/^(\d+\.?\d{0,2}|\.?\d{0,2})$/.test(raw) && raw !== "") return;
    setDisplayValue(raw);
    onChange?.(raw);
  }

  function handleBlur() {
    if (displayValue === "" || displayValue === ".") {
      setDisplayValue("");
      onChange?.("");
    } else {
      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        const normalized = num.toFixed(2);
        setDisplayValue(normalized);
        onChange?.(normalized);
      }
    }
    onBlur?.();
  }

  return (
    <div className={cn("flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
      <span className="flex items-center px-3 text-muted-foreground border-r border-input bg-muted rounded-l-md select-none">
        A$
      </span>
      <input
        name={name}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0.00"
        disabled={disabled}
        className="flex-1 px-3 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
