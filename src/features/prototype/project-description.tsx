import { z } from "zod";

export const projectQuestions = [
  {
    key: "problem",
    label: "Jaki problem miał rozwiązać projekt i dla kogo?",
    help: "Opisz sytuację wyjściową oraz to, co miało się zmienić. To pozwala zrozumieć kontekst późniejszych działań, nie ocenia prestiżu projektu.",
  },
  {
    key: "contribution",
    label: "Co konkretnie zrobiłeś osobiście?",
    help: "Wskaż najważniejsze działania od momentu, w którym dołączyłeś, do zakończenia Twojego udziału. Przy jednym działaniu wyjaśnij podjętą przez Ciebie decyzję i jej powód. Unikaj samej listy narzędzi. Jeśli realizowałeś czyjąś decyzję lub korzystałeś z pomocy, opisz to.",
  },
  {
    key: "boundaries",
    label: "Gdzie kończył się Twój zakres, a zaczynała praca innych?",
    help: "Co było już gotowe, co wykonałeś samodzielnie lub wspólnie, a za co odpowiadały inne osoby? Jeśli projekt był samodzielny, wskaż wykorzystane gotowe rozwiązania. Użycie bibliotek, narzędzi lub AI samo nie oznacza braku wkładu; potrzebny jest opis wykonanej pracy.",
  },
  {
    key: "use",
    label: "Do jakiego etapu doszło rozwiązanie i kto z niego korzystał?",
    help: "Opisz, czy powstało demo, pilotaż, wdrożenie używane w pracy czy inny rezultat. Jeśli było używane, przez kogo i przez jaki okres, o ile wiesz. Jeśli wdrożenie wykonał ktoś inny, zaznacz to. Etapy opisujemy, nie tworzymy automatycznego rankingu; demo może być adekwatnym doświadczeniem dla danej roli.",
  },
  {
    key: "result",
    label: "Co się zmieniło i skąd wiesz, że taki był rezultat?",
    help: "Opisz wynik względem sytuacji wyjściowej. Jeśli masz pomiar, podaj co porównano, w jakim okresie i skąd pochodzi informacja. Bez pomiaru opisz konkretną obserwację i czego nadal nie wiadomo. Oddziel rezultat całego zespołu od efektu, który możesz powiązać z własnymi działaniami; nie wymagamy wykazania związku przyczynowego, którego nie da się ustalić. Brak poprawy, przerwany projekt i nieznany wynik mogą być uczciwą odpowiedzią.",
  },
] as const;

const answer = z.string().trim().max(2000);
export const projectDraftSchema = z.object({
  problem: answer,
  contribution: answer,
  boundaries: answer,
  use: answer,
  result: answer,
  ai: answer.optional(),
});
export const projectContextSchema = z.object({
  role: z.string().trim().min(1).max(200),
  requirement: z.string().max(12000),
  focus: z.string().max(500),
  prompts: z
    .array(
      z.object({
        key: z.enum(["problem", "contribution", "boundaries", "use", "result", "ai"]),
        label: z.string().max(500),
        help: z.string().max(2000),
      }),
    )
    .length(6)
    .optional(),
});
const roleFocus: Record<string, string> = {
  product: "discovery, priorytety, decyzje produktowe i sprawdzenie efektów pilotażu",
  engineering: "architektura, implementacja, testy, ewaluacja i utrzymanie systemu",
  data: "przygotowanie danych, analiza, ewaluacja i wiarygodność wyników",
  design: "badania, projektowanie interakcji, prototypowanie i testy z użytkownikami",
  marketing: "odbiorcy, przygotowanie kampanii, eksperymenty i pomiar efektów",
  operations: "proces operacyjny, automatyzacja, obsługa wyjątków i zmiana sposobu pracy",
};
export function projectContextForRole(job: {
  title: string;
  description: string;
  function: string;
}) {
  const context = {
    role: job.title,
    requirement: job.description,
    focus: roleFocus[job.function] ?? "działania, decyzje i efekty istotne dla wymagań tej roli",
  };
  return { ...context, prompts: roleProjectQuestions(context) };
}
export const aiQuestion = "Jak wykorzystałeś AI w swojej pracy i jak sprawdzałeś jego wyniki?";
export function roleProjectQuestions(context: z.infer<typeof projectContextSchema>) {
  if (context.prompts) return context.prompts;
  return [
    ...projectQuestions.map((question) => ({
      ...question,
      label:
        question.key === "contribution"
          ? `Co zrealizowałeś osobiście, co jest istotne dla roli ${context.role}?`
          : question.label,
      help: `${question.help} W kontekście roli ${context.role} uwzględnij: ${context.focus}.`,
    })),
    {
      key: "ai" as const,
      label: `Jak wykorzystałeś AI w zadaniach istotnych dla roli ${context.role} i jak sprawdzałeś wyniki?`,
      help: `Dla roli ${context.role} opisz konkretne zadanie, udział AI i własną kontrolę jakości. Uwzględnij: ${context.focus}. Jeśli nie korzystałeś z AI lub nie możesz podać szczegółów, zaznacz to wprost.`,
    },
  ];
}
export const projectSubmissionSchema = projectDraftSchema.refine(
  (value) => projectQuestions.every(({ key }) => value[key].length > 0),
  {
    message:
      "Odpowiedz na każde pytanie. Możesz wprost zaznaczyć brak wiedzy lub możliwości ujawnienia informacji.",
  },
);
export type ProjectDescription = z.infer<typeof projectDraftSchema>;
/** Group immutable submitted fields into the five recruiter information areas. */
export function reviewProjectAnswers(
  project: ProjectDescription | undefined,
  context: z.infer<typeof projectContextSchema>,
) {
  return roleProjectQuestions({ ...context, prompts: undefined })
    .filter(({ key }) => key !== "use")
    .map(({ key, label }) => ({
      key,
      label:
        key === "problem"
          ? "Jaki problem rozwiązywał projekt i jak wykorzystano rozwiązanie w praktyce?"
          : (context.prompts?.find((prompt) => prompt.key === key && prompt.label.trim())?.label ??
            label),
      answer:
        key === "problem"
          ? [project?.problem, project?.use && `Użycie rozwiązania: ${project.use}`]
              .filter(Boolean)
              .join("\n\n")
          : project?.[key],
    }));
}
export const emptyProject: ProjectDescription = {
  problem: "",
  contribution: "",
  boundaries: "",
  use: "",
  result: "",
};
export function projectText(project: ProjectDescription) {
  return [
    ...projectQuestions.map(({ key, label }) => `${label}\n${project[key]}`),
    ...(project.ai ? [`${aiQuestion}\n${project.ai}`] : []),
  ].join("\n\n");
}
export function ProjectDescriptionContent({
  project,
  context,
}: {
  project: ProjectDescription;
  context?: z.infer<typeof projectContextSchema>;
}) {
  const questions = context
    ? roleProjectQuestions(context)
    : [...projectQuestions, ...(project.ai ? [{ key: "ai" as const, label: aiQuestion }] : [])];
  return (
    <section className="project-description" aria-label="Opis projektu">
      <h3>Opis projektu</h3>
      <p className="record-caption">
        Deklaracja kandydata. Informacje nie zostały niezależnie zweryfikowane.
      </p>
      {questions.map(({ key, label }, index) => (
        <section key={key} className="project-question">
          <h4>
            {index + 1}. {label}
          </h4>
          <p>{project[key] || "Nie podano odpowiedzi."}</p>
        </section>
      ))}
    </section>
  );
}
