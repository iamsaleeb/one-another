"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followChurchAction, unfollowChurchAction } from "@/lib/actions/churches";

interface FollowButtonProps {
  churchId: string;
  isFollowing: boolean;
  followerCount: number;
}

export function FollowButton({ churchId, isFollowing, followerCount }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isFollowing) {
        await unfollowChurchAction(churchId);
      } else {
        await followChurchAction(churchId);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        onClick={handleClick}
        disabled={isPending}
        variant={isFollowing ? "outline" : "default"}
        className={isFollowing ? "gap-1.5" : ""}
      >
        {isFollowing && <Check className="size-4" />}
        {isPending ? "..." : isFollowing ? "Following" : "Follow"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {followerCount} {followerCount === 1 ? "follower" : "followers"}
      </span>
    </div>
  );
}
