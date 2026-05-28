"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  FileText,
  Film,
  FlaskConical,
  BarChart3,
  Search,
  Users,
  Settings,
  Zap,
} from "lucide-react";

const tabs = [
  { href: "/tweets", label: "Tweets", icon: MessageSquare },
  { href: "/blogs", label: "Blogs", icon: FileText },
  { href: "/reels", label: "Reels", icon: Film },
  { href: "/ab-tests", label: "A/B Tests", icon: FlaskConical },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Search },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] sidebar-glass flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl glass-tint-green glow-blue">
          <Zap className="h-4.5 w-4.5 text-apple-blue" />
        </div>
        <div>
          <h1 className="text-[13px] font-semibold text-white tracking-tight leading-tight">
            Viral Content
          </h1>
          <p className="text-[10px] text-gray-1 font-medium">Engine</p>
        </div>
      </div>

      <div className="divider-glass mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "sidebar-active glass-tint-green text-apple-blue"
                  : "text-gray-1 hover:text-[#F5F5F7] hover:bg-white/[0.04]"
              )}
            >
              <Icon className={cn("h-[15px] w-[15px] shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(10,132,255,0.5)]")} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="divider-glass mx-4" />
      <div className="px-5 py-4">
        <div className="glass-card rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-gray-2 font-medium">AI-powered pipeline</p>
          <p className="text-[10px] text-gray-3 mt-0.5">v1.0</p>
        </div>
      </div>
    </aside>
  );
}
