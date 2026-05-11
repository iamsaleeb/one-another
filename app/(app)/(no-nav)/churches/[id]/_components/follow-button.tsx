"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followChurchAction, unfollowChurchAction } from "@/lib/actions/churches";

interface FollowButtonProps {
  churchId: string;
  isFollowing: boolean;
}

export function FollowButton({ churchId, isFollowing }: FollowButtonProps) {
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
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "gap-1.5" : ""}
    >
      {isFollowing && <Check className="size-4" />}
      {isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
