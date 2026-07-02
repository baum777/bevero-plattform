# Intent — P1 test cleanstate fix

- date: 2026-07-02
- slice: p1-test-cleanstate-fix
- intentMemory: preserve semantic contract testing and avoid product-code churn when current behavior is correct

## Core intention

Keep the mobile movement quick-action contract protected without coupling the test to an exact implementation string.

## Logic followed

The contract should verify the behavior-relevant chain:

1. the page reads search params via `useSearchParams`,
2. it reads the `type` query parameter,
3. it validates that value with `isMovementType`,
4. it applies the validated movement type through `setMovementType`.

Optional chaining on `searchParams?.get("type")` is functionally acceptable for this contract and should not make the test red by itself.

## Assumptions

- The current checkout already contains the intended semantic test shape.
- The untracked spec-pack files are productization/spec artifacts and should not be deleted or committed without owner direction.

## Tradeoffs accepted

- Ran the targeted red-test validation only, not the full CI suite, because the task requested a small local P1 block and forbade broad changes.
- Updated report/work documentation even though no source fix was necessary.

## Reuse later

For source-reading contract tests, prefer semantic assertions over exact string matches when the code path is functionally equivalent.

## Do not reuse blindly

Do not treat untracked specification artifacts as canonical or commit-ready just because they look structured; require an owner decision first.
