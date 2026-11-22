# End-to-end coverage for public entry and scenario recovery

## Intent

Extend the existing Playwright suite with two user journeys that cross page or browser boundaries.

## Acceptance criteria

- An anonymous visitor can start from a public offer, select a candidate persona, and land on the application form for that offer.
- A real scenario export can be imported in a separate browser context. Canceling import leaves the destination unchanged. Confirming import restores a saved offer and an edited project draft after reload.
- Both tests run through the existing Playwright configuration and pass the full `./scripts/verify` gate.
- The GitHub Actions job identifies Playwright in its verification step and discovers both tests through that same gate.

## Scope

Test coverage only. The current behavior register was reviewed and requires no update because product behavior does not change.

## Verification

- `./scripts/verify` passed in an isolated LF checkout on Windows with Node.js 24 and the provisioned Playwright Chromium. The suite ran 51 unit tests and 45 browser tests, including both new journeys.
- All 35 files in the static build matched the Q4.1 build byte for byte.
- A separate review confirmed that both tests use browser UI controls and isolated storage, and that the recovery test imports the actual downloaded file.
