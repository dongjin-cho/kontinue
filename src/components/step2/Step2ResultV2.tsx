"use client";

import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Step2V2Result } from "@/lib/simulations/types_v2";

interface Step2ResultV2Props {
  result: Step2V2Result;
}

export function Step2ResultV2({ result }: Step2ResultV2Props) {
  // 경고만 표시 (상세 분석은 시나리오별로 표시됨)
  return (
    <div className="space-y-6">
      {/* 경고 */}
      {result.warnings && result.warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <ul className="list-disc list-inside space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
