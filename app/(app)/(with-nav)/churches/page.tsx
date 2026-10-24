import { auth } from "@/auth";
import {
  getChurches,
  getMyFollowedChurchIds,
} from "@/domains/churches/actions/data";
import { ChurchListTabs } from "@/domains/churches/components/church-list-tabs";
import { PageHeader } from "@/components/ui/page-header";

export default async function ChurchesPage() {
  const userId = (await auth())?.user?.id ?? null;

  const [churches, followedIds] = await Promise.all([
    getChurches(),
    userId ? getMyFollowedChurchIds(userId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Churches"
        description={`${churches.length} churches in your area`}
      />

      <div className="px-4 py-2 pb-24">
        <ChurchListTabs
          churches={churches}
          followedIds={followedIds}
          isAuthenticated={!!userId}
        />
      </div>
    </div>
  );
}
