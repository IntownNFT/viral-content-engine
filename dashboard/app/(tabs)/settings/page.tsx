"use client";

import { useSettings, useSoul, useHeartbeat } from "@/hooks/use-content";
import { SettingsForm } from "@/components/settings-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { settings, refreshSettings } = useSettings();
  const { soulContent, refreshSoul } = useSoul();
  const { heartbeat, refreshHeartbeat } = useHeartbeat();

  if (!settings) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Configure</span>
        <h2 className="text-xl font-semibold text-white mt-1">Settings</h2>
        <p className="text-sm text-gray-1 mt-0.5">API keys, model, soul, heartbeat, and engine configuration</p>
      </div>
      <SettingsForm
        settings={settings}
        onRefresh={refreshSettings}
        soulContent={soulContent}
        onSoulRefresh={refreshSoul}
        heartbeat={heartbeat ?? null}
        onHeartbeatRefresh={refreshHeartbeat}
      />
    </div>
  );
}
