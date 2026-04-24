"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
} from "@/types/search";

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

function FilterChip({
  label,
  active,
  onClick,
  activeClassName = "bg-primary text-primary-foreground",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? activeClassName
          : "bg-muted text-foreground border border-border hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  );
}

function ActivePill({ label, onRemove, colorClassName = "bg-primary/10 text-primary" }: { label: string; onRemove: () => void; colorClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${colorClassName} px-2.5 py-1 text-xs font-medium`}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 opacity-70 hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </span>
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

  // Sync with URL changes (e.g. back/forward navigation)
  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => { setWhen(initialWhen); }, [initialWhen]);
  useEffect(() => { setCategory(initialCategory); }, [initialCategory]);
  useEffect(() => { setType(initialType); }, [initialType]);

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

  function toggleWhen(value: WhenFilter) {
    const next = when === value ? undefined : value;
    setWhen(next);
    handleNavigate({ when: next });
  }

  function toggleCategory(value: string) {
    const next = category === value ? "" : value;
    setCategory(next);
    handleNavigate({ category: next });
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search events & churches…"
            className="pl-9 pr-20 rounded-full bg-muted/60 border-0 h-10 text-sm focus-visible:ring-0"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {(query || hasActiveFilters) && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="relative z-40 flex flex-wrap gap-1.5 mt-2 px-1">
          {when && (
            <ActivePill
              label={WHEN_LABELS[when]}
              onRemove={() => { setWhen(undefined); handleNavigate({ when: undefined }); }}
            />
          )}
          {category && (() => {
            const colors = TAG_COLORS[category as Category];
            return (
              <ActivePill
                label={category}
                onRemove={() => { setCategory(""); handleNavigate({ category: "" }); }}
                colorClassName={colors ? `${colors.bg} ${colors.text}` : "bg-primary/10 text-primary"}
              />
            );
          })()}
          {type && type !== "all" && (
            <ActivePill
              label={TYPE_LABELS[type]}
              onRemove={() => { setType("all"); handleNavigate({ type: "all" }); }}
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
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-2xl shadow-lg border border-border p-4 flex flex-col gap-4">
          {/* When */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">When</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {WHEN_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={when === opt.value}
                  onClick={() => toggleWhen(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const colors = TAG_COLORS[cat];
                return (
                  <FilterChip
                    key={cat}
                    label={cat}
                    active={category === cat}
                    onClick={() => toggleCategory(cat)}
                    activeClassName={`${colors.bg} ${colors.text}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Type</p>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={handleTypeChange}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              {TYPE_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} className="flex-1 text-xs">
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
