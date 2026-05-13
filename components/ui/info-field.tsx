import React from "react";

interface InfoFieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  iconClassName?: string;
}

export function InfoField({
  icon: Icon,
  label,
  children,
  iconClassName,
}: InfoFieldProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className={iconClassName ?? "text-primary mt-0.5 h-4 w-4 shrink-0"}
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
