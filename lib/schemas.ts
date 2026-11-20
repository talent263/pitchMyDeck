import { z } from "zod";

export const slideLayouts = [
  "title-slide",
  "metrics-grid",
  "two-column",
  "quote",
  "call-to-action",
  "bullets",
] as const;

export const slideThemes = ["dark-minimal", "modern-tech", "corporate-elegant"] as const;

export const SlideSchema = z.object({
  id: z.string().min(1),
  layout: z.enum(slideLayouts),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(220).optional(),
  bullets: z.array(z.string().max(180)).max(6).default([]),
  metrics: z.array(z.object({ label: z.string().max(50), value: z.string().max(40), context: z.string().max(100).optional() })).max(4).default([]),
  quote: z.string().max(300).optional(),
  quoteAttribution: z.string().max(100).optional(),
  visualSuggestion: z.string().max(240).optional(),
  speakerNotes: z.string().max(800).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const DeckSchema = z.object({
  title: z.string().min(1).max(140),
  subtitle: z.string().max(240).optional(),
  targetSummary: z.string().max(500),
  theme: z.enum(slideThemes).default("modern-tech"),
  slides: z.array(SlideSchema).min(3).max(15),
});

export const TransformationRequestSchema = z.object({
  targetUrl: z.string().url().max(2048),
  rawContent: z.string().trim().min(40).max(20_000),
  targetIndustry: z.string().trim().min(2).max(100),
});

export type Slide = z.infer<typeof SlideSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type TransformationRequest = z.infer<typeof TransformationRequestSchema>;
