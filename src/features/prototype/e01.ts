import { z } from "zod";

export const assessmentLabels = {
  invite: "Zdecydowanie zapraszam.",
  lean_invite: "Raczej zapraszam, ale mam wątpliwości.",
  unknown: "Nie wiem — brakuje mi informacji.",
  lean_reject: "Raczej odrzucam, ale mam wątpliwości.",
  reject: "Zdecydowanie odrzucam.",
} as const;
export const assessmentSchema = z.enum([
  "invite",
  "lean_invite",
  "unknown",
  "lean_reject",
  "reject",
]);
export type Assessment = z.infer<typeof assessmentSchema>;
export const hasDoubts = (value: Assessment) => value !== "invite" && value !== "reject";
export const direction = (value: Assessment) =>
  value === "unknown"
    ? "none"
    : value === "invite" || value === "lean_invite"
      ? "invite"
      : "reject";
export const decisionLabels = {
  invite: "Zapraszam.",
  reject: "Odrzucam.",
  unresolved: "Brak decyzji — nadal potrzebne informacje",
} as const;
export const firstAssessmentSchema = z.object({
  requirement: z.string().trim().min(1).max(2000),
  assessment: assessmentSchema,
});
export const secondAssessmentSchema = z.object({
  assessment: assessmentSchema,
  decision: z.enum(["invite", "reject", "unresolved"]),
  explanation: z.string().trim().min(1).max(4000),
});
export const e01Schema = z
  .object({
    revision: z.literal(5),
    recruiterId: z.string().min(1).max(100),
    requirement: firstAssessmentSchema.shape.requirement,
    first: assessmentSchema,
    firstAt: z.iso.datetime(),
    revealedAt: z.iso.datetime().optional(),
    second: secondAssessmentSchema.extend({ at: z.iso.datetime() }).optional(),
  })
  .superRefine((record, ctx) => {
    if (
      (!hasDoubts(record.first) && (record.revealedAt || record.second)) ||
      (record.second && !record.revealedAt) ||
      (record.revealedAt && record.revealedAt < record.firstAt) ||
      (record.second && record.second.at < record.revealedAt!)
    ) {
      ctx.addIssue({ code: "custom", message: "Invalid E01 sequence" });
    }
  });
