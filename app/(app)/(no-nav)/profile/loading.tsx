import { Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Item, ItemGroup, ItemSeparator } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <Item size="sm" className="justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="size-4 rounded" />
    </Item>
  );
}

export default function ProfileLoading() {
  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        <Card className="flex-row items-center gap-4 p-5">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </Card>
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            <Item size="sm">
              <Skeleton className="h-4 w-16" />
            </Item>
            {Array.from({ length: 3 }, (_, i) => (
              <Fragment key={i}>
                <ItemSeparator />
                <RowSkeleton />
              </Fragment>
            ))}
          </ItemGroup>
        </Card>
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            <Item size="sm">
              <Skeleton className="h-4 w-12" />
            </Item>
            {Array.from({ length: 2 }, (_, i) => (
              <Fragment key={i}>
                <ItemSeparator />
                <RowSkeleton />
              </Fragment>
            ))}
          </ItemGroup>
        </Card>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
