# E01 answer length

## Acceptance

Save, export, reload and submit a structured application with all six answers at their 2,000-character limit and no separate introduction. Retain each answer in full. Keep the existing limits for standalone answers and introductions.

## Review and verification

The storage schemas accept a snapshot over 12,000 characters when it matches the text generated from the validated project fields. Saving structured drafts generates the snapshot from those fields. Standalone answers and explicit introductions retain the 12,000-character limit.

The production build, ESLint, changed-file formatting and all 51 unit tests passed. Four selected Chrome journeys passed. A separate Chrome run saved, reloaded and submitted six answers of 2,000 characters each through the form. The full verification script stopped at the existing CRLF/LF differences in the Windows checkout.
