"use client";

import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

interface ContentCardProps {
  file: { name: string; content: string };
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ContentCard({ file, children, defaultOpen = false }: ContentCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const date = file.name.replace(".md", "");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="mb-5">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-interactive group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-5/60 group-hover:bg-gray-4/60 transition-colors">
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-1" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-2" />
              )}
            </div>
            <Calendar className="h-3.5 w-3.5 text-gray-2" />
            <span className="text-sm font-medium text-[#E5E5EA]">{date}</span>
            {!open && (
              <span className="text-[10px] text-gray-2 ml-auto">Click to expand</span>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 pl-2">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
