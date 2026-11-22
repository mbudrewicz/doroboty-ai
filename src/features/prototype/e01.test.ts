import { describe, expect, it } from "vitest";
import { initialState, transition, type State } from "./model";
import { parseState, serializeState } from "./storage";
import { assessmentLabels, hasDoubts, type Assessment } from "./e01";

const at = "2026-11-16T12:00:00.000Z";
const applicationId = "application-example";
const first = (state: State, assessment: Assessment) =>
  transition(
    state,
    {
      type: "e01_first",
      applicationId,
      value: { requirement: "Prowadzenie discovery i pilotażu", assessment },
    },
    at,
  );
const start = () =>
  transition(initialState(), { type: "select_person", id: "employer-brightlabs" });

describe("E01 revision 5", () => {
  for (const assessment of Object.keys(assessmentLabels) as Assessment[]) {
    it(`preserves the first assessment and gates exposure for ${assessment}`, () => {
      const state = first(start(), assessment);
      expect(() => first(state, "unknown")).toThrow();
      const reveal = () => transition(state, { type: "e01_reveal", applicationId }, at);
      if (!hasDoubts(assessment)) {
        expect(reveal).toThrow();
        return;
      }
      expect(() =>
        transition(
          state,
          {
            type: "e01_second",
            applicationId,
            value: {
              assessment: "invite",
              decision: "invite",
              explanation: "Nowa informacja",
            },
          },
          at,
        ),
      ).toThrow();
      const exposed = parseState(serializeState(reveal()));
      expect(exposed.applications[0].e01![0].second).toBeUndefined();
      const finished = transition(
        exposed,
        {
          type: "e01_second",
          applicationId,
          value: {
            assessment: "lean_reject",
            decision: "unresolved",
            explanation: "Nadal nie znam podstawy rezultatu.",
          },
        },
        at,
      );
      const saved = parseState(serializeState(finished));
      expect(saved.applications[0].e01![0]).toMatchObject({
        first: assessment,
        revealedAt: at,
        second: { assessment: "lean_reject", decision: "unresolved" },
      });
      expect(saved.applications[0].events).toEqual(state.applications[0].events);
      expect(saved.applications[0].cv).toBe(state.applications[0].cv);
      expect(() =>
        transition(
          saved,
          {
            type: "e01_second",
            applicationId,
            value: {
              assessment: "invite",
              decision: "invite",
              explanation: "Overwrite",
            },
          },
          at,
        ),
      ).toThrow();
    });
  }
  it("rejects invalid imports, empty input and writes outside the employer company", () => {
    expect(() =>
      first(transition(start(), { type: "select_person", id: "employer-northstar" }), "unknown"),
    ).toThrow();
    expect(() =>
      first(transition(start(), { type: "select_person", id: "candidate-marek" }), "unknown"),
    ).toThrow();
    expect(() =>
      transition(
        start(),
        { type: "e01_first", applicationId, value: { assessment: "unknown", requirement: " " } },
        at,
      ),
    ).toThrow();
    const state = first(start(), "invite");
    state.applications[0].e01![0].revealedAt = at;
    expect(() => parseState(JSON.stringify(state))).toThrow();
    const valid = first(start(), "unknown");
    valid.applications[0].e01!.push(valid.applications[0].e01![0]);
    expect(() => parseState(JSON.stringify(valid))).toThrow();
  });
});
