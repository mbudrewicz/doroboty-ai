import { z } from "zod";
import { assessmentSchema, type Assessment } from "./e01";
import { hasDoubts } from "./e01";
import type { Application } from "./model";

export const reviewInputSchema = z.object({
  assessment: assessmentSchema,
  note: z.string().trim().max(12000),
});
export const reviewRoundSchema = reviewInputSchema.extend({ at: z.iso.datetime() });
export const candidateReviewSchema = z
  .object({
    recruiterId: z.string().min(1).max(100),
    first: reviewRoundSchema,
    revealedAt: z.iso.datetime().optional(),
    followups: z.array(reviewRoundSchema).max(30),
    flowVersion: z.literal(2).optional(),
    completedAt: z.iso.datetime().optional(),
    declinedAt: z.iso.datetime().optional(),
    completionNote: z.string().trim().max(12000).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.followups.length && !value.revealedAt) ||
      (value.revealedAt &&
        (value.revealedAt < value.first.at || !hasDoubts(value.first.assessment))) ||
      value.followups.some(
        (round, i) => round.at < (i ? value.followups[i - 1].at : value.revealedAt!),
      ) ||
      (value.declinedAt &&
        (value.revealedAt ||
          !hasDoubts(value.first.assessment) ||
          !value.completedAt ||
          value.declinedAt < value.first.at)) ||
      (value.completedAt &&
        value.completedAt < (value.followups.at(-1)?.at ?? value.declinedAt ?? value.first.at)) ||
      (value.flowVersion === 2 &&
        (value.followups.length > 1 ||
          Boolean(value.completedAt) !==
            Boolean(
              value.declinedAt || value.followups.length || !hasDoubts(value.first.assessment),
            )))
    )
      ctx.addIssue({ code: "custom", message: "Invalid review sequence" });
  });
export function reviewOutcome(assessment: Assessment) {
  return assessment === "invite" || assessment === "lean_invite"
    ? "interview_invited"
    : assessment === "reject" || assessment === "lean_reject"
      ? "rejected"
      : "reviewed";
}
export function reviewComplete(record: z.infer<typeof candidateReviewSchema>) {
  return Boolean(
    record.completedAt || record.followups.length || !hasDoubts(record.first.assessment),
  );
}

export function recruitingHistory({ events, reviews }: Pick<Application, "events" | "reviews">) {
  const editedNotes = new Map<number, string>();
  const additionalNotes = new Map<number, string[]>();

  for (const review of reviews ?? []) {
    if (!reviewComplete(review) || (!review.completedAt && review.completionNote === undefined))
      continue;
    const round = review.followups.at(-1) ?? review.first;
    const at = review.completedAt ?? round.at;
    const outcome = reviewOutcome(round.assessment);
    const note = review.completionNote ?? round.note;
    let stageIndex = 0;
    let outcomeIndex = -1;
    for (const [index, event] of events.entries()) {
      if (event.at > at) break;
      stageIndex = index;
      if (
        event.at === at &&
        event.stage === outcome &&
        event.note === round.note &&
        !editedNotes.has(index)
      ) {
        outcomeIndex = index;
      }
    }
    if (outcomeIndex >= 0) {
      editedNotes.set(outcomeIndex, note);
    } else if (note) {
      // A review can finish at the existing stage without adding a stage event.
      const notes = additionalNotes.get(stageIndex) ?? [];
      notes.push(`Notatka z oceny: ${note}`);
      additionalNotes.set(stageIndex, notes);
    }
  }

  return events.map((event, index) => ({
    ...event,
    note: [editedNotes.get(index) ?? event.note, ...(additionalNotes.get(index) ?? [])]
      .filter(Boolean)
      .join("\n\n"),
  }));
}
