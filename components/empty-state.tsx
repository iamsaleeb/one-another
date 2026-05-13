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
      <Icon className="text-muted-foreground/40 h-8 w-8" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
