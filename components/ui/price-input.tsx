"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PriceInputProps {
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
  className?: string;
}

export function PriceInput({ name, defaultValue, disabled, className }: PriceInputProps) {
  const [value, setValue] = useState(
    defaultValue ? parseFloat(defaultValue).toFixed(2) : ""
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Allow only digits and a single decimal point
    if (!/^(\d+\.?\d{0,2}|\.?\d{0,2})$/.test(raw) && raw !== "") return;
    setValue(raw);
  }

  function handleBlur() {
    if (value === "" || value === ".") {
      setValue("");
      return;
    }
    // Normalise to 2 decimal places on blur
    const num = parseFloat(value);
    if (!isNaN(num)) setValue(num.toFixed(2));
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
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0.00"
        disabled={disabled}
        className="flex-1 px-3 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
