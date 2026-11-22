import { z } from "zod";
import { e01Schema, firstAssessmentSchema, secondAssessmentSchema, hasDoubts } from "./e01";
import {
  candidateReviewSchema,
  reviewInputSchema,
  reviewOutcome,
  reviewComplete,
} from "./candidate-review";
import marketplace from "./data/marketplace.json" with { type: "json" };
import people from "./data/people.json" with { type: "json" };
import type { JobWithCompany } from "@/features/jobs/types";

import {
  projectDraftSchema,
  projectSubmissionSchema,
  projectText,
  projectContextSchema,
  projectContextForRole,
  type ProjectDescription,
} from "./project-description";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const shortText = z.string().trim().min(1).max(200);
const maxTextLength = 12000;
const answerSnapshot = z.string().trim();
const text = answerSnapshot.max(maxTextLength);
export const MIN_APPLICATION_ANSWER_LENGTH = 20;
function hasValidAnswerLength({
  answer,
  project,
}: {
  answer: string;
  project?: ProjectDescription;
}) {
  return answer.length <= maxTextLength || (!!project && answer === projectText(project).trim());
}
const companySchema = z.object({
  id,
  slug: id,
  name: shortText,
  summary: text,
  description: text,
  websiteUrl: z.string().max(500),
  location: shortText,
  sizeLabel: shortText,
  logoUrl: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional(),
});
export const jobSchema = z
  .object({
    id,
    slug: id,
    companyId: id,
    title: shortText,
    summary: text.min(10),
    description: text.min(30),
    category: z.enum(["build", "apply", "lead"]),
    function: z.enum(["product", "engineering", "data", "design", "marketing", "operations"]),
    remoteStatus: z.enum(["onsite", "hybrid", "remote"]),
    locations: z.array(shortText).min(1).max(10),
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .optional(),
    seniority: z.enum(["junior", "mid", "senior", "lead"]),
    contract: z.enum(["employment", "b2b", "mandate"]),
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    salaryCurrency: z.enum(["PLN", "EUR"]).optional(),
    salaryPeriod: z.enum(["month", "year"]).optional(),
    salaryKind: z.enum(["gross", "net"]).optional(),
    publicationStatus: z.enum(["draft", "review", "published", "hidden", "expired", "archived"]),
    publishedAt: z.iso.datetime(),
    expiryAt: z.iso.datetime(),
    verificationStatus: z.enum(["unverified", "editorial", "employer_verified"]),
    sourceBrief: text.optional(),
    generatedDescription: text.optional(),
  })
  .refine(
    (job) =>
      job.salaryMin === undefined || job.salaryMax === undefined || job.salaryMin <= job.salaryMax,
    { path: ["salaryMax"], message: "Salary maximum must not be below minimum" },
  );
export const profileSchema = z.object({
  name: shortText,
  headline: shortText,
  bio: text,
  location: shortText,
});
const personSchema = profileSchema.extend({
  id,
  role: z.enum(["candidate", "employer", "operator"]),
  companyId: id.optional(),
  cv: text,
  exampleScore: z.number().int().min(0).max(100),
  exampleSummary: text,
});
export const stages = [
  "submitted",
  "reviewed",
  "interview_invited",
  "first_conversation_held",
  "continued",
  "rejected",
  "withdrawn",
  "hired",
] as const;
export type Stage = (typeof stages)[number];
export const stageLabels: Record<Stage, string> = {
  submitted: "Aplikacja wysłana",
  reviewed: "W przeglądzie",
  interview_invited: "Zaproszenie na rozmowę",
  first_conversation_held: "Pierwsza rozmowa odbyta",
  continued: "Kolejny etap",
  rejected: "Proces zakończony",
  withdrawn: "Wycofana",
  hired: "Zatrudnienie",
};
export const employerStageLabels: Record<Stage, string> = {
  ...stageLabels,
  rejected: "Odrzucenie kandydata",
};
export const nextStages: Record<Stage, Stage[]> = {
  submitted: ["reviewed", "rejected"],
  reviewed: ["interview_invited", "rejected"],
  interview_invited: ["first_conversation_held", "rejected"],
  first_conversation_held: ["continued", "rejected"],
  continued: ["hired", "rejected"],
  rejected: [],
  withdrawn: [],
  hired: [],
};
const applicationSchema = z
  .object({
    id,
    candidateId: id,
    jobId: id,
    companyId: id,
    jobTitle: shortText,
    candidateName: shortText,
    cv: text.min(20),
    answer: answerSnapshot.min(MIN_APPLICATION_ANSWER_LENGTH),
    project: projectSubmissionSchema.optional(),
    projectContext: projectContextSchema.optional(),
    reviews: z.array(candidateReviewSchema).max(100).optional(),
    e01: z.array(e01Schema).max(100).optional(),
    sourceNotes: text,
    generatedAnswer: text,
    score: z.number().int().min(0).max(100),
    summary: text,
    stage: z.enum(stages),
    events: z
      .array(z.object({ stage: z.enum(stages), at: z.iso.datetime(), note: text }))
      .min(1)
      .max(30),
  })
  .refine(hasValidAnswerLength, { path: ["answer"], message: "Application answer is too long" });
const draftSchema = z
  .object({
    candidateId: id,
    jobId: id,
    notes: text,
    generated: text,
    answer: answerSnapshot,
    project: projectDraftSchema.optional(),
    introduction: text.optional(),
  })
  .refine(hasValidAnswerLength, { path: ["answer"], message: "Application answer is too long" });
export const stateSchema = z
  .object({
    version: z.literal(1),
    activePersonId: id.nullable(),
    companies: z.array(companySchema).min(1).max(200),
    jobs: z.array(jobSchema).min(1).max(1000),
    people: z.array(personSchema).min(1).max(100),
    applications: z.array(applicationSchema).max(2000),
    saved: z.array(z.object({ candidateId: id, jobId: id })).max(5000),
    drafts: z.array(draftSchema).max(1000),
  })
  .superRefine((s, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const list of [s.companies, s.jobs, s.people, s.applications]) {
      if (new Set(list.map((x) => x.id)).size !== list.length) problem("Duplicate identifiers");
    }
    if (
      new Set(s.jobs.map((x) => x.slug)).size !== s.jobs.length ||
      new Set(s.companies.map((x) => x.slug)).size !== s.companies.length
    )
      problem("Duplicate slugs");
    const companyIds = new Set(s.companies.map((x) => x.id));
    const jobs = new Map(s.jobs.map((x) => [x.id, x]));
    const candidates = new Set(s.people.filter((x) => x.role === "candidate").map((x) => x.id));
    if (s.activePersonId !== null && !s.people.some((x) => x.id === s.activePersonId))
      problem("Unknown active person");
    for (const p of s.people)
      if (p.role === "employer" && (!p.companyId || !companyIds.has(p.companyId)))
        problem("Unknown employer company");
    for (const j of s.jobs) if (!companyIds.has(j.companyId)) problem("Unknown job company");
    const keys = new Set<string>();
    for (const a of s.applications) {
      const records = a.e01 ?? [];
      const reviews = a.reviews ?? [];
      if (
        new Set(reviews.map((r) => r.recruiterId)).size !== reviews.length ||
        reviews.some(
          (r) =>
            !s.people.some(
              (p) => p.id === r.recruiterId && p.role === "employer" && p.companyId === a.companyId,
            ),
        )
      )
        problem("Invalid review recruiter");
      if (
        new Set(records.map((r) => r.recruiterId)).size !== records.length ||
        records.some(
          (r) =>
            !s.people.some(
              (p) => p.id === r.recruiterId && p.role === "employer" && p.companyId === a.companyId,
            ),
        )
      )
        problem("Invalid E01 recruiter");
      const key = `${a.candidateId}:${a.jobId}`;
      if (
        !candidates.has(a.candidateId) ||
        jobs.get(a.jobId)?.companyId !== a.companyId ||
        keys.has(key)
      )
        problem("Invalid application reference");
      keys.add(key);
      if (a.events[0]?.stage !== "submitted" || a.events.at(-1)?.stage !== a.stage)
        problem("Invalid application history");
      for (let i = 1; i < a.events.length; i++) {
        const before = a.events[i - 1];
        const after = a.events[i];
        if (!(
          nextStages[before.stage].includes(after.stage) ||
          (after.stage === "withdrawn" &&
            !["hired", "rejected", "withdrawn"].includes(before.stage))
        ))
          problem("Invalid stage transition");
        if (after.at < before.at) problem("Invalid event order");
      }
    }
    for (const list of [s.saved, s.drafts]) {
      const pairs = new Set<string>();
      for (const item of list) {
        const key = `${item.candidateId}:${item.jobId}`;
        if (!candidates.has(item.candidateId) || !jobs.has(item.jobId) || pairs.has(key))
          problem("Invalid candidate/job reference");
        pairs.add(key);
      }
    }
  });
export type State = z.infer<typeof stateSchema>;
export type Person = State["people"][number];
export type Application = State["applications"][number];
export type Action =
  | { type: "review_save"; applicationId: string; value: z.infer<typeof reviewInputSchema> }
  | { type: "review_reveal"; applicationId: string }
  | { type: "review_decline"; applicationId: string }
  | { type: "review_note"; applicationId: string; note: string }
  | { type: "stage_note"; applicationId: string; stage: Stage; note: string }
  | { type: "e01_first"; applicationId: string; value: z.infer<typeof firstAssessmentSchema> }
  | { type: "e01_reveal"; applicationId: string }
  | { type: "e01_second"; applicationId: string; value: z.infer<typeof secondAssessmentSchema> }
  | { type: "select_person"; id: string | null }
  | { type: "profile"; value: z.infer<typeof profileSchema> }
  | { type: "toggle_saved"; jobId: string }
  | {
      type: "draft";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      project?: ProjectDescription;
      introduction?: string;
    }
  | {
      type: "submit";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      consent: boolean;
      project?: ProjectDescription;
      introduction?: string;
    }
  | { type: "stage"; applicationId: string; stage: Stage; note: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "publish"; job: z.infer<typeof jobSchema> }
  | { type: "company"; name: string; description: string };

export function initialState(): State {
  const state = stateSchema.parse({
    version: 1,
    activePersonId: null,
    ...marketplace,
    people,
    applications: [],
    saved: [],
    drafts: [],
  });
  const bob = state.people.find((x) => x.id === "candidate-marek")!;
  const job = state.jobs[0];
  state.applications.push({
    id: "application-example",
    candidateId: bob.id,
    jobId: job.id,
    companyId: job.companyId,
    jobTitle: job.title,
    candidateName: bob.name,
    cv: bob.cv,
    answer:
      "Pracowałem nad automatyzacją obsługi zgłoszeń. Poprowadziłem badania z użytkownikami i wdrożenie, które skróciło czas odpowiedzi o 25%. Chętnie opowiem o decyzjach i ograniczeniach tego projektu.",
    project: {
      problem:
        "W syntetycznym projekcie platformy B2B zespół obsługi ręcznie kierował zgłoszenia do właściwych osób. Celem było ograniczenie oczekiwania klientów.",
      contribution:
        "Poprowadziłem warsztaty z obsługą i przygotowałem reguły kategoryzacji. Wybrałem pilotaż dla jednego rodzaju zgłoszeń, ponieważ zespół potrafił ręcznie sprawdzić błędy.",
      boundaries:
        "Sam opracowałem backlog i kryteria odbioru. Inżynierowie zbudowali integrację, a analityczka przygotowała pomiar. Korzystaliśmy z istniejącej platformy i gotowego modelu.",
      use: "Pilotaż działał przez cztery tygodnie w jednym zespole obsługi. Wdrożenie techniczne wykonali inżynierowie. Nie znam wyników późniejszego rozszerzenia.",
      result:
        "Według przygotowanego przez analityczkę porównania czterech tygodni przed pilotażem i w jego trakcie czas odpowiedzi zmalał o 25%. To wynik zespołu; nie mogę przypisać go wyłącznie swoim działaniom. Nie sprawdziliśmy wpływu sezonowości.",
      ai: "Model sugerował kategorię zgłoszenia. Porównałem jego sugestie z kategoriami przypisanymi wcześniej przez zespół obsługi. Przy niejednoznacznych zgłoszeniach pracownik wybierał kategorię ręcznie.",
    },
    projectContext: projectContextForRole(job),
    sourceNotes: "",
    generatedAnswer: "",
    score: bob.exampleScore,
    summary: bob.exampleSummary,
    stage: "submitted",
    events: [{ stage: "submitted", at: "2026-11-02T09:00:00.000Z", note: "" }],
  });
  return stateSchema.parse(state);
}
export function publishedJobs(state: State): JobWithCompany[] {
  return state.jobs
    .filter((x) => x.publicationStatus === "published")
    .map((job) => ({ ...job, company: state.companies.find((x) => x.id === job.companyId)! }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function currentPerson(state: State) {
  return state.people.find((x) => x.id === state.activePersonId);
}
export function hasHeldFirstConversation({ events }: Pick<Application, "events">) {
  return events.some((event) => event.stage === "first_conversation_held");
}
export function transition(
  state: State,
  action: Action,
  now = new Date().toISOString(),
  newId: string = crypto.randomUUID(),
): State {
  const s = structuredClone(state);
  const person = currentPerson(s);
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const candidate = () => {
    if (person?.role !== "candidate") return fail("Wybierz profil kandydata.");
    return person;
  };
  const employer = () => {
    if (person?.role !== "employer") return fail("Wybierz profil pracodawcy.");
    return person;
  };
  if (action.type === "select_person") {
    if (action.id !== null && !s.people.some((x) => x.id === action.id))
      fail("Nie znaleziono osoby.");
    s.activePersonId = action.id;
  } else if (action.type === "profile")
    Object.assign(candidate(), profileSchema.parse(action.value));
  else if (action.type === "toggle_saved") {
    const p = candidate();
    if (!s.jobs.some((x) => x.id === action.jobId)) fail("Nie znaleziono oferty.");
    const index = s.saved.findIndex((x) => x.candidateId === p.id && x.jobId === action.jobId);
    if (index >= 0) s.saved.splice(index, 1);
    else s.saved.push({ candidateId: p.id, jobId: action.jobId });
  } else if (action.type === "draft") {
    const p = candidate();
    const project = action.project ? projectDraftSchema.parse(action.project) : undefined;
    const draft = draftSchema.parse({
      ...action,
      candidateId: p.id,
      project,
      answer: project ? projectText(project) : action.answer,
    });
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === action.jobId));
    s.drafts.push(draft);
  } else if (action.type === "submit") {
    const p = candidate();
    const job = s.jobs.find((x) => x.id === action.jobId && x.publicationStatus === "published");
    if (!job) return fail("Oferta nie jest dostępna.");
    if (!action.consent) fail("Zatwierdź treść i zgodę na przesłanie aplikacji.");
    if (s.applications.some((x) => x.candidateId === p.id && x.jobId === job.id))
      fail("Aplikacja na tę ofertę została już wysłana.");
    const project = action.project ? projectSubmissionSchema.parse(action.project) : undefined;
    s.applications.push(
      applicationSchema.parse({
        id: newId,
        candidateId: p.id,
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateName: p.name,
        cv: p.cv,
        answer: project
          ? action.introduction?.trim()
            ? text.min(MIN_APPLICATION_ANSWER_LENGTH).parse(action.introduction)
            : projectText(project)
          : action.answer,
        project,
        projectContext: project ? projectContextForRole(job) : undefined,
        sourceNotes: action.notes,
        generatedAnswer: action.generated,
        score: p.exampleScore,
        summary: p.exampleSummary,
        stage: "submitted",
        events: [{ stage: "submitted", at: now, note: "" }],
      }),
    );
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === job.id));
  } else if (
    action.type === "review_save" ||
    action.type === "review_reveal" ||
    action.type === "review_decline" ||
    action.type === "review_note"
  ) {
    const p = employer();
    const application = s.applications.find(
      (a) => a.id === action.applicationId && a.companyId === p.companyId,
    );
    if (!application) return fail("Nie znaleziono aplikacji własnej firmy.");
    const record = application.reviews?.find((r) => r.recruiterId === p.id);
    if (action.type === "review_note") {
      if (!record || !reviewComplete(record)) return fail("Najpierw zakończ ocenę kandydata.");
      if (hasHeldFirstConversation(application))
        return fail("Po pierwszej rozmowie zapisz notatkę przy aktualnym etapie.");
      record.completionNote = text.parse(action.note);
    } else {
      if (!["submitted", "reviewed"].includes(application.stage))
        return fail("Ocena jest dostępna tylko przed zaproszeniem lub odrzuceniem.");
      let outcome: Stage | undefined;
      let eventNote = "";
      if (action.type === "review_reveal" || action.type === "review_decline") {
        if (
          !record ||
          !hasDoubts(record.first.assessment) ||
          record.revealedAt ||
          reviewComplete(record)
        )
          return fail("Dodatkowe informacje nie są dostępne w tym kroku.");
        if (action.type === "review_reveal") record.revealedAt = now;
        else {
          record.declinedAt = now;
          record.completedAt = now;
          outcome = reviewOutcome(record.first.assessment);
          eventNote = record.first.note;
        }
      } else {
        const value = reviewInputSchema.parse(action.value);
        const round = { ...value, at: now };
        if (record) {
          if (!record.revealedAt || reviewComplete(record))
            return fail("Ponowna ocena nie jest dostępna w tym kroku.");
          record.followups.push(round);
          record.completedAt = now;
          outcome = reviewOutcome(value.assessment);
        } else {
          (application.reviews ??= []).push({
            recruiterId: p.id,
            first: round,
            followups: [],
            flowVersion: 2,
            completedAt: hasDoubts(value.assessment) ? undefined : now,
          });
          if (!hasDoubts(value.assessment)) outcome = reviewOutcome(value.assessment);
        }
        eventNote = value.note;
      }
      if (outcome) {
        if (application.stage === "submitted" && outcome === "interview_invited") {
          application.stage = "reviewed";
          application.events.push({ stage: "reviewed", at: now, note: "" });
        }
        if (application.stage !== outcome) {
          application.stage = outcome;
          application.events.push({ stage: outcome, at: now, note: eventNote });
        }
      }
    }
  } else if (
    action.type === "e01_first" ||
    action.type === "e01_reveal" ||
    action.type === "e01_second"
  ) {
    const p = employer();
    const application = s.applications.find(
      (a) => a.id === action.applicationId && a.companyId === p.companyId,
    );
    if (!application) return fail("Nie znaleziono aplikacji własnej firmy.");
    const record = application.e01?.find((r) => r.recruiterId === p.id);
    if (action.type === "e01_first") {
      if (record) return fail("Pierwsza ocena została już zapisana.");
      const value = firstAssessmentSchema.parse(action.value);
      (application.e01 ??= []).push({
        revision: 5,
        recruiterId: p.id,
        requirement: value.requirement,
        first: value.assessment,
        firstAt: now,
      });
    } else {
      if (!record || !hasDoubts(record.first) || record.second)
        return fail("Ta ścieżka E01 jest niedostępna.");
      if (action.type === "e01_reveal") {
        if (record.revealedAt) return fail("Opis został już pokazany.");
        record.revealedAt = now;
      } else {
        if (!record.revealedAt) return fail("Najpierw pokaż opis projektu.");
        record.second = { ...secondAssessmentSchema.parse(action.value), at: now };
      }
    }
  } else if (action.type === "stage_note") {
    const p = employer();
    const application = s.applications.find(
      (candidate) => candidate.id === action.applicationId && candidate.companyId === p.companyId,
    );
    if (!application || !hasHeldFirstConversation(application))
      return fail("Notatkę do etapu można zapisać po pierwszej rozmowie.");
    if (application.stage !== action.stage) return fail("Etap procesu się zmienił.");
    application.events.at(-1)!.note = text.parse(action.note);
  } else if (action.type === "stage" || action.type === "withdraw") {
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application) return fail("Nie znaleziono aplikacji.");
    const stage = action.type === "withdraw" ? "withdrawn" : action.stage;
    if (action.type === "withdraw") {
      const p = candidate();
      if (
        application.candidateId !== p.id ||
        ["hired", "rejected", "withdrawn"].includes(application.stage)
      )
        fail("Nie można wycofać tej aplikacji.");
    } else {
      const p = employer();
      if (application.companyId !== p.companyId || !nextStages[application.stage].includes(stage))
        fail("Ta zmiana etapu nie jest dostępna.");
    }
    application.stage = stage;
    application.events.push({ stage, at: now, note: action.type === "stage" ? action.note : "" });
  } else if (action.type === "publish") {
    const p = employer();
    const job = jobSchema.parse(action.job);
    if (job.companyId !== p.companyId) fail("Wybierz ofertę własnej firmy.");
    const index = s.jobs.findIndex((x) => x.id === job.id);
    if (index >= 0) {
      if (s.jobs[index].companyId !== p.companyId) fail("Nie można zmienić tej oferty.");
      s.jobs[index] = job;
    } else s.jobs.unshift(job);
  } else if (action.type === "company") {
    const p = employer();
    Object.assign(
      s.companies.find((x) => x.id === p.companyId)!,
      { name: shortText.parse(action.name), description: text.parse(action.description) },
    );
  }
  return stateSchema.parse(s);
}
