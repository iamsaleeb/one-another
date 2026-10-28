"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CATEGORY_OPTIONS,
  WHEN_LABELS,
  WHEN_OPTIONS,
  TYPE_LABELS,
  TYPE_OPTIONS,
  TAG_COLORS,
  type WhenFilter,
  type TypeFilter,
  type Category,
} from "@/lib/types/search";

interface SearchBarProps {
  initialQuery?: string;
  initialWhen?: WhenFilter;
  initialCategory?: string;
  initialType?: TypeFilter;
}

interface SearchOverrides {
  query?: string;
  when?: WhenFilter | undefined;
  category?: string;
  type?: TypeFilter;
}

// Filter chips: a selected chip is filled; selecting it again clears it.
const chipClassName =
  "h-auto min-w-0 shrink-0 rounded-full border px-3 py-1.5 text-xs data-[state=on]:border-transparent";

function ActivePill({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <Badge variant="soft" className={cn("gap-0.5 pr-0.5", className)}>
      {label}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="size-4 rounded-full opacity-70 hover:bg-transparent hover:opacity-100"
      >
        <X />
      </Button>
    </Badge>
  );
}

export function SearchBar({
  initialQuery = "",
  initialWhen,
  initialCategory = "",
  initialType = "all",
}: SearchBarProps) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<WhenFilter | undefined>(initialWhen);
  const [category, setCategory] = useState(initialCategory);
  const [type, setType] = useState<TypeFilter>(initialType);

  // Sync with URL changes (e.g. back/forward navigation). Adjusting state
  // during render avoids the extra render pass a syncing effect would cause.
  const initial = { initialQuery, initialWhen, initialCategory, initialType };
  const [prevInitial, setPrevInitial] = useState(initial);
  if (
    prevInitial.initialQuery !== initialQuery ||
    prevInitial.initialWhen !== initialWhen ||
    prevInitial.initialCategory !== initialCategory ||
    prevInitial.initialType !== initialType
  ) {
    setPrevInitial(initial);
    if (prevInitial.initialQuery !== initialQuery) setQuery(initialQuery);
    if (prevInitial.initialWhen !== initialWhen) setWhen(initialWhen);
    if (prevInitial.initialCategory !== initialCategory)
      setCategory(initialCategory);
    if (prevInitial.initialType !== initialType) setType(initialType);
  }

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function buildUrl(overrides: SearchOverrides) {
    const q = overrides.query ?? query;
    const w = "when" in overrides ? overrides.when : when;
    const cat = "category" in overrides ? overrides.category : category;
    const t = overrides.type ?? type;

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (t && t !== "all") params.set("type", t);
    if (cat) params.set("category", cat);
    if (w) params.set("when", w);

    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function handleNavigate(overrides: SearchOverrides = {}) {
    router.push(buildUrl(overrides));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    handleNavigate();
  }

  function handleClear() {
    setQuery("");
    setWhen(undefined);
    setCategory("");
    setType("all");
    setOpen(false);
    router.push("/");
  }

  // A single ToggleGroup reports "" when its selected item is pressed again.
  function handleWhenChange(value: string) {
    const next = (value as WhenFilter) || undefined;
    setWhen(next);
    handleNavigate({ when: next });
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    handleNavigate({ category: value });
  }

  function handleTypeChange(value: string) {
    const next = (value as TypeFilter) || "all";
    setType(next);
    handleNavigate({ type: next });
  }

  const hasActiveFilters = !!when || !!category || (!!type && type !== "all");

  return (
    <div className="relative w-full">
      {/* Search input row — z-40 keeps it above the backdrop */}
      <form onSubmit={handleSubmit} className="relative z-40">
        <InputGroup className="bg-muted/60 h-10 rounded-full border-0 shadow-none has-[[data-slot=input-group-control]:focus-visible]:ring-0">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search events & churches…"
          />
          <InputGroupAddon align="inline-end" className="pr-1">
            {(query || hasActiveFilters) && (
              <InputGroupButton
                size="icon-xs"
                onClick={handleClear}
                className="rounded-full"
                aria-label="Clear search"
              >
                <X />
              </InputGroupButton>
            )}
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="rounded-full"
              aria-label="Search"
            >
              <Search />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="relative z-40 mt-2 flex flex-wrap gap-1.5 px-1">
          {when && (
            <ActivePill
              label={WHEN_LABELS[when]}
              onRemove={() => {
                setWhen(undefined);
                handleNavigate({ when: undefined });
              }}
            />
          )}
          {category &&
            (() => {
              const colors = TAG_COLORS[category as Category];
              return (
                <ActivePill
                  label={category}
                  onRemove={() => {
                    setCategory("");
                    handleNavigate({ category: "" });
                  }}
                  className={colors && `${colors.bg} ${colors.text}`}
                />
              );
            })()}
          {type && type !== "all" && (
            <ActivePill
              label={TYPE_LABELS[type]}
              onRemove={() => {
                setType("all");
                handleNavigate({ type: "all" });
              }}
            />
          )}
        </div>
      )}

      {/* Backdrop — intercepts clicks outside the dropdown so they don't trigger other elements */}
      {open && (
        <div
          data-testid="search-backdrop"
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="border-border bg-popover text-popover-foreground absolute top-full right-0 left-0 z-40 mt-1 flex flex-col gap-4 rounded-2xl border p-4 shadow-lg">
          {/* When */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              When
            </p>
            <ToggleGroup
              type="single"
              value={when ?? ""}
              onValueChange={handleWhenChange}
              spacing={2}
              className="w-full overflow-x-auto pb-0.5"
            >
              {WHEN_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    chipClassName,
                    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  )}
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Category */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Category
            </p>
            <ToggleGroup
              type="single"
              value={category}
              onValueChange={handleCategoryChange}
              spacing={2}
              className="flex-wrap"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <ToggleGroupItem
                  key={cat}
                  value={cat}
                  className={cn(chipClassName, TAG_COLORS[cat].on)}
                >
                  {cat}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Type */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Type
            </p>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={handleTypeChange}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              {TYPE_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className="flex-1 text-xs"
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      )}
    </div>
  );
}
