"use client";

import { useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

type PriceInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onBlur"
> & {
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
};

export function PriceInput({
  value,
  onChange,
  onBlur,
  className,
  ...props
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
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText>A$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0.00"
      />
    </InputGroup>
  );
}
