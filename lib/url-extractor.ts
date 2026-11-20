import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_EXTRACTED_CHARACTERS = 14_000;
const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "::1"]);

function isPrivateAddress(address: string) {
  if (net.isIP(address) === 6) return address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:");
  const [first, second] = address.split(".").map(Number);
  return first === 10 || first === 127 || first === 0 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

/** Fetches public HTML and reduces it to readable text. */
export async function extractTargetText(value: string): Promise<{ url: string; text: string }> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only HTTP(S) target URLs are supported.");
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("Local target URLs are not allowed.");

  const records = await lookup(url.hostname, { all: true });
  if (!records.length || records.some(({ address }) => isPrivateAddress(address))) throw new Error("Target URL resolves to a private network address.");

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
    headers: { "User-Agent": "PitchMyDeckBot/1.0 (+https://pitchmydeck.example)" },
  });
  if (!response.ok) throw new Error(`Target page returned ${response.status}.`);
  if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("Target URL must return an HTML page.");

  const html = (await response.text()).slice(0, 2_000_000);
  const document = new JSDOM(html, { url: response.url }).window.document;
  document.querySelectorAll("script, style, noscript, svg, nav, footer, header").forEach((node) => node.remove());
  const article = new Readability(document).parse();
  const text = (article?.textContent ?? document.body.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACTED_CHARACTERS);
  if (text.length < 100) throw new Error("Not enough readable text was found on the target page.");
  return { url: response.url, text };
}
