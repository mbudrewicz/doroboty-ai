# Project description prototype

Date: 2026-11-15

## Intent

Implement the approved I01/E01 first prototype: five project questions with explicit draft saving and a recruiter sequence from CV alone to CV plus project description. Reuse the existing application, reading sheet, CV and role boundaries. Use synthetic data only.

## Acceptance criteria

- Preserve the five approved Polish questions and supporting guidance.
- Partial answers survive explicit draft save and reload; editing clears approval.
- Validate structured answers in forms and domain operations with shared Zod schemas. Preserve existing version-1 records and hidden legacy metadata.
- Submitted project answers and CV are snapshots. Recruiters see CV first and reveal project answers explicitly; do not expose scenario score/summary before or during this comparison.
- Reuse Base UI controls, CV attachment and host Poster People surfaces; check keyboard, mobile, long content, errors and recovery.
- Update FEATURES.md, run scripts/verify and perform a separate review. Record actual failures and limits.

## Validation and review

- Implemented five approved Polish prompts and full guidance in `project-description.tsx`; each answer permits 2000 characters, with an explicit unknown/confidential answer allowed. Partial drafts use the shared draft schema; submission uses the shared complete schema. No qualitative answer is scored.
- Kept version-1 persistence additive through optional project fields. Legacy drafts retain their original editor and hidden metadata; existing saved scenarios are not overwritten. New submissions snapshot structured answers and the CV. The prepared Marek application includes a synthetic project example for fresh/reset scenarios.
- Extended RecordSheet with an optional reading body. Employer detail starts with CV alone, reveals the same CV plus structured answers, and can return to CV. Notes survive reveal/hide and reload restarts the sequence. Employer detail omits scenario score/summary; list behavior remains unchanged. Candidate record tabs and role/company boundaries remain.
- Reused host tokens, Base UI controls, CvAttachment and RecordSheet. Updated FEATURES.md and the host record API documentation; the immutable reference kit was not edited.
- Node 24.22.1 was available but npm was absent. Downloaded npm 11.6.2 into ignored `artifacts/npm-runtime` and used a temporary launcher there; no global installation or dependency/lockfile change.
- `./scripts/verify` was executed through Git Bash. It stopped at formatting: 141 existing files had CRLF/LF differences. A separate `prettier --check . --end-of-line auto` passed. The unchanged design-system integrity check failed on `.nvmrc`; an independent audit found 31 exact hashes and 36 CRLF-only differences, with no other kit differences. Participant packet verification also failed on existing CSV CRLF/LF equality. These gates have not passed and were not weakened or rewritten.
- Lint, TypeScript, all 28 unit tests and production build passed. Build retained dependency-annotation and bundle-size warnings. The reference catalog was started at port 8952.
- The default browser suite could not launch because provisioned Playwright Chromium is missing. No browser or OS dependency was installed. Used an ignored temporary Playwright configuration targeting the already-installed Chrome. A full fallback run passed 33 of 36 journeys; the other three encountered Chrome's built-in PDF viewer in Axe. After excluding iframe internals from the application audit, all three affected journeys passed (both new 1440/375px flows and employer note/stage regression). This is 33 plus 3 passing journeys across runs, not a claim that the default Chromium gate passed.
- Application accessibility checks exclude the native PDF viewer internals, not application controls. Browser-owned `chrome://` and `chrome-extension://` PDF resources are excluded from remote-request assertions; network URLs remain checked. Original journeys deliberately resume synthetic legacy drafts, while the new file tests fresh five-question applications and the published-job journey exercises structured answers.
- Inspected `artifacts/project-description/form-375.png`, `cv-1440.png`, `cv-375.png`, `combined-1440.png` and `combined-375.png`. The actual PDF rendered in both CV-first screenshots. Full-page combined screenshots show an offscreen PDF compositor placeholder; those captures alone do not prove PDF painting after reveal. The same CV component remains mounted. No viewport overflow was observed in the new flows; existing long/custom-content checks also passed.
- Separate review covered the completed diff, approved wording, schema validation, consent reset, submitted snapshots, legacy forwarding, hidden material before reveal, note/focus retention, role isolation and feature-register accuracy. It caught a legacy form-mode change when submission removed the draft; freezing mode for the mounted form fixed this, and both celebration regressions passed afterward. `git diff --check` passed.
- The development server served the new module with HTTP 200 at port 3001. No human experiment, effectiveness result, CI, merge, publishing or human approval is claimed.
