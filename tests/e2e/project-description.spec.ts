import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { projectQuestions } from "../../src/features/prototype/project-description";
import { STORAGE_KEY } from "../../src/features/prototype/storage";

for (const width of [1280, 390, 320]) {
  test(`candidate draft and conditional recruiter review at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#/auth/sign-in");
    await page.getByRole("button", { name: "Wejdź jako Anna Kowalska", exact: true }).click();
    await page.goto("/#/aplikuj/ai-product-manager");
    const fields = projectQuestions.map((_, index) =>
      page.getByLabel(new RegExp(`^${index + 1}\\. `)),
    );
    await expect(page.locator("main form").getByRole("textbox")).toHaveCount(7);
    await page
      .getByLabel("Odpowiedź dla rekrutera (opcjonalnie)")
      .fill("Chcę rozwijać produkty AI; mam doświadczenie w badaniach i pilotażach.");
    await fields[0].fill("Syntetyczny projekt: obsługa zgłoszeń klientów.");
    await page
      .getByLabel(/^6\. /)
      .fill("AI porządkowało syntetyczne zgłoszenia. Samodzielnie sprawdzałam etykiety i błędy.");
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await expect(page.getByRole("status")).toHaveText("Szkic został zapisany.");
    await page.reload();
    await expect(fields[0]).toHaveValue("Syntetyczny projekt: obsługa zgłoszeń klientów.");
    await expect(fields[1]).toHaveValue("");
    await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
    await expect(fields[1]).toBeFocused();
    await expect(fields[1]).toHaveAttribute("aria-invalid", "true");
    const answers = [
      "Poprowadziłam badania i wybrałam pilotaż, aby ograniczyć ryzyko.",
      "Integrację wykonali inżynierowie. Ja przygotowałam kryteria odbioru.",
      "Pilotaż był używany przez jeden zespół przez miesiąc.",
      "Nie znam wyniku liczbowego. Użytkownicy zgłaszali mniej ręcznych poprawek.",
    ];
    for (let index = 1; index < fields.length; index++)
      await fields[index].fill(answers[index - 1]);
    const approval = page.getByRole("checkbox");
    await approval.check();
    await fields[4].fill(`${answers[3]} To obserwacja zespołu.`);
    await expect(approval).not.toBeChecked();
    await page.getByRole("button", { name: "Zapisz szkic" }).click();
    await page.reload();
    for (let index = 1; index < 4; index++)
      await expect(fields[index]).toHaveValue(answers[index - 1]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).exclude("iframe").include("main form").analyze()).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/e01-recruiter-reading/form-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
    await expect(approval).toBeFocused();
    await approval.check();
    await page.getByRole("button", { name: "Wyślij aplikację", exact: true }).click();
    await expect(page).toHaveURL(/app\/aplikacje\?wyslano=1/);
    const record = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).applications.at(-1),
      STORAGE_KEY,
    );
    expect(record.project.contribution).toBe(answers[0]);
    expect(record.project.ai).toContain("syntetyczne zgłoszenia");
    expect(record.projectContext.focus).toContain("discovery");
    await page.goto("/#/auth/sign-in");
    await page.getByRole("button", { name: "Wejdź jako Karolina Wiśniewska", exact: true }).click();
    await page.goto(`/#/app/kandydaci/${record.id}`);
    await expect(page.getByRole("heading", { name: "O kandydacie", exact: true })).toBeVisible();
    const introduction = page.locator(".candidate-answer-bubble");
    await expect(introduction).toHaveCount(1);
    await expect(introduction).toContainText("Odpowiedź kandydata");
    await expect(introduction).toContainText("Chcę rozwijać produkty AI");
    const assessmentHeading = page.getByRole("heading", { name: "Ocena kandydata", exact: true });
    const sectionNav = page.getByRole("navigation", { name: "Sekcje kandydata" });
    const assessmentLink = sectionNav.getByRole("link", { name: "Ocena kandydata" });
    await expect(assessmentLink).toHaveAttribute(
      "href",
      `#/app/kandydaci/${record.id}#candidate-assessment-heading`,
    );
    await assessmentLink.click();
    await expect(assessmentHeading).toBeFocused();
    await expect(assessmentHeading).toBeInViewport();
    await expect(
      page.getByRole("heading", { name: "Dowiedz się więcej", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".record-meta")).not.toContainText("Match Score");
    await expect(page.locator(".record-summary")).toHaveCount(0);
    await page.getByRole("button", { name: "Pokaż podgląd CV" }).click();
    await expect(page.locator("iframe[title='Podgląd CV (PDF)']")).toBeVisible();
    await page.getByRole("button", { name: "Ukryj podgląd CV" }).click();
    const note = page.getByLabel("Notatka rekrutacyjna (widoczna pracodawcy)");
    const text = "Dopytać o podstawę wyniku i odpowiedzialność za wdrożenie.";
    await note.fill(text);
    await page.getByRole("button", { name: "Zapisz", exact: true }).click();
    await expect(page.getByLabel("Zdecydowanie zapraszam.", { exact: true })).toBeFocused();
    await page.getByLabel("Raczej zapraszam, ale mam wątpliwości.", { exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByLabel("Nie wiem — brakuje mi informacji.", { exact: true }),
    ).toBeChecked();
    await page.getByRole("button", { name: "Zapisz", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Czy chcesz uzyskać więcej informacji o kandydacie?");
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/e01-recruiter-reading/dialog-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Zapisz" })).toBeFocused();
    await page.reload();
    await expect(page.locator(".record-meta .record-stage")).toHaveText("Aplikacja wysłana");
    await expect(
      page.getByRole("heading", { name: "Dowiedz się więcej", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Zapisz" }).click();

    await page.getByRole("button", { name: "Tak, pokaż informacje" }).click();
    await expect(
      page.getByRole("heading", { name: "Dowiedz się więcej", exact: true }),
    ).toBeFocused();
    await expect(page.locator(".candidate-review")).toContainText(answers[0]);
    await expect(note).toHaveValue(text);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByText("Pierwsza ocena:", { exact: true })).toHaveCount(0);
    await expect(page.locator(".candidate-review-result")).toHaveCount(0);
    await expect(page.locator(".candidate-review-section > .project-question")).toHaveCount(5);
    const moreSection = page.getByRole("region", { name: "Dowiedz się więcej" });
    const moreHeading = moreSection.getByRole("heading", {
      name: "Dowiedz się więcej",
      exact: true,
    });
    await expect(moreSection).toContainText(
      "Sprawdź dodatkowe informacje o kandydacie. Odpowiedzi są deklaracją kandydata.",
    );
    await expect(moreSection).not.toContainText("Dodatkowe odpowiedzi ·");
    await expect(moreSection.locator(".candidate-answer-bubble")).toHaveCount(5);
    await expect(moreSection.locator(".candidate-review-form > h3:first-child + p")).toHaveText(
      "Oceń kandydata ponownie.",
    );
    await assessmentLink.focus();
    await page.keyboard.press("Enter");
    await expect(assessmentHeading).toBeFocused();
    await expect(assessmentHeading).toBeInViewport();
    await page.reload();
    await expect(assessmentHeading).toBeFocused();
    await expect(assessmentHeading).toBeInViewport();
    const moreLink = sectionNav.getByRole("link", { name: "Dowiedz się więcej" });
    await expect(moreLink).toHaveAttribute(
      "href",
      `#/app/kandydaci/${record.id}#candidate-more-heading`,
    );
    await moreLink.focus();
    await page.keyboard.press("Enter");
    await expect(moreHeading).toBeFocused();
    await expect(moreHeading).toBeInViewport();
    await moreLink.click();
    await expect(moreHeading).toBeFocused();
    await expect(moreHeading).toBeInViewport();
    await moreSection
      .locator(".project-question")
      .first()
      .screenshot({
        path: `artifacts/e01-recruiter-reading/answer-${width}.png`,
      });
    await page.reload();
    await expect(moreHeading).toBeFocused();
    await expect(moreHeading).toBeInViewport();
    await expect(note).toHaveValue(text);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.locator(".candidate-review-result")).toHaveCount(0);
    await page.getByLabel("Raczej zapraszam, ale mam wątpliwości.", { exact: true }).check();
    await note.fill(`${text} Sprawdzić rolę analityczki.`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).exclude("iframe").include(".recruiting-record").analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: `artifacts/e01-recruiter-reading/second-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Zapisz", exact: true }).click();
    await expect(assessmentHeading).toBeFocused();
    const result = page.getByRole("region", { name: "Ocena kandydata" });
    await expect(result).toContainText("Pierwsza ocena: Nie wiem — brakuje mi informacji.");
    await expect(result).toContainText(
      "Ocena po dodatkowych informacjach: Raczej zapraszam, ale mam wątpliwości.",
    );
    await result.screenshot({
      path: `artifacts/e01-completed-assessment/result-${width}.png`,
    });
    await page.reload();
    await expect(page.locator(".record-meta .record-stage")).toHaveText("Zaproszenie na rozmowę");
    await assessmentLink.click();
    await expect(assessmentHeading).toBeFocused();
    await expect(assessmentHeading).toBeInViewport();
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).applications.at(-1),
      STORAGE_KEY,
    );
    expect(stored.reviews[0].first.assessment).toBe("unknown");
    expect(stored.reviews[0].first.note).toBe(text);
    expect(
      stored.reviews[0].followups.map((round: { assessment: string }) => round.assessment),
    ).toEqual(["lean_invite"]);
  });
}
for (const [assessment, stage] of [
  ["Zdecydowanie zapraszam.", "Zaproszenie na rozmowę"],
  ["Zdecydowanie odrzucam.", "Odrzucenie kandydata"],
]) {
  test(`decisive assessment advances without offering more information: ${stage}`, async ({
    page,
  }) => {
    await page.goto("/#/auth/sign-in");
    await page.getByRole("button", { name: "Wejdź jako Karolina Wiśniewska", exact: true }).click();
    await page.goto("/#/app/kandydaci/application-example");
    await page.getByLabel(assessment, { exact: true }).check();
    await page.getByRole("button", { name: "Zapisz", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Dowiedz się więcej", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".record-meta .record-stage")).toHaveText(stage);
  });
}

for (const [assessment, stage] of [
  ["Raczej zapraszam, ale mam wątpliwości.", "Zaproszenie na rozmowę"],
  ["Raczej odrzucam, ale mam wątpliwości.", "Odrzucenie kandydata"],
  ["Nie wiem — brakuje mi informacji.", "W przeglądzie"],
]) {
  test(`declining extra material completes by first direction: ${stage}`, async ({ page }) => {
    await page.goto("/#/auth/sign-in");
    await page.getByRole("button", { name: "Wejdź jako Karolina Wiśniewska", exact: true }).click();
    await page.goto("/#/app/kandydaci/application-example");
    await page.getByLabel(assessment, { exact: true }).check();
    await page.getByRole("button", { name: "Zapisz", exact: true }).click();
    await page.getByRole("button", { name: "Nie, zakończ ocenę" }).click();
    await expect(page.locator(".record-meta .record-stage")).toHaveText(stage);
    await expect(
      page.getByRole("heading", { name: "Dowiedz się więcej", exact: true }),
    ).toHaveCount(0);
    await page
      .getByLabel("Notatka do zakończonej oceny")
      .fill("Notatka po decyzji, bez zmiany oceny.");
    await page.getByRole("button", { name: "Zapisz notatkę", exact: true }).click();
    const history = page.getByRole("region", { name: "Historia procesu" });
    await expect(history).toContainText("Notatka po decyzji, bez zmiany oceny.");
    await expect(page.getByText("Zapisano notatkę.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zapisz notatkę", exact: true })).toBeFocused();
    await page.reload();
    await expect(page.getByLabel("Notatka do zakończonej oceny")).toHaveValue(
      "Notatka po decyzji, bez zmiany oceny.",
    );
    await expect(page.locator(".record-meta .record-stage")).toHaveText(stage);
    await expect(history).toContainText("Notatka po decyzji, bez zmiany oceny.");
  });
}

test("the prepared E01 candidate reveals five substantive answers before a fresh decision", async ({
  page,
}) => {
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: "Wejdź jako Karolina Wiśniewska", exact: true }).click();
  await page.goto("/#/app/kandydaci/application-example");
  await expect(page.getByText(/Pracowałem nad automatyzacją obsługi zgłoszeń/)).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Pobierz CV (PDF)" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("marek-nowak-cv-v1.pdf");
  await expect(page.getByText(/Model sugerował kategorię zgłoszenia/)).toHaveCount(0);

  const form = page.locator(".candidate-review-form");
  await expect(form.getByRole("radio")).toHaveCount(5);
  await expect(form.getByRole("button", { name: "Zapisz", exact: true })).toBeVisible();
  await page.getByLabel("Raczej zapraszam, ale mam wątpliwości.", { exact: true }).check();
  await expect(form).not.toContainText(/Zapytamy|Po zapisie|dodatkow|zaproszenie na rozmowę/i);
  await expect(form.locator('input[type="radio"][aria-describedby]')).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await page.getByRole("button", { name: "Tak, pokaż informacje" }).click();
  const answers = page.locator(".project-question");
  await expect(answers).toHaveCount(5);
  await expect(answers.last()).toContainText("Model sugerował kategorię zgłoszenia.");
  await expect(answers.getByText("Brak odpowiedzi w aplikacji.")).toHaveCount(0);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByText("Pierwsza ocena:", { exact: true })).toHaveCount(0);
  await page.getByLabel("Raczej odrzucam, ale mam wątpliwości.", { exact: true }).check();
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.locator(".record-meta .record-stage")).toHaveText("Odrzucenie kandydata");
  await page.getByRole("link", { name: "Kandydaci", exact: true }).last().click();
  await expect(page.getByText("Odrzucenie kandydata", { exact: true })).toBeVisible();
});
