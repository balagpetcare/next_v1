# BPA Fixed Ports (Never Change)

- API: 3000
- mother: 3100
- shop: 3101
- clinic: 3102
- admin: 3103
- owner: 3104

This is a **hard rule** for scripts, envs, docker compose, proxies and docs.

## Single dev server (npm run dev)

`npm run dev` starts **one** Next.js server on **port 3100** only. All panel routes are served on that port:

- Owner login: **http://localhost:3100/owner/login**
- Staff login: http://localhost:3100/staff/login
- Admin login: http://localhost:3100/admin/login
- etc.

To use **http://localhost:3104/owner/login** you must run `npm run dev:owner` or `npm run dev:all`.
