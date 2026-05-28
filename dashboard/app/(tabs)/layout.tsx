"use client";

import { useCallback } from "react";
import { Header } from "@/components/header";
import { StatusBar } from "@/components/status-bar";
import { Sidebar } from "@/components/tab-nav";
import { useStatusPoll } from "@/hooks/use-status-poll";
import { useSWRConfig } from "swr";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { mutate } = useSWRConfig();

  const refreshAll = useCallback(() => {
    mutate(() => true, undefined, { revalidate: true });
  }, [mutate]);

  const { statuses } = useStatusPoll(refreshAll);

  return (
    <div className="min-h-screen bg-[#08080a] bg-dot-pattern">
      <Sidebar />
      <div className="ml-[220px]">
        <Header onRefresh={refreshAll} />
        <StatusBar statuses={statuses} />
        <main className="px-8 py-6 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
