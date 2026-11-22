import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CvAttachment } from "./cv-attachment";
import {
  assessmentLabels,
  decisionLabels,
  direction,
  firstAssessmentSchema,
  hasDoubts,
  secondAssessmentSchema,
} from "./e01";
import { currentPerson, type Application } from "./model";
import { ProjectDescriptionContent } from "./project-description";
import { usePrototype } from "./store";

function AssessmentOptions({ after = false }: { after?: boolean }) {
  return (
    <fieldset className="e01-options">
      <legend>
        {after
          ? "Jak oceniasz tego kandydata po zapoznaniu się z dodatkowymi informacjami?"
          : "Jak oceniasz tego kandydata na podstawie dostępnych informacji?"}
      </legend>
      {Object.entries(assessmentLabels).map(([value, label]) => (
        <label key={value}>
          <input type="radio" name="assessment" value={value} required />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

export function E01Review({
  application,
}: {
  application: Pick<Application, "id" | "candidateId" | "cv" | "answer" | "project" | "e01">;
}) {
  const { state, run } = usePrototype();
  const person = currentPerson(state)!;
  const record = application.e01?.find((r) => r.recruiterId === person.id);
  const heading = useRef<HTMLHeadingElement>(null);
  const projectHeading = useRef<HTMLHeadingElement>(null);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("");
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());
  const cv = (
    <>
      <h3>CV z momentu aplikowania</h3>
      <CvAttachment
        candidateId={application.candidateId}
        fallbackText={application.cv}
        layout="row"
        preview
      />
    </>
  );
  if (!record)
    return (
      <form
        className="e01-review e01-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = firstAssessmentSchema.safeParse({
            requirement: data.get("requirement"),
            assessment: data.get("assessment"),
          });
          if (!value.success) {
            setError("Wpisz wymaganie roli i wybierz ocenę.");
            return;
          }
          if (run({ type: "e01_first", applicationId: application.id, value: value.data })) {
            setError("");
            focusHeading();
          }
        }}
      >
        <p className="application-eyebrow">E01 · Ocena po CV</p>
        <label className="field">
          Wymaganie roli
          <Textarea name="requirement" required maxLength={2000} />
        </label>
        <p className="record-caption">
          Ustal wymaganie przed lekturą. Wszystkie dane kandydata są syntetyczne.
        </p>
        {cv}
        <AssessmentOptions />
        {error && <p role="alert">{error}</p>}
        <Button type="submit">Zapisz ocenę po CV</Button>
      </form>
    );

  return (
    <div className="e01-review e01-form">
      <p className="application-eyebrow">
        E01 ·{" "}
        {record.second || !hasDoubts(record.first)
          ? "Zakończono"
          : record.revealedAt
            ? "Ocena po dodatkowych informacjach"
            : "Ocena po CV zapisana"}
      </p>
      <h3 ref={heading} tabIndex={-1}>
        Zapis oceny E01
      </h3>
      <p>
        <strong>Wymaganie roli:</strong> {record.requirement}
      </p>
      <p>
        <strong>Ocena po CV:</strong> {assessmentLabels[record.first]}
      </p>
      <p className="record-caption">
        Kierunek:{" "}
        {direction(record.first) === "invite"
          ? "zaproszenie"
          : direction(record.first) === "reject"
            ? "odrzucenie"
            : "brak kierunku"}
        . Wątpliwości: {hasDoubts(record.first) ? "tak" : "nie"}.
      </p>
      {cv}
      {!hasDoubts(record.first) ? (
        <p role="status">
          Ścieżka zakończona po CV. Opisu nie pokazano. Nie znamy reakcji na dodatkowe informacje.
        </p>
      ) : !record.revealedAt ? (
        <>
          <p>Możesz przejść do dodatkowych informacji. Pierwsza ocena została zachowana.</p>
          <Button
            onClick={() => {
              if (run({ type: "e01_reveal", applicationId: application.id }))
                requestAnimationFrame(() => projectHeading.current?.focus());
            }}
          >
            Pokaż CV z opisem projektu
          </Button>
        </>
      ) : (
        <section className="project-question" aria-labelledby="e01-project-heading">
          <h3 id="e01-project-heading" ref={projectHeading} tabIndex={-1}>
            Dodatkowe informacje o wkładzie w projekt
          </h3>
          {application.project ? (
            <ProjectDescriptionContent project={application.project} />
          ) : (
            <>
              <p className="record-caption">
                Ta starsza aplikacja zawiera jedną odpowiedź zamiast pięciu pytań.
              </p>
              <p>{application.answer}</p>
            </>
          )}
          {record.second ? (
            <div className="e01-form" role="status">
              <p>
                <strong>Ocena po opisie:</strong> {assessmentLabels[record.second.assessment]}
              </p>
              <p>
                <strong>Decyzja w teście:</strong> {decisionLabels[record.second.decision]}
              </p>
              <p className="whitespace-pre-wrap">
                <strong>Uzasadnienie:</strong> {record.second.explanation}
              </p>
              <p>Obie oceny zapisano. Decyzja w teście nie zmienia etapu rekrutacji.</p>
            </div>
          ) : (
            <form
              className="e01-form"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const value = secondAssessmentSchema.safeParse({
                  assessment: data.get("assessment"),
                  decision: data.get("decision") || "unresolved",
                  explanation: data.get("explanation"),
                });
                if (!value.success) {
                  setError("Wybierz ocenę i zapisz uzasadnienie.");
                  return;
                }
                if (run({ type: "e01_second", applicationId: application.id, value: value.data })) {
                  setError("");
                  focusHeading();
                }
              }}
            >
              <AssessmentOptions after />
              <fieldset className="e01-options">
                <legend>Co decydujesz na tym etapie?</legend>
                <p id="e01-decision-help">
                  Jeśli nadal nie możesz podjąć decyzji, pozostaw wybór pusty. Zapiszemy „brak
                  decyzji — nadal potrzebne informacje”.
                </p>
                {(["invite", "reject"] as const).map((value) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      checked={decision === value}
                      onChange={() => setDecision(value)}
                      aria-describedby="e01-decision-help"
                    />
                    {decisionLabels[value]}
                  </label>
                ))}
                <Button type="button" variant="outline" onClick={() => setDecision("")}>
                  Wyczyść wybór decyzji
                </Button>
              </fieldset>
              <label className="field">
                Która informacja wpłynęła na Twoją ocenę lub ją potwierdziła? Jeśli nadal masz
                wątpliwości — czego brakuje?
                <Textarea name="explanation" required maxLength={4000} />
              </label>
              {error && <p role="alert">{error}</p>}
              <Button type="submit">Zapisz ocenę i zakończ</Button>
              <p className="record-caption">
                Do zapisu formularza druga ocena pozostaje nieukończona. Po odświeżeniu zapisane
                oceny i fakt pokazania opisu pozostaną zachowane.
              </p>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
