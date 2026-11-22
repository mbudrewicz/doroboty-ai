# E01 notes after the first interview

## Intent and acceptance

Use the recorded first-interview event as the boundary for editing notes. Before it, a completed assessment accepts an assessment note. From the first-interview stage onward, the assessment note remains readable and the separate recruiter note editor saves to the current stage's existing history entry. Stage navigation keeps stage notes separate and candidate history continues to show only stage and date.

Reuse the existing record sheet, controls and status pill in the assessment summary. Validate the same note boundaries in the UI and domain. Test persistence, application ownership, stale writes and the handoff between note editors.

## Separate review

Both editors use the first-interview event in history to establish the handoff, including after a subsequent stage or terminal decision. The stage-note action checks employer ownership and the current stage before replacing the note on that stage entry. The saved assessment note remains in the assessment summary and its original history entry. The separate form loads the current stage note and saves it through its own button. The candidate history projection stays limited to stage and date.

## Verification

The production build, ESLint, formatting of changed files and all 50 unit tests passed. All 12 selected Chrome journeys passed on port 3106, including the assessment-to-stage handoff, save and reload, next-stage isolation and candidate visibility. An earlier run on port 3107 reached the same end-to-end assertions but failed the test's fixed local-origin check. Reviewed the assessment pill and separate editor in `artifacts/e01-stage-notes/`. The local Vite server served the updated copy. The repository verification script stopped at the existing line-ending differences in 138 files.
