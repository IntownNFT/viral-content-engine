"use client";

export async function sendFeedback(
  type: "copy" | "edit",
  contentType: string,
  original: string,
  edited?: string
) {
  await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, contentType, original, edited }),
  });
}
