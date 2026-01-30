"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { KSIC_CATEGORIES, INDUSTRY_OPTIONS, type IndustryGroup } from "@/lib/valuation/constants";

interface IndustrySelectProps {
  ksicCode: string;
  industryGroup: IndustryGroup | undefined;
  inputMode: "ksic" | "direct";
  onKsicChange: (code: string) => void;
  onIndustryGroupChange: (group: IndustryGroup) => void;
  onInputModeChange: (mode: "ksic" | "direct") => void;
}

export function IndustrySelect({
  ksicCode,
  industryGroup,
  inputMode,
  onKsicChange,
  onIndustryGroupChange,
  onInputModeChange,
}: IndustrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedKsic = KSIC_CATEGORIES.find((cat) => cat.code === ksicCode);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">산업 분류</Label>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => onInputModeChange("ksic")}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              inputMode === "ksic"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            KSIC 코드
          </button>
          <button
            type="button"
            onClick={() => onInputModeChange("direct")}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              inputMode === "direct"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            직접 선택
          </button>
        </div>
      </div>

      {inputMode === "ksic" ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-12"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {selectedKsic ? (
                  <span>
                    {selectedKsic.code} - {selectedKsic.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">산업 분류 선택...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="산업 분류 검색..." />
              <CommandList>
                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                <CommandGroup>
                  {KSIC_CATEGORIES.map((cat) => (
                    <CommandItem
                      key={cat.code}
                      value={`${cat.code} ${cat.name}`}
                      onSelect={() => {
                        onKsicChange(cat.code);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          ksicCode === cat.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono mr-2">{cat.code}</span>
                      <span>{cat.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <RadioGroup
          value={industryGroup}
          onValueChange={(value) => onIndustryGroupChange(value as IndustryGroup)}
          className="grid grid-cols-2 gap-2"
        >
          {INDUSTRY_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroupItem
                value={option.value}
                id={`industry-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`industry-${option.value}`}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 text-sm font-medium transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                )}
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
