import { describe, expect, it } from "vitest";
import { initialState, transition } from "./model";
import { parseState, serializeState } from "./storage";
import { assessmentLabels, hasDoubts, type Assessment } from "./e01";
import { recruitingHistory, reviewOutcome } from "./candidate-review";
import { projectContextForRole, reviewProjectAnswers } from "./project-description";

const at = "2026-11-18T12:00:00.000Z";
const applicationId = "application-example";
const start = () =>
  transition(initialState(), { type: "select_person", id: "employer-brightlabs" });
const pending = () =>
  transition(
    start(),
    {
      type: "review_save",
      applicationId,
      value: { assessment: "unknown", note: "Pierwsze pytanie" },
    },
    at,
  );
describe("recruiter diagram flow", () => {
  for (const assessment of Object.keys(assessmentLabels) as Assessment[]) {
    it(`stores the first ${assessment} and maps only a completed decision`, () => {
      let s = transition(
        start(),
        { type: "review_save", applicationId, value: { assessment, note: "Pytanie do rozmowy" } },
        at,
      );
      s = parseState(serializeState(s));
      expect(s.applications[0].stage).toBe(
        hasDoubts(assessment) ? "submitted" : reviewOutcome(assessment),
      );
      if (hasDoubts(assessment)) {
        expect(s.applications[0].events).toHaveLength(1);
        s = transition(s, { type: "review_decline", applicationId }, at);
        expect(s.applications[0].stage).toBe(reviewOutcome(assessment));
        expect(s.applications[0].reviews![0].declinedAt).toBe(at);
      }
      expect(s.applications[0].reviews![0].first.assessment).toBe(assessment);
      expect(s.applications[0].reviews![0].completedAt).toBe(at);
      expect(() => transition(s, { type: "review_reveal", applicationId }, at)).toThrow();
      const noted = transition(
        s,
        { type: "review_note", applicationId, note: "Dodatkowa notatka" },
        at,
      );
      expect(noted.applications[0].reviews![0].first.note).toBe("Pytanie do rozmowy");
      expect(noted.applications[0].reviews![0].completionNote).toBe("Dodatkowa notatka");
      expect(recruitingHistory(noted.applications[0]).at(-1)?.note).toBe("Dodatkowa notatka");
      expect(noted.applications[0].events.at(-1)?.note).toBe("Pytanie do rozmowy");
    });
    it(`maps second ${assessment}, preserves both rounds and ends the assessment`, () => {
      const first = pending();
      const exposed = transition(first, { type: "review_reveal", applicationId }, at);
      expect(exposed.applications[0].stage).toBe("submitted");
      const finished = transition(
        parseState(serializeState(exposed)),
        { type: "review_save", applicationId, value: { assessment, note: "Drugie pytanie" } },
        at,
      );
      const a = parseState(serializeState(finished)).applications[0];
      expect(a.stage).toBe(reviewOutcome(assessment));
      expect(a.reviews![0].first).toEqual(first.applications[0].reviews![0].first);
      expect(a.reviews![0].followups).toHaveLength(1);
      expect(a.reviews![0].followups[0].assessment).toBe(assessment);
      expect(a.reviews![0].completedAt).toBe(at);
      expect(() =>
        transition(
          finished,
          { type: "review_save", applicationId, value: { assessment, note: "Overwrite" } },
          at,
        ),
      ).toThrow();
    });
  }
  it("switches from assessment notes to current stage notes after the first conversation", () => {
    let state = transition(
      start(),
      { type: "review_save", applicationId, value: { assessment: "invite", note: "Pierwotna" } },
      at,
    );
    for (const note of ["Zaktualizowana", ""]) {
      state = parseState(
        serializeState(transition(state, { type: "review_note", applicationId, note })),
      );
      const history = recruitingHistory(state.applications[0]);
      expect(history.find((event) => event.stage === "interview_invited")?.note).toBe(note);
    }
    const stageNote = {
      type: "stage_note",
      applicationId,
      stage: "first_conversation_held",
      note: "Po rozmowie",
    } as const;
    expect(() => transition(state, { ...stageNote, stage: "interview_invited" })).toThrow();
    state = transition(
      state,
      { type: "stage", applicationId, stage: stageNote.stage, note: "" },
      "2026-11-18T13:00:00.000Z",
    );
    expect(() =>
      transition(state, { type: "review_note", applicationId, note: "Zmiana oceny" }),
    ).toThrow();
    const other = transition(state, { type: "select_person", id: "employer-northstar" });
    expect(() => transition(other, stageNote)).toThrow();
    const candidate = transition(state, { type: "select_person", id: "candidate-marek" });
    expect(() => transition(candidate, stageNote)).toThrow();
    const originalEvents = state.applications[0].events;
    state = parseState(serializeState(transition(state, stageNote)));
    expect(state.applications[0].events.slice(0, -1)).toEqual(originalEvents.slice(0, -1));
    expect(state.applications[0].events.at(-1)).toEqual({
      ...originalEvents.at(-1),
      note: "Po rozmowie",
    });
    expect(recruitingHistory(state.applications[0]).at(-1)?.note).toBe("Po rozmowie");
    state = transition(
      state,
      { type: "stage", applicationId, stage: "continued", note: "" },
      "2026-11-18T14:00:00.000Z",
    );
    expect(() => transition(state, stageNote)).toThrow();
    state = transition(state, { ...stageNote, stage: "continued", note: "Kolejna notatka" });
    expect(
      recruitingHistory(state.applications[0])
        .slice(-2)
        .map(({ note }) => note),
    ).toEqual(["Po rozmowie", "Kolejna notatka"]);
  });
  it("preserves a stage note when the assessment finishes at the existing stage", () => {
    let state = transition(
      start(),
      { type: "stage", applicationId, stage: "reviewed", note: "Notatka etapu" },
      "2026-11-18T11:00:00.000Z",
    );
    state = transition(
      state,
      { type: "review_save", applicationId, value: { assessment: "unknown", note: "" } },
      at,
    );
    state = transition(state, { type: "review_decline", applicationId }, at);
    state = transition(
      state,
      { type: "review_note", applicationId, note: "Notatka rekrutera" },
      at,
    );
    const history = recruitingHistory(state.applications[0]);
    expect(history).toHaveLength(2);
    expect(history.at(-1)?.note).toBe("Notatka etapu\n\nNotatka z oceny: Notatka rekrutera");
  });
  it("rejects premature second writes, foreign access and malformed sequence imports", () => {
    expect(() =>
      transition(
        pending(),
        { type: "review_save", applicationId, value: { assessment: "invite", note: "" } },
        at,
      ),
    ).toThrow();
    const other = transition(start(), { type: "select_person", id: "employer-northstar" });
    expect(() => transition(other, { type: "review_decline", applicationId }, at)).toThrow();
    const invalid = pending();
    invalid.applications[0].reviews![0].completedAt = at;
    expect(() => parseState(JSON.stringify(invalid))).toThrow();
    expect(() => transition(start(), { type: "review_reveal", applicationId }, at)).toThrow();
  });
  it("groups source answers into five areas while preserving AI and all source text", () => {
    const s = start();
    const source = { ...s.applications[0].project!, ai: "Sam sprawdzałem wyniki AI." };
    const answers = reviewProjectAnswers(source, projectContextForRole(s.jobs[0]));
    expect(answers).toHaveLength(5);
    expect(answers[0].answer).toContain(source.problem);
    expect(answers[0].answer).toContain(source.use);
    expect(answers.find((q) => q.key === "ai")?.answer).toBe(source.ai);
    expect(s.applications[0].project?.ai).toContain("Model sugerował kategorię zgłoszenia.");
  });
  it("keeps five distinct questions when older applications lack project answers", () => {
    const context = projectContextForRole(start().jobs[0]);
    const oldContext = { ...context, prompts: Array(6).fill(context.prompts![0]) };
    const answers = reviewProjectAnswers(undefined, oldContext);
    expect(answers.map((item) => item.key)).toEqual([
      "problem",
      "contribution",
      "boundaries",
      "result",
      "ai",
    ]);
    expect(answers.every(({ label, answer }) => label.length > 0 && !answer)).toBe(true);
  });
  it("snapshots role context, independent answer and optional AI use without rewriting old submissions", () => {
    let s = transition(initialState(), { type: "select_person", id: "candidate-anna" });
    s = transition(
      s,
      {
        type: "submit",
        jobId: s.jobs[0].id,
        notes: "",
        generated: "",
        answer: "",
        consent: true,
        introduction: "Moja krótka odpowiedź dla rekrutera.",
        project: {
          problem: "Problem",
          contribution: "Moja praca",
          boundaries: "Granice",
          use: "Pilotaż",
          result: "Wynik",
          ai: "AI porządkowało syntetyczne zgłoszenia; sam sprawdzałem etykiety.",
        },
      },
      at,
    );
    const app = parseState(serializeState(s)).applications.at(-1)!;
    expect(app.answer).toBe("Moja krótka odpowiedź dla rekrutera.");
    expect(app.project?.ai).toContain("syntetyczne");
    expect(app.projectContext?.requirement).toBe(s.jobs[0].description);
    s.jobs[0].description = "Changed job description";
    expect(app.projectContext?.requirement).not.toBe(s.jobs[0].description);
  });
});
