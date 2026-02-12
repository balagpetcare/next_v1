# Central Auth Redirect System

This document describes the Central Auth Redirect system implemented across all BPA panels.

## Overview

Each panel has `/login` and `/register` routes that redirect to a central authentication UI served by the API host (`http://localhost:3000`). This provides a unified authentication experience while maintaining separate panel contexts.

## Single dev server vs multiple ports

- **`npm run dev`** – One Next.js server on **port 3100** only. All panels are available on that port:
  - **Owner login:** http://localhost:3100/owner/login  
  - Staff: http://localhost:3100/staff/login  
  - Admin: http://localhost:3100/admin/login  
  - etc.

- **Port 3104 (Owner only)** – To use http://localhost:3104/owner/login you must start the Owner panel on 3104:
  - Run `npm run dev:owner` (Owner on 3104), or  
  - Run `npm run dev:all` (all panels on 3100–3106).

If you see **ERR_CONNECTION_REFUSED** on 3104, either use **http://localhost:3100/owner/login** or start the owner dev server with `npm run dev:owner`.

## Environment Variables

Add to your `.env.local` or environment configuration:

```bash
# Central Auth Server URL (default: http://localhost:3000)
NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3000
```

## Panel Configuration

| Panel    | Port | Login URL                          | Register URL                          | Default Return Path |
|----------|------|-------------------------------------|---------------------------------------|---------------------|
| Mother   | 3100 | http://localhost:3100/mother/login  | http://localhost:3100/mother/register | /post-auth-landing  |
| Shop     | 3101 | http://localhost:3101/shop/login    | http://localhost:3101/shop/register   | /shop               |
| Clinic   | 3102 | http://localhost:3102/clinic/login  | http://localhost:3102/clinic/register | /clinic             |
| Admin    | 3103 | http://localhost:3103/admin/login   | http://localhost:3103/admin/register  | /admin              |
| Owner    | 3104 | http://localhost:3104/owner/login   | http://localhost:3104/owner/register  | /owner              |
| Producer | 3105 | http://localhost:3105/producer/login| http://localhost:3105/producer/register| /producer          |
| Country  | 3106 | http://localhost:3106/country/login | http://localhost:3106/country/register | /country           |
| Staff    | 3100 | http://localhost:3100/staff/login   | http://localhost:3100/staff/register  | /staff/branches     |

## /auth/login Fallback

The route `/auth/login` exists to avoid 404s when legacy links or `api/logout` redirect to it. It redirects to the appropriate panel login based on `?app=` query param, or to `/login` when no app is specified.

## Generated Files

### Core Files

- `lib/authRedirect.ts` - Shared helper with URL builder and security validation
- `src/bpa/components/AuthRedirectPage.tsx` - Reusable redirect component

### Panel Routes

Each panel has:
- `app/<panel>/login/page.tsx` - Login redirect page
- `app/<panel>/register/page.tsx` - Register redirect page
- `app/<panel>/login/layout.tsx` - Standalone auth layout (no sidebar)
- `app/<panel>/register/layout.tsx` - Standalone auth layout (no sidebar)

## Security Features

### Same-Origin Validation

The `returnTo` URL is validated to prevent open redirect vulnerabilities:

1. **Same-origin URLs** - Always allowed
2. **Localhost ports 3100-3106** - Allowed for development multi-panel setup
3. **External domains** - Always blocked

### Query Parameter Handling

- `?returnTo=<url>` - Full URL to redirect after auth (validated)
- `?next=<path>` - Relative path converted to origin + path

## Usage

### Basic Redirect

```tsx
// Just visit the login page - redirects to central auth
// http://localhost:3104/owner/login
// → Redirects to: http://localhost:3000/auth/login?app=owner&returnTo=http://localhost:3104/owner
```

### Custom Return Path

```tsx
// Specify where to go after login
// http://localhost:3104/owner/login?next=/owner/dashboard
// → Redirects to: http://localhost:3000/auth/login?app=owner&returnTo=http://localhost:3104/owner/dashboard
```

### Full Return URL

```tsx
// Specify full return URL (must be same-origin or allowed port)
// http://localhost:3104/owner/login?returnTo=http://localhost:3104/owner/organizations
// → Redirects to: http://localhost:3000/auth/login?app=owner&returnTo=http://localhost:3104/owner/organizations
```

## How It Works

1. User visits panel login/register page (e.g., `/owner/login`)
2. Page computes `returnTo` URL from query params or defaults
3. Page redirects to central auth: `http://localhost:3000/auth/login?app=owner&returnTo=...`
4. Central auth shows login form
5. After successful auth, the API sets an `access_token` cookie with `domain: localhost` (or `COOKIE_DOMAIN`) so the cookie is sent when the panel (different port) calls the API
6. Central auth redirects back to `returnTo` URL
7. User lands on the panel dashboard; panel API calls include the cookie via `credentials: "include"`

### Cookie Domain (API `.env`)

For login to work when panels run on different ports (e.g. 3100–3106) than the API (3000), the API must set the auth cookie with a shared domain:

- **Development:** `COOKIE_DOMAIN=localhost` (default) so the cookie is sent to the API from any localhost port
- **Production:** Set `COOKIE_DOMAIN=.yourdomain.com` (leading dot for subdomains) if panels and API use subdomains

## Customization

### Adding a New Panel

1. Add panel config to `lib/authRedirect.ts`:

```ts
export const PANEL_CONFIG: Record<string, { port: number; basePath: string; label: string }> = {
  // ... existing panels
  newpanel: { port: 3107, basePath: '/newpanel', label: 'New Panel' },
};
```

2. Update `ALLOWED_PORTS` if using a new port:

```ts
export const ALLOWED_PORTS = [3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107] as const;
```

3. Create the routes:

```tsx
// app/newpanel/login/page.tsx
"use client";
import AuthRedirectPage from "@/src/bpa/components/AuthRedirectPage";

export default function NewPanelLoginPage() {
  return <AuthRedirectPage panelName="newpanel" action="login" defaultLandingPath="/newpanel" />;
}
```

## Testing

Test the redirect flow for each panel:

1. **Owner Panel**
   - http://localhost:3104/owner/login
   - http://localhost:3104/owner/register

2. **Admin Panel**
   - http://localhost:3103/admin/login
   - http://localhost:3103/admin/register

3. **Producer Panel**
   - http://localhost:3105/producer/login
   - http://localhost:3105/producer/register

4. **Shop Panel**
   - http://localhost:3101/shop/login
   - http://localhost:3101/shop/register

5. **Clinic Panel**
   - http://localhost:3102/clinic/login
   - http://localhost:3102/clinic/register

6. **Mother Panel**
   - http://localhost:3100/mother/login
   - http://localhost:3100/mother/register

7. **Country Panel**
   - http://localhost:3106/country/login
   - http://localhost:3106/country/register

8. **Staff Panel**
   - http://localhost:3100/staff/login
   - http://localhost:3100/staff/register

## Troubleshooting

### Redirect Not Working

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_AUTH_BASE_URL` is set correctly
3. Ensure central auth server is running on port 3000

### Invalid Return URL

If the returnTo URL is blocked:
- Check it's same-origin or from allowed localhost ports
- Check for typos in the URL
- Review console warnings for blocked URLs

### Fallback Link

If automatic redirect fails, a manual "Continue to Sign In" link is shown after 3 seconds.

### Login Redirect Loop (redirects back to login after signing in)

If after login you are sent back to the login page, the auth cookie is not being sent from the panel to the API (different ports = different origin). Fix:

1. **API:** Set `COOKIE_DOMAIN=localhost` in the API `.env` (see Cookie Domain above)
2. **API:** Ensure CORS has `credentials: true` and allows your panel origin (e.g. `http://localhost:3100`)
3. **Panel:** API client must use `credentials: "include"` on fetch (default in this app's `lib/api.ts`)
