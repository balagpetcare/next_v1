# TypeScript vs Next.js generated output

## Rule

**`tsc` / IDE project-wide typecheck** uses [`tsconfig.json`](../tsconfig.json) and must **not** compile files under **`.next/**` or legacy **`.next-*`** output roots. Those are build artifacts (typed routes, validators) that can be stale, mode-specific (`SITE_MODE`), or temporarily invalid — they are not source of truth.

- **Source of truth:** `app/`, `src/`, `lib/`, `*.ts` / `*.tsx` at repo root (per `include`), minus `exclude`.
- **Full app validation:** `next build` (and `next dev`) run the Next.js compiler pipeline on real sources.

ESLint already ignores `.next/**` via [`eslint.config.mjs`](../eslint.config.mjs).

## What changed (hygiene)

`tsconfig.json` previously **included** many `.next/.../types/**/*.ts` paths *and* a broad `**/*.ts`, which still picked up `.next` because **`exclude` did not list `.next`**. Generated files under `.next/clinic`, `.next/doctor`, etc. then produced **false `tsc` errors**.

Fix: **`exclude`** `.next` and hyphenated `.next-*` dirs; **`include`** only `next-env.d.ts` + `**/*.ts` + `**/*.tsx` (no explicit `.next` includes).

## If you need generated route types in the editor

Run `next dev` or `next build` for your mode; the Next.js plugin in `compilerOptions.plugins` still applies during **Next**’s own checks. Strict `Link` href route typing from generated `.next/types` may be weaker in standalone `tsc` — that is an accepted tradeoff for stable CI/local `tsc`.

**Last updated:** 2026-03-21
