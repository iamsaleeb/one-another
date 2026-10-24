"use client";

import { useState } from "react";
import { Church } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChurchCard } from "./church-card";
import { FollowButton } from "./follow-button";

type ActiveFilter = "all" | "following";

const isActiveFilter = (v: string): v is ActiveFilter =>
  v === "all" || v === "following";

interface ChurchListItem {
  id: string;
  name: string;
  address: string | null;
  photoUrl: string | null;
}

interface ChurchListTabsProps {
  churches: ChurchListItem[];
  followedIds: string[];
  isAuthenticated: boolean;
}

export function ChurchListTabs({
  churches,
  followedIds,
  isAuthenticated,
}: ChurchListTabsProps) {
  const [active, setActive] = useState<ActiveFilter>("all");
  const followed = new Set(followedIds);

  const visible =
    active === "following"
      ? churches.filter((church) => followed.has(church.id))
      : churches;

  return (
    <div className="flex flex-col gap-5">
      {isAuthenticated && (
        <div className="bg-muted/20 sticky top-0 z-10 pt-2 backdrop-blur-sm">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={2}
            value={active}
            onValueChange={(value) => {
              if (isActiveFilter(value)) setActive(value);
            }}
          >
            <ToggleGroupItem
              value="all"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              All
            </ToggleGroupItem>
            <ToggleGroupItem
              value="following"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Following
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Church className="text-muted-foreground/40 size-10" />
          <p className="text-muted-foreground text-sm">
            {active === "following"
              ? "You're not following any churches yet"
              : "No churches yet"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((church, index) => (
            <ChurchCard
              key={church.id}
              church={church}
              priority={index === 0}
              followButton={
                <FollowButton
                  size="sm"
                  churchId={church.id}
                  isFollowing={followed.has(church.id)}
                  isAuthenticated={isAuthenticated}
                  loginUrl={`/login?callbackUrl=/churches&intent=follow&label=${encodeURIComponent(church.name)}`}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
