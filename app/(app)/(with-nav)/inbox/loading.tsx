import { Fragment } from "react";
import { Card } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
} from "@/components/ui/item";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function NotificationRowSkeleton() {
  return (
    <Item size="sm" className="items-start gap-3">
      <ItemMedia>
        <Skeleton className="size-7 rounded-full" />
      </ItemMedia>
      <ItemContent className="gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </ItemContent>
    </Item>
  );
}

export default function InboxLoading() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Inbox" />
      <div className="px-4">
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            {Array.from({ length: 5 }, (_, i) => (
              <Fragment key={i}>
                {i > 0 && <ItemSeparator />}
                <NotificationRowSkeleton />
              </Fragment>
            ))}
          </ItemGroup>
        </Card>
      </div>
    </div>
  );
}
