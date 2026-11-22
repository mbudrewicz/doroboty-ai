# Windows line endings

## Intent and acceptance

Keep LF for tracked text on checkout, including on Windows with `core.autocrlf=true`. Preserve binary assets and the versioned design system. Run the full `npm run check` in a clean Windows checkout with that Git setting.

`FEATURES.md` was reviewed. The repository checkout policy does not change any application flow or the checks that the quality gate runs.
