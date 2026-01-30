"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInputValue, parseNumberFromString } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  id: string;
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  allowNegative?: boolean;
  required?: boolean;
  className?: string;
}

export function CurrencyInput({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  description,
  error,
  allowNegative = false,
  required = false,
  className,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() =>
    value ? formatInputValue(value.toString()) : ""
  );

  // Sync display value when external value changes
  React.useEffect(() => {
    const formatted = value ? formatInputValue(value.toString()) : "";
    setDisplayValue(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Handle negative sign
    const isNegative = allowNegative && inputValue.startsWith("-");
    inputValue = inputValue.replace(/[^0-9]/g, "");
    
    if (!inputValue) {
      setDisplayValue(isNegative ? "-" : "");
      onChange(0);
      return;
    }

    const formatted = formatInputValue(inputValue);
    setDisplayValue(isNegative ? `-${formatted}` : formatted);
    
    const numValue = parseNumberFromString(inputValue) * (isNegative ? -1 : 1);
    onChange(numValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "pr-12 h-12 text-base",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          원
        </span>
      </div>
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
