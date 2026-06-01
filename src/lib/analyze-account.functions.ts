import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  name: z.string(),
  industry: z.string(),
  arr: z.number(),
  daysToRenewal: z.number(),
  championStatus: z.string(),
  score: z.number(),
  level: z.string(),
  signals: z.object({
    lastLoginDays: z.number(),
    lastReplyDays: z.number(),
    openTickets: z.number(),
    ticketSentiment: z.string(),
    npsScore: z.number(),
    usageTrend: z.string(),
    notes: z.string(),
  }),
});

export type AnalysisResult = {
  summary: string;
  steps: { title: string; timeline: string; detail: string }[];
};

export const analyzeAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      console.error("[analyzeAccount] AI gateway key is not configured");
      throw new Error("AI analysis is unavailable right now. Please try again later.");
    }

    const system =
      "You are a customer success risk analyst. Return ONLY valid JSON matching: " +
      `{"summary": string, "steps": [{"title": string, "timeline": string, "detail": string}]}. ` +
      "summary is 2-3 plain English sentences explaining churn risk. " +
      "steps is exactly 3 prioritized next actions, each with a short title (max 8 words), " +
      "a timeline (e.g. 'Today', 'This week', 'Next 30 days'), and 1 sentence of detail.";

    const user = `Account: ${data.name} (${data.industry})
ARR: $${data.arr.toLocaleString()} | Renewal in ${data.daysToRenewal} days
Risk score: ${data.score}/100 (${data.level})
Champion: ${data.championStatus}
Signals:
- Last login: ${data.signals.lastLoginDays} days ago
- Last reply: ${data.signals.lastReplyDays} days ago
- Open tickets: ${data.signals.openTickets} (${data.signals.ticketSentiment})
- NPS: ${data.signals.npsScore}/10
- Usage trend: ${data.signals.usageTrend}
- Notes: ${data.signals.notes || "(none)"}`;

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
      });
    } catch (err) {
      console.error("[analyzeAccount] Network error calling AI gateway:", err);
      throw new Error("AI analysis failed. Please try again.");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[analyzeAccount] AI gateway ${res.status}:`, text);
      throw new Error("AI analysis failed. Please try again.");
    }

    try {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as AnalysisResult;
      return {
        summary: String(parsed.summary ?? ""),
        steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 3) : [],
      };
    } catch (err) {
      console.error("[analyzeAccount] Failed to parse AI response:", err);
      throw new Error("AI analysis failed. Please try again.");
    }
  });
