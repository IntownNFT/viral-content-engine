"use client";

import { useAbVariations } from "@/hooks/use-content";
import { AbGroup } from "@/components/ab-group";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical } from "lucide-react";

export default function AbTestsPage() {
  const { abData } = useAbVariations();

  if (!abData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (abData.groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-5/60 flex items-center justify-center mb-4">
          <FlaskConical className="h-6 w-6 text-gray-2" />
        </div>
        <p className="text-lg font-medium text-gray-1">No A/B variations yet</p>
        <p className="text-sm text-gray-2 mt-1">Check the A/B checkbox and click &quot;Generate&quot;</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Experiment</span>
        <h2 className="text-xl font-semibold text-white mt-1">A/B Test Variations</h2>
        <p className="text-sm text-gray-1 mt-0.5">
          {abData.groups.length} variation group{abData.groups.length !== 1 ? "s" : ""}
          {abData.generatedAt && ` · ${new Date(abData.generatedAt).toLocaleDateString()}`}
        </p>
      </div>

      {abData.groups.map((group, i) => (
        <AbGroup key={i} group={group} index={i} />
      ))}
    </div>
  );
}
