"use client";

import { useCreators } from "@/hooks/use-content";
import { CreatorList } from "@/components/creator-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorsPage() {
  const { creators, refreshCreators } = useCreators();

  if (!creators) {
    return <Skeleton className="h-40 w-full max-w-lg" />;
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Discover</span>
        <h2 className="text-xl font-semibold text-white mt-1">Creators</h2>
        <p className="text-sm text-gray-1 mt-0.5">Manage who you scrape inspiration from</p>
      </div>
      <CreatorList creators={creators} onRefresh={refreshCreators} />
    </div>
  );
}
