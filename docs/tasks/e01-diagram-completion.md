# E01 diagram completion

## Intent and acceptance

Complete the existing recruiter diagram flow in the working tree. The seeded application must support a session from the submitted answer and CV through five substantive project answers. Imported applications with missing project data must show which answers are unavailable after explicit reveal. Reassessment must open with no selected rating and no previous rating visible. The employer must be able to identify rejection from the recorded status. Saving the optional completion note must provide accurate feedback.

Reuse the Poster People record surface, reading sections, buttons and named dialog. Preserve the candidate-facing status wording, existing application snapshots and separate local records of the two assessments. Verify the branches, reload, keyboard, attachment actions and narrow layout.

## Separate review

Compared each branch with the supplied diagram. The two decisive first ratings finish immediately. The three uncertain ratings persist before the dialog, which can be dismissed and reopened. Declining finishes by first direction. Revealing shows five groups before an empty reassessment and keeps the first rating out of the rendered UI until completion. The unknown outcome records the reviewed stage. Optional post-decision notes go through a separate action and announce their own save while the button retains focus.

The seeded Marek application now snapshots the role and has a synthetic answer in each of the five groups. Older records can lack any project data. The reading section uses stable question keys, honors saved labels for matching keys, and identifies missing answers. The review creates no changes to earlier application snapshots or candidate-visible rejection wording.

The E01 dialog adapts the C18 reference with a white heading, outlined circular close control and paper content in one rounded surface. The E01 radio choices use the host selected ink treatment and keep the primary action pink.

## Verification

- ESLint, TypeScript, the production build, Prettier with automatic line endings, and all 48 unit tests passed.
- The installed-Chrome suite passed all 43 browser journeys with a 65-second per-test limit. In the first run, three screenshot-heavy journeys exceeded the default 30-second limit. The browser assertions cover the decision branches, CV download and preview, keyboard and dialog focus, blank reassessment after reload, notes, and viewport widths of 1280, 390 and 320 px.
- After the final selected-radio styling change, rebuilt the app and reran all nine E01 browser journeys in installed Chrome. All nine passed, including the Axe assertions in the three viewport journeys.
- Compared the rendered dialog at 1280 and 390 px with Poster People reference S11/C18. The captured screens use the existing record layout and Base UI controls. Screenshots are in `artifacts/e01-diagram-completion/`.
- `./scripts/verify` stopped at Prettier because this Windows checkout has 138 files with differing line endings. Independently, the host kit manifest check failed on the CRLF checkout of `.nvmrc`, and the baseline packet check failed on CSV line endings. The standalone kit checks passed all six tests and the local catalog returned HTTP 200 on port 8952. The reference kit and baseline packet files were not edited.
