import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { AccessRequestStatus } from "@prisma/client";
import { ROLE_LABELS } from "@/domains/access-requests/lib/labels";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  APPROVED: "default",
  DENIED: "destructive",
  CANCELLED: "secondary",
  REVOKED: "secondary",
};

interface Props {
  href: string;
  requester: { name: string | null; image: string | null };
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  status: AccessRequestStatus;
}

export function HelperSummaryRow({
  href,
  requester,
  requestedRole,
  message,
  createdAt,
  status,
}: Props) {
  const initials = requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[requestedRole] ?? requestedRole;

  return (
    <Item asChild size="sm" className="-mx-2 flex-nowrap gap-3 px-2">
      <Link href={href}>
        <ItemMedia>
          <Avatar className="size-10">
            {requester.image && (
              <AvatarImage src={requester.image} alt={requester.name ?? ""} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </ItemMedia>

        <ItemContent className="min-w-0 gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <ItemTitle>{requester.name ?? "Unknown"}</ItemTitle>
            {status === "PENDING" ? (
              <span
                className="text-muted-foreground shrink-0 text-xs"
                suppressHydrationWarning
              >
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            ) : (
              <Badge
                variant={STATUS_VARIANT[status] ?? "secondary"}
                className="text-xs"
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">{roleLabel}</span>
            {message && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground truncate text-xs">
                  {message}
                </span>
              </>
            )}
          </div>
        </ItemContent>

        <ItemActions>
          <ChevronRight className="text-muted-foreground size-4" />
        </ItemActions>
      </Link>
    </Item>
  );
}
