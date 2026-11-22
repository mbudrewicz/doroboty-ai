import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord } from "./application-record";
import { recruitingHistory } from "./candidate-review";
import { CandidateReviewPanel } from "./candidate-review-panel";
import {
  employerStageLabels,
  hasHeldFirstConversation,
  nextStages,
  type Application,
} from "./model";
import { usePrototype } from "./store";

export function RecruitingApplication({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLSpanElement>(null);
  const pendingFocus = useRef(false);
  const company = state.companies.find((item) => item.id === application.companyId);
  const availableStages = nextStages[application.stage];
  const screening = application.stage === "submitted" || application.stage === "reviewed";

  useLayoutEffect(() => {
    if (pendingFocus.current) {
      statusRef.current?.focus();
      pendingFocus.current = false;
    }
  }, [application.stage]);

  return (
    <>
      <ApplicationRecord
        application={application}
        companyName={company?.name ?? ""}
        audience="employer"
        history={recruitingHistory(application)}
        statusRef={statusRef}
        employerReading={<CandidateReviewPanel key={application.id} application={application} />}
        footer={
          screening ? undefined : availableStages.length > 0 ? (
            <>
              <div className="record-actions">
                {availableStages.map((stage) => (
                  <Button
                    key={stage}
                    variant={stage === "rejected" ? "outline" : "default"}
                    onClick={() => {
                      if (run({ type: "stage", applicationId: application.id, stage, note: "" })) {
                        setAnnouncement(`Zapisano etap: ${employerStageLabels[stage]}.`);
                        pendingFocus.current = true;
                      }
                    }}
                  >
                    {employerStageLabels[stage]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="record-caption">
              {employerStageLabels[application.stage]}. Brak kolejnych działań w tym procesie.
            </p>
          )
        }
      >
        {hasHeldFirstConversation(application) && (
          <RecruitingStageNote key={application.stage} application={application} />
        )}
      </ApplicationRecord>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function RecruitingStageNote({ application }: { application: Application }) {
  const { run } = usePrototype();
  const [note, setNote] = useState(application.events.at(-1)?.note ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <form
      aria-labelledby="recruiting-note-heading"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(
          run({
            type: "stage_note",
            applicationId: application.id,
            stage: application.stage,
            note,
          }),
        );
      }}
    >
      <h3 id="recruiting-note-heading">
        <label htmlFor="recruiting-note">Notatka rekrutacyjna</label>
      </h3>
      <p className="record-caption" id="recruiting-note-hint">
        Widoczna tylko dla pracodawcy w tym scenariuszu.
      </p>
      <Textarea
        id="recruiting-note"
        aria-describedby="recruiting-note-hint"
        maxLength={12000}
        rows={4}
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setSaved(false);
        }}
      />
      <div className="record-actions items-center">
        <Button type="submit" variant="outline">
          Zapisz notatkę
        </Button>
        <span role="status">{saved ? "Zapisano notatkę." : ""}</span>
      </div>
    </form>
  );
}
