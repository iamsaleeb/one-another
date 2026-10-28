"use client";

import { useState } from "react";
import { Church } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChurchCard } from "./church-card";
import { FollowButton } from "./follow-button";

type ActiveFilter = "all" | "following";

const isActiveFilter = (v: string): v is ActiveFilter =>
  v === "all" || v === "following";

interface ChurchListItem {
  id: string;
  name: string;
  photoUrl: string | null;
  address: { suburb: string | null; city: string } | null;
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
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Church />
            </EmptyMedia>
            <EmptyTitle>
              {active === "following"
                ? "You're not following any churches yet"
                : "No churches yet"}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
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
