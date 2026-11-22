import { expect, test } from "@playwright/test";

const offerPath = "/#/oferty/ai-product-manager";
const applicationPath = "/#/aplikuj/ai-product-manager";
const savedOffersPath = "/#/app/zapisane";
const settingsPath = "/#/app/settings";
const offerTitle = "AI Product Manager";
const candidate = "Wejdź jako Anna Kowalska";
const projectProblem = "1. Jaki problem miał rozwiązać projekt i dla kogo?";

test("a public offer keeps its application destination through persona selection", async ({
  page,
}) => {
  await page.goto(offerPath);
  await expect(page.getByRole("heading", { level: 1, name: offerTitle })).toBeVisible();
  await page.getByRole("link", { name: "Wybierz osobę i aplikuj" }).click();

  await expect(page.getByRole("heading", { name: "Wybierz osobę" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wejdź jako Karolina Wiśniewska" })).toHaveCount(0);
  await page.getByRole("button", { name: candidate, exact: true }).click();

  await expect(page).toHaveURL(applicationPath);
  await expect(page.getByRole("heading", { name: "Aplikuj na ofertę" })).toBeVisible();
  await expect(page.getByLabel(projectProblem)).toBeEditable();
});

test("a downloaded scenario restores a saved offer and project draft in another browser context", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const draft = "W ćwiczeniu AIPH3 zespół usprawnia obsługę syntetycznych zgłoszeń.";
  await page.goto("/#/auth/sign-in");
  await page.getByRole("button", { name: candidate, exact: true }).click();
  await page.goto(offerPath);
  await page.getByRole("button", { name: "Zapisz ofertę", exact: true }).click();
  await page.getByRole("link", { name: "Aplikuj", exact: true }).click();
  await page.getByLabel(projectProblem).fill(draft);
  await page.getByRole("button", { name: "Zapisz szkic" }).click();
  await expect(page.getByRole("status")).toHaveText("Szkic został zapisany.");

  await page.goto(settingsPath);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj dane" }).click();
  const exportPath = testInfo.outputPath("doroboty-scenariusz.json");
  await (await downloaded).saveAs(exportPath);

  const destination = await browser.newContext({ baseURL });
  try {
    const restored = await destination.newPage();
    await restored.goto("/#/auth/sign-in");
    await restored.getByRole("button", { name: candidate, exact: true }).click();
    await restored.goto(savedOffersPath);
    const emptySavedOffers = restored.getByText("Nie masz jeszcze zapisanych ofert.");
    await expect(emptySavedOffers).toBeVisible();

    await restored.goto(settingsPath);
    const importInput = restored.getByLabel("Importuj plik scenariusza");
    const confirmation = restored.getByRole("alertdialog", { name: "Zastąpić dane scenariusza?" });
    await importInput.setInputFiles(exportPath);
    await confirmation.getByRole("button", { name: "Anuluj" }).click();
    await restored.goto(savedOffersPath);
    await expect(emptySavedOffers).toBeVisible();

    await restored.goto(settingsPath);
    await importInput.setInputFiles(exportPath);
    await confirmation.getByRole("button", { name: "Importuj", exact: true }).click();
    await expect(restored.getByRole("status")).toHaveText("Dane zostały zaimportowane.");
    await restored.reload();
    await restored.goto(savedOffersPath);
    await restored.getByRole("link", { name: offerTitle, exact: true }).click();
    await expect(
      restored.getByRole("button", { name: "Zapisz ofertę", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await restored.getByRole("link", { name: "Aplikuj", exact: true }).click();
    await expect(restored.getByLabel(projectProblem)).toHaveValue(draft);
  } finally {
    await destination.close();
  }
});
