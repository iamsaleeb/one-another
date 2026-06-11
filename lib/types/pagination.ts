export interface EventCardItem {
  id: string;
  datetime: Date | null;
  title: string;
  tag: string;
  host: string | null;
  cancelledAt?: Date | null;
  isDraft?: boolean;
  photoUrl?: string | null;
  church: { name: string } | null;
  isSaved?: boolean;
}

export type LoadMoreFn = (
  cursor: string | null
) => Promise<{ items: EventCardItem[]; nextCursor: string | null }>;
