"use client";

import { Progress } from "@/components/ui/progress";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export function WizardProgress({ currentStep, totalSteps, stepLabel }: WizardProgressProps) {
  const value = (currentStep / totalSteps) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={value} className="h-2" />
      <p className="text-xs text-muted-foreground">
        Step {currentStep} of {totalSteps} — {stepLabel}
      </p>
    </div>
  );
}
