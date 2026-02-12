# i18n Audit and Fix

## A) Audit Report

### Current implementation (before fix)

- **Config / provider**: Single `LanguageContext` + `LanguageProvider` in `app/(public)/_lib/LanguageContext.tsx`. No separate i18n lib; React Context + JSON dictionaries.
- **Dictionaries**: `app/(public)/_locales/en.json`, `app/(public)/_locales/bn.json` (landing + shared keys).
- **Persistence**: Cookie `landing_locale` and localStorage key `landing_locale` (client-only in `useEffect`).
- **Where provider was used**: Only `app/(public)/layout.tsx` wrapped children with `LanguageProvider`. So only the public landing route (`/`) had access to `useLanguage()`.

### Failure modes identified

| Area | Issue | Root cause |
|------|--------|------------|
| **Owner panel** | No language switching; any use of `useLanguage()` would throw | Owner (and all other panels) are not under `(public)` layout; they are under root → `owner/layout.jsx`. No `LanguageProvider` above them. |
| **Admin / Shop / Clinic / Staff / Producer / Country / Mother** | Same as owner | Same: no provider in their layout hierarchy. |
| **Landing (/) after navigation** | Language could appear to reset or not persist on deep link | Cookie was read only in client `useEffect`; initial render used default `"en"`, then effect ran. No server-side read, so `html lang` and first paint were not aligned with stored locale. |
| **Hydration risk** | First paint could be English then switch to Bengali after effect | Initial state was always `"en"`; locale was applied only after `useEffect` read cookie/localStorage. |
| **Deep link / refresh** | Stored locale might not apply on first paint | Server did not read cookie; only client did after mount. |
| **Cookie name** | Landing-specific name `landing_locale` | One app-wide cookie is clearer and works for all panels. |

### What was working

- On the public landing (`/`), `useLanguage()` and the language switcher worked because `(public)/layout.tsx` wrapped with `LanguageProvider`.
- Dictionaries and `t(key)` fallback (key as string when missing) worked.
- Setting cookie + localStorage on switch worked for the current tab/session.

---

## B) Fixes Applied

1. **Single provider at root**  
   Root layout (`app/layout.jsx`) now wraps the whole app with `I18nWrapper` (client component) that wraps `LanguageProvider`. Every route (landing, owner, admin, etc.) is under the same context.

2. **Server-read locale for initial paint**  
   Root layout is `async` and uses `cookies()` from `next/headers` to read `app_locale` (fallback: `landing_locale`) and passes it as `initialLocale` to `I18nWrapper` → `LanguageProvider`. So first paint and `html lang` match the stored locale; no flash and no hydration mismatch from locale.

3. **One cookie name + backward compat**  
   Context now uses `APP_LOCALE_COOKIE = "app_locale"` for writes and reads both `app_locale` and `landing_locale` when reading (so old bookmarks/sessions still work). On switch, both cookies are set so all parts of the app see the same value.

4. **LanguageProvider accepts `initialLocale`**  
   `LanguageProvider` takes optional `initialLocale` and uses it as initial state instead of always `"en"`, so server and client agree on first render.

5. **Removed duplicate provider**  
   `LanguageProvider` was removed from `app/(public)/layout.tsx` so only the root wrapper provides context.

6. **Shared `common` namespace**  
   Added `common.save`, `common.cancel`, `common.loading` in `en.json` and `bn.json` so any panel can use `t('common.save')` etc. without adding a new lib.

---

## C) How to Test Language Switching

### Public landing (`/`)

1. Open `/` (owner mode: e.g. `npm run dev:owner` and go to http://localhost:3104/).
2. In the header, use the language switcher (EN | বাংলা). Click "বাংলা"; header and content should switch to Bengali.
3. Refresh the page: language should stay Bengali.
4. Open a new tab and go to `http://localhost:3104/#faq`. Language should still be Bengali (cookie is set).
5. Change to EN, then go to `/owner/login`. Come back to `/`. Language should still be EN.

### Deep link and refresh

1. Set language to Bengali on `/`.
2. Copy the URL and open it in a new tab (or refresh). Page should load in Bengali immediately (no flash to EN).
3. Navigate to `/owner/login` (or any panel). Then go back to `/`. Language should remain Bengali.

### Owner (and other panels)

1. Set language to Bengali on `/`.
2. Navigate to `/owner/login` (or `/owner/dashboard` when logged in). Panel UI is not yet translated (no owner-specific keys), but:
   - Any component that uses `useLanguage()` and a key that exists (e.g. `common.loading`) will show the correct language.
   - No "useLanguage must be used within LanguageProvider" error, because the root layout now provides the context.

### Persistence across tabs

1. Tab A: open `/`, set language to Bengali.
2. Tab B: open `/` (or any route). Language should be Bengali (cookie is shared).

---

## Files Changed

| File | Change |
|------|--------|
| `app/layout.jsx` | Async root layout; import `cookies` from `next/headers` and `I18nWrapper`; read `app_locale` / `landing_locale`; set `html lang`; wrap children with `<I18nWrapper initialLocale={lang}>`. |
| `app/(public)/_lib/LanguageContext.tsx` | Export `APP_LOCALE_COOKIE`; support `initialLocale` in `LanguageProvider`; write both `app_locale` and `landing_locale`; read both when reading cookie; add `useLanguageOptional`; document that provider must wrap app. |
| `app/(public)/_lib/I18nWrapper.tsx` | New client component that wraps `LanguageProvider` and accepts `initialLocale` for root layout. |
| `app/(public)/layout.tsx` | Removed `LanguageProvider` import and wrapper; layout only renders landing shell. |
| `app/(public)/_locales/en.json` | Added `common.save`, `common.cancel`, `common.loading`. |
| `app/(public)/_locales/bn.json` | Same `common.*` keys in Bengali. |
| `docs/I18N_AUDIT_AND_FIX.md` | This audit, fix summary, and testing checklist. |

---

## Summary

- **Why it was broken**: i18n was only provided under `(public)` layout, so only `/` had context; other panels had no provider. Locale was read only on the client, so first paint and `html lang` did not use the stored locale and hydration could mismatch.
- **What we did**: One app-wide provider at root, server-read cookie for `initialLocale`, single cookie name with legacy fallback, and removal of the duplicate provider from the public layout. Panels can now use `useLanguage()` and share the same locale and persistence.
