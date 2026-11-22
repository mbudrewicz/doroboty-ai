import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { JobDescription } from "@/features/jobs/job-description";
import { assessmentLabels, hasDoubts, type Assessment } from "./e01";
import { reviewInputSchema, reviewComplete } from "./candidate-review";
import { CvAttachment } from "./cv-attachment";
import {
  currentPerson,
  employerStageLabels,
  hasHeldFirstConversation,
  type Application,
} from "./model";
import { projectContextForRole, projectText, reviewProjectAnswers } from "./project-description";
import { usePrototype } from "./store";

const moreHeadingId = "candidate-more-heading";
const moreHeadingHash = `#${moreHeadingId}`;
const assessmentHeadingId = "candidate-assessment-heading";
const assessmentHeadingHash = `#${assessmentHeadingId}`;

function CandidateAnswer({ answer }: { answer: string }) {
  return (
    <div className="candidate-answer-bubble">
      <strong>Odpowiedź kandydata</strong>
      <p>{answer}</p>
    </div>
  );
}

export function CandidateReviewPanel({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const location = useLocation();
  const person = currentPerson(state)!;
  const job = state.jobs.find((item) => item.id === application.jobId)!;
  const record = application.reviews?.find((item) => item.recruiterId === person.id);
  const last = record?.followups.at(-1) ?? record?.first;
  const completed = record ? reviewComplete(record) : false;
  const [assessment, setAssessment] = useState<Assessment | "">("");
  const [note, setNote] = useState(record?.completionNote ?? last?.note ?? "");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"assessment" | "note" | null>(null);
  const status = useRef<HTMLHeadingElement>(null);
  const more = useRef<HTMLHeadingElement>(null);
  const resume = useRef<HTMLButtonElement>(null);
  const about = useRef<HTMLHeadingElement>(null);
  const assessmentHeading = useRef<HTMLHeadingElement>(null);
  const screening = application.stage === "submitted" || application.stage === "reviewed";
  const canAssess = screening && !completed && (!record || record.revealedAt);
  const showResult = record && (completed || !screening);
  const context = application.projectContext ?? projectContextForRole(job);
  const independentAnswer =
    !application.project || application.answer !== projectText(application.project);

  useEffect(() => {
    const heading =
      location.hash === moreHeadingHash
        ? more.current
        : location.hash === assessmentHeadingHash
          ? assessmentHeading.current
          : null;
    if (!heading) return;
    // Run after the shell's route focus handling.
    const frame = requestAnimationFrame(() => {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  function save(event: FormEvent) {
    event.preventDefault();
    const value = reviewInputSchema.safeParse({ assessment, note });
    if (!value.success) {
      setError("Wybierz ocenę kandydata. Notatka może mieć maksymalnie 12 000 znaków.");
      return;
    }
    if (run({ type: "review_save", applicationId: application.id, value: value.data })) {
      setError("");
      setSaved("assessment");
      if (!record && hasDoubts(value.data.assessment)) setOpen(true);
      else requestAnimationFrame(() => assessmentHeading.current?.focus());
    }
  }

  const form = (
    <form className="candidate-review-form" onSubmit={save}>
      <h3 id={assessmentHeadingId} ref={assessmentHeading} tabIndex={-1}>
        Ocena kandydata
      </h3>
      {record?.revealedAt && <p>Oceń kandydata ponownie.</p>}
      <fieldset className="e01-options">
        <legend>Jak oceniasz kandydata?</legend>
        {Object.entries(assessmentLabels).map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="candidate-assessment"
              value={value}
              required
              checked={assessment === value}
              onChange={() => {
                setAssessment(value as Assessment);
                setSaved(null);
              }}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className="candidate-review-note">
        <h3>
          <label htmlFor="candidate-review-note">Notatka rekrutacyjna</label>
        </h3>
        <p className="record-caption" id="candidate-review-note-help">
          Zapisz pytania do rozmowy i informacje do sprawdzenia.
        </p>
        <Textarea
          id="candidate-review-note"
          aria-describedby="candidate-review-note-help"
          aria-label="Notatka rekrutacyjna (widoczna pracodawcy)"
          value={note}
          maxLength={12000}
          rows={5}
          placeholder="Co warto sprawdzić z kandydatem?"
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(null);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="candidate-review-save">
        <Button type="submit">Zapisz</Button>
      </div>
    </form>
  );

  return (
    <div className="candidate-review">
      <nav className="candidate-review-nav" aria-label="Sekcje kandydata">
        <Button variant="ghost" onClick={() => about.current?.focus()}>
          O kandydacie
        </Button>
        {record?.revealedAt && (
          <Link
            className={buttonVariants({ variant: "ghost" })}
            to={{ pathname: location.pathname, search: location.search, hash: moreHeadingHash }}
          >
            Dowiedz się więcej
          </Link>
        )}
        {(canAssess || showResult) && (
          <Link
            className={buttonVariants({ variant: "ghost" })}
            to={{
              pathname: location.pathname,
              search: location.search,
              hash: assessmentHeadingHash,
            }}
          >
            Ocena kandydata
          </Link>
        )}
      </nav>
      <section aria-labelledby="candidate-about-heading">
        <h3 id="candidate-about-heading" ref={about} tabIndex={-1}>
          O kandydacie
        </h3>
        {independentAnswer ? (
          <CandidateAnswer answer={application.answer} />
        ) : (
          <p>Brak oddzielnej wiadomości od kandydata.</p>
        )}
        <div className="candidate-review-cv">
          <h4>Załączone CV</h4>
          <CvAttachment
            candidateId={application.candidateId}
            fallbackText={application.cv}
            layout="row"
            preview={preview}
            previewControl={
              <Button
                variant="outline"
                size="sm"
                aria-expanded={preview}
                onClick={() => setPreview(!preview)}
              >
                {preview ? "Ukryj podgląd CV" : "Pokaż podgląd CV"}
              </Button>
            }
          />
        </div>
      </section>
      {record && !completed && !record.revealedAt && screening && (
        <section className="candidate-review-section">
          <h3 ref={status} tabIndex={-1}>
            Dokończ ocenę kandydata
          </h3>
          <p>
            Pierwsza ocena została zachowana. Zdecyduj, czy chcesz przeczytać dodatkowe informacje,
            zanim zakończysz ocenę.
          </p>
          <Button ref={resume} variant="outline" onClick={() => setOpen(true)}>
            Zapisz
          </Button>
        </section>
      )}
      {!record && screening && <section className="candidate-review-section">{form}</section>}
      {record?.revealedAt && (
        <section className="candidate-review-section" aria-labelledby={moreHeadingId}>
          <h3 id={moreHeadingId} ref={more} tabIndex={-1}>
            Dowiedz się więcej
          </h3>
          <p>Sprawdź dodatkowe informacje o kandydacie. Odpowiedzi są deklaracją kandydata.</p>
          <details className="candidate-role-context">
            <summary>Rola i wymagania: {context.role}</summary>
            <JobDescription description={context.requirement} compact />
          </details>
          {reviewProjectAnswers(application.project, context).map(({ key, label, answer }) => (
            <section className="project-question" key={key}>
              <h4>{label}</h4>
              {answer ? <CandidateAnswer answer={answer} /> : <p>Brak odpowiedzi w aplikacji.</p>}
            </section>
          ))}
          {screening && !completed && <div className="candidate-review-section">{form}</div>}
        </section>
      )}
      {showResult && (
        <section className="candidate-review-result" aria-labelledby={assessmentHeadingId}>
          <h3 id={assessmentHeadingId} ref={assessmentHeading} tabIndex={-1}>
            Ocena kandydata
          </h3>
          {saved === "assessment" && <p role="status">Ocena zapisana.</p>}
          <p>
            <strong>Pierwsza ocena:</strong> {assessmentLabels[record.first.assessment]}
          </p>
          {record.followups.length > 0 && (
            <p>
              <strong>Ocena po dodatkowych informacjach:</strong>{" "}
              {assessmentLabels[last!.assessment]}
            </p>
          )}
          <p className="candidate-review-current-stage">
            <span>Aktualny etap</span>
            <span className="record-stage">{employerStageLabels[application.stage]}</span>
          </p>
          {(record.completionNote ?? last?.note) && (
            <p className="candidate-saved-note">
              <strong>Zapisana notatka:</strong> {record.completionNote ?? last?.note}
            </p>
          )}
          {record.followups.length > 1 && (
            <details>
              <summary>Historia ocen ({record.followups.length + 1})</summary>
              <ol>
                {[record.first, ...record.followups].map((round, index) => (
                  <li key={index}>
                    {assessmentLabels[round.assessment]}
                    <p>{round.note}</p>
                    <time dateTime={round.at}>{new Date(round.at).toLocaleString("pl-PL")}</time>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {completed && !hasHeldFirstConversation(application) && (
            <form
              className="candidate-review-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (run({ type: "review_note", applicationId: application.id, note })) {
                  setSaved("note");
                }
              }}
            >
              <label className="field">
                Notatka rekrutacyjna (opcjonalnie)
                <Textarea
                  aria-label="Notatka do zakończonej oceny"
                  value={note}
                  maxLength={12000}
                  rows={4}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setSaved(null);
                  }}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" variant="outline">
                  Zapisz notatkę
                </Button>
                <span role="status">{saved === "note" ? "Zapisano notatkę." : ""}</span>
              </div>
            </form>
          )}
        </section>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="candidate-review-dialog"
          finalFocus={() =>
            record?.revealedAt
              ? more.current
              : completed
                ? assessmentHeading.current
                : (resume.current ?? status.current)
          }
        >
          <DialogHeader>
            <DialogTitle>Czy chcesz uzyskać więcej informacji o kandydacie?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Pierwsza ocena została zachowana. Możesz sprawdzić pięć odpowiedzi o projekcie,
            odpowiedzialności, wykorzystaniu AI i rezultatach, a następnie ponownie ocenić
            kandydata.
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (run({ type: "review_decline", applicationId: application.id })) {
                  setSaved("assessment");
                  setOpen(false);
                }
              }}
            >
              Nie, zakończ ocenę
            </Button>
            <Button
              onClick={() => {
                if (run({ type: "review_reveal", applicationId: application.id })) {
                  setAssessment("");
                  setSaved(null);
                  setOpen(false);
                }
              }}
            >
              Tak, pokaż informacje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
