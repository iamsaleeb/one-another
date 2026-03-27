"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followSeriesAction, unfollowSeriesAction } from "@/lib/actions/series";

interface FollowSeriesButtonProps {
  seriesId: string;
  isFollowing: boolean;
  followerCount: number;
}

export function FollowSeriesButton({ seriesId, isFollowing, followerCount }: FollowSeriesButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(isFollowing);

  const displayCount = optimisticFollowing !== isFollowing
    ? optimisticFollowing ? followerCount + 1 : followerCount - 1
    : followerCount;

  function handleClick() {
    startTransition(async () => {
      setOptimisticFollowing(!optimisticFollowing);
      if (optimisticFollowing) {
        await unfollowSeriesAction(seriesId);
      } else {
        await followSeriesAction(seriesId);
      }
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-2px_31px_0px_#0000001A] pb-safe">
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Followers</p>
          <p className="text-base font-bold">{displayCount}</p>
        </div>

        <Button
          onClick={handleClick}
          disabled={isPending}
          variant={optimisticFollowing ? "outline" : "default"}
          className={optimisticFollowing ? "gap-1.5" : ""}
        >
          {optimisticFollowing && <Check className="size-4" />}
          {optimisticFollowing ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
}
