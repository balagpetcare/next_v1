# GitHub Deployment Branch Reconciliation

**Date:** 2026-06-06  
**Repository:** `bpa_web`

---

## Why the reports conflicted

Two different GitHub repos both use a branch named `main`. The VPS and the developer machine were each correct — but **`origin` pointed at different URLs**.

| Machine | `origin` URL | `origin/main` tip |
|---------|--------------|-------------------|
| **Developer (local)** | `https://github.com/balagpetcare/next_v1.git` | `5beac25` |
| **VPS (production)** | `https://github.com/balagpetcare/web_app.git` (inferred) | `bccc7fe` (before fix) |

Same remote **name** (`origin`), different **repository**. Commit `5beac25` was always on `next_v1` `main`; the VPS never pulled it because its `origin` tracked `web_app`.

---

## Diagnostic output (2026-06-06)

### `git remote -v` (developer machine)

```text
nextv1  https://github.com/balagpetcare/next_v1.git (fetch)
nextv1  https://github.com/balagpetcare/next_v1.git (push)
origin  https://github.com/balagpetcare/next_v1.git (fetch)
origin  https://github.com/balagpetcare/next_v1.git (push)
web_app https://github.com/balagpetcare/web_app.git (fetch)
web_app https://github.com/balagpetcare/web_app.git (push)
```

### `git branch -a` (excerpt)

```text
* main
  remotes/origin/main
  remotes/web_app/main
  …
```

### `git log --oneline -5` (local `main`)

```text
5beac25 Fix production build blockers and JSX/TSX mismatches
10fd658 Fix production build issues
740835a updated Vaccination updare BPA
3f8a713 updated Vaccination Campain 2026
bb72eaf feat: V-A1.0.8
```

### `git ls-remote origin` (before `web_app` sync)

```text
5beac2515438c3c4d679d9dabdaf4c734bf0288b  refs/heads/main   ← next_v1
…
```

### `git ls-remote web_app` (before sync)

```text
bccc7feee7afe438c080ec7dcd63a5fd60393516  refs/heads/main   ← web_app (VPS commit)
```

### `git ls-remote origin refs/heads/main` (after reconciliation)

```text
5beac2515438c3c4d679d9dabdaf4c734bf0288b  refs/heads/main
```

### `git ls-remote web_app refs/heads/main` (after reconciliation)

```text
5beac2515438c3c4d679d9dabdaf4c734bf0288b  refs/heads/main
```

---

## Where commit `5beac25` exists

| Location | Commit | Notes |
|----------|--------|-------|
| Local `main` | `5beac25` | HEAD |
| `origin/main` (`next_v1`) | `5beac25` | Pushed earlier |
| `web_app/main` | `5beac25` | **Force-with-lease push** `bccc7fe…5beac25` |
| `bccc7fe` | Stale scaffold | Jan 2026 initial commit; broken `app/shop/layout.jsx` with TS in JSX |

No merge-base exists between `bccc7fe` and `5beac25` (unrelated histories). Rebase/merge was not viable; deployment remote was updated with `--force-with-lease`.

---

## Branch reconciliation summary

| Item | Value |
|------|-------|
| **Previous deployment branch** | `web_app` → `main` @ `bccc7fe` |
| **Correct deployment commit** | `5beac25` (passes `npm run build`) |
| **Canonical dev remote** | `origin` → `next_v1.git` |
| **Deployment remote (was stale)** | `web_app` → `web_app.git` |
| **Final commit hash** | `5beac2515438c3c4d679d9dabdaf4c734bf0288b` |
| **Build verification** | `npm run build` exit 0, 395 pages |

---

## VPS server commands

Run on the production VPS inside the app directory (e.g. `/var/www/bpa_web` or your deploy path).

### 1. Confirm which repo `origin` points to

```bash
cd /path/to/bpa_web
git remote -v
git rev-parse HEAD
git log -1 --oneline
```

If `origin` is `web_app.git` and HEAD was `bccc7fe`, that explains the mismatch.

### 2. Fetch and reset to the reconciled tip

```bash
git fetch origin
git checkout main
git reset --hard origin/main
git log -1 --oneline
# Expected: 5beac25 Fix production build blockers and JSX/TSX mismatches
```

### 3. Verify remote matches build-ready commit

```bash
git ls-remote origin refs/heads/main
# Expected: 5beac2515438c3c4d679d9dabdaf4c734bf0288b
```

### 4. Install and build

```bash
npm ci
npm run build
```

### 5. Restart the app (adjust for your process manager)

```bash
# PM2 example:
pm2 restart bpa_web

# systemd example:
sudo systemctl restart bpa-web
```

---

## Optional: align VPS `origin` with dev (`next_v1`)

If production should track the same repo as development:

```bash
git remote set-url origin https://github.com/balagpetcare/next_v1.git
git fetch origin
git reset --hard origin/main
```

Keep `web_app` as a named remote only if you still need it:

```bash
git remote add web_app https://github.com/balagpetcare/web_app.git
```

After this change, both remotes currently point `main` → `5beac25`.

---

## Action taken (developer machine)

```bash
git push web_app main:main --force-with-lease
# + bccc7fe...5beac25 main -> main (forced update)
```

Both `origin` (`next_v1`) and `web_app` now serve identical `main` at `5beac25`.
