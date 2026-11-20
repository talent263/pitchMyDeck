import type { Deck } from "@/lib/schemas";

/** Requests a server-rendered PPTX and starts a browser download. */
export async function exportToPptx(deck: Deck) {
  const response = await fetch("/api/export/pptx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deck) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "PPTX export failed.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: `${deck.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pitchmydeck"}.pptx` });
  anchor.click(); URL.revokeObjectURL(url);
}
