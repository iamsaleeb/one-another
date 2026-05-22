"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  followChurchAction,
  unfollowChurchAction,
} from "@/lib/actions/churches";

interface FollowButtonProps {
  churchId: string;
  isFollowing: boolean;
  isAuthenticated: boolean;
  loginUrl: string;
}

export function FollowButton({
  churchId,
  isFollowing,
  isAuthenticated,
  loginUrl,
}: FollowButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(loginUrl);
      return;
    }
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
