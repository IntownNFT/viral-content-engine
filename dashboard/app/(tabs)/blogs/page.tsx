"use client";

import { useContent } from "@/hooks/use-content";
import { ContentCard } from "@/components/content-card";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function BlogsPage() {
  const { content } = useContent();

  if (!content) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const files = content.blogs;

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-5/60 flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-gray-2" />
        </div>
        <p className="text-lg font-medium text-gray-1">No blogs generated yet</p>
        <p className="text-sm text-gray-2 mt-1">Click &quot;Generate&quot; or &quot;Daily&quot; to create content</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Create</span>
        <h2 className="text-xl font-semibold text-white mt-1">Blog Articles</h2>
        <p className="text-sm text-gray-1 mt-0.5">{files.length} article{files.length !== 1 ? "s" : ""} generated</p>
      </div>

      {files.map((file, i) => (
        <ContentCard key={file.name} file={file} defaultOpen={i === 0}>
          <div className="glass-card rounded-xl p-6">
            <MarkdownRenderer content={file.content} />
          </div>
        </ContentCard>
      ))}
    </div>
  );
}
