"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: "기업가치 평가" },
  { number: 2, label: "현금흐름 시뮬레이션" },
  { number: 3, label: "재무제표 분석" },
];

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <div key={step.number} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs text-center",
                    isCurrent ? "font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 rounded",
                    step.number < currentStep ? "bg-primary" : "bg-muted"
                  )}
                  style={{ minWidth: "3rem" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
