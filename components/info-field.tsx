import React from "react";
import { cn } from "@/lib/utils";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

interface InfoFieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  iconClassName?: string;
  className?: string;
}

export function InfoField({
  icon: Icon,
  label,
  children,
  iconClassName,
  className,
}: InfoFieldProps) {
  return (
    <Item className={cn("items-start gap-3 p-0", className)}>
      <ItemMedia>
        <Icon className={iconClassName ?? "text-primary size-4"} />
      </ItemMedia>
      <ItemContent className="gap-0.5">
        <ItemDescription className="text-xs">{label}</ItemDescription>
        <ItemTitle>{children}</ItemTitle>
      </ItemContent>
    </Item>
  );
}
