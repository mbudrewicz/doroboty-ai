# E01 completed assessment

## Intent and acceptance

Keep the assessment heading and its in-page link available when a saved assessment replaces the form. Show both ratings after reassessment, below the additional information, and focus the completed section on save. Keep the first rating hidden while reassessment is in progress.

Project the saved completion note into the employer process history. Replace the review's own outcome note when the outcome created a stage entry. When a review concludes at an existing stage, include the note under that stage and keep any separate stage note. Editing or clearing the review note must preserve both ratings, dates, stages and unrelated notes. Candidate history continues to project stage and date.

## Separate review

The assessment link targets the same heading ID in both the form and the saved summary. After save the summary follows the additional information and receives focus. The existing dialog focus still leads to the additional material on reveal and the summary on decline. The note editor appears for completed reviews.

The employer history projection uses the stored completion note and matches the review's outcome, completion time and original note before replacing history copy. A review with no outcome event attaches its note to the stage in effect at completion. The projection leaves the source stage events intact. Clearing a review note removes its history copy while preserving any unrelated stage notes. The candidate controller continues to pass only stage and date.

## Verification

The production build, ESLint, changed-file formatting and all 50 unit tests passed. The 11 Chrome journeys passed, including saved summary focus and navigation at 1280, 390 and 320 px, note replacement in the employer history, persistence after reload and candidate visibility checks. Inspected the mobile summary in `artifacts/e01-completed-assessment/result-390.png`. The local server served the updated history projection. The repository verification script stopped at the existing line-ending differences in 138 files.

## Copy follow-up

Remove the redundant post-screening caption below the candidate materials. The existing stage footer continues to provide the available actions or terminal status. Reviewed FEATURES.md and confirmed the copy removal requires no behavior-register update.
