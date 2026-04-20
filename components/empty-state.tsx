import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function EmptyState({ icon: Icon, label, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-8", className)}>
      <Icon className="w-8 h-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
