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

export function PriceInput({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  className,
}: PriceInputProps) {
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
    <div
      className={cn(
        "border-input bg-background ring-offset-background focus-within:ring-ring flex h-10 w-full rounded-md border text-sm focus-within:ring-2 focus-within:ring-offset-2",
        className
      )}
    >
      <span className="text-muted-foreground border-input bg-muted flex items-center rounded-l-md border-r px-3 select-none">
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
        className="placeholder:text-muted-foreground flex-1 bg-transparent px-3 outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
