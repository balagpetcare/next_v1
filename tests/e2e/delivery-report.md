# Delivery flow E2E report

Generated: 2026-04-11T20:42:18.336Z

## Verdict: FAIL

## Passed steps (0)

## Failed steps (5)
- 1. Branch login + create request: locator.waitFor: Timeout 60000ms exceeded.
Call log:
[2m  - waiting for locator('[aria-label="Product list"]') to be visible[22m

- 2. Owner allocation plan: No request id
- 3. Warehouse pick wave 1: No plan id
- 4. Warehouse pick wave 2: missing ids
- 8. Legacy fulfill blocked (409): request/org id

## Errors
- 1. Branch login + create request: locator.waitFor: Timeout 60000ms exceeded.
Call log:
[2m  - waiting for locator('[aria-label="Product list"]') to be visible[22m

- 2. Owner allocation plan: No request id
- 3. Warehouse pick wave 1: No plan id
- 4. Warehouse pick wave 2: missing ids
- 8. Legacy fulfill blocked (409): request/org id

## Missing / not implemented in UI
- Dispatches from API — cannot receive without dispatch ids

## Risk summary
- See failed steps and environment prerequisites.

## Production readiness
Do not treat as production-ready until failed steps are resolved and prerequisites are documented for operators.
