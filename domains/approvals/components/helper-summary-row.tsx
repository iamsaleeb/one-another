import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus } from "@prisma/client";
import { ROLE_LABELS } from "@/domains/approvals/lib/labels";

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
  status: ApprovalStatus;
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
    <Link
      href={href}
      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
    >
      <Avatar className="size-10 shrink-0">
        {requester.image && (
          <AvatarImage src={requester.image} alt={requester.name ?? ""} />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{requester.name ?? "Unknown"}</p>
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
      </div>

      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}
