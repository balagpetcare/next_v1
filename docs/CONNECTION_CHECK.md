# API Connection Checklist (Owner app)

This project is split:
- **Owner (Next.js)** runs on **3104**
- **Main API** runs on **3000**

If `/owner/kyc` shows errors like **`Prisma instance not found on req.prisma`**, follow these checks.

---

## 1) Owner app must call backend (3000)
Create/Update **`./.env.local`** in the owner app:

```env
PORT=3104
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Then restart the owner app:

```bash
npm run dev
```

### Quick verification
Open browser DevTools → Network → check KYC request URL:
- ✅ Should be `http://localhost:3000/api/v1/owner/kyc`
- ❌ If it is `http://localhost:3104/api/...` then it's hitting the wrong server.

---

## 2) Backend CORS must allow Owner origin (3104)
In backend `.env` (or your CORS config), add **3104**:

```env
CORS_ORIGINS="http://localhost:3000,http://localhost:3103,http://localhost:3104,http://localhost:5173,http://127.0.0.1:3000"
```

Restart backend.

---

## 3) Backend must attach Prisma middleware on all API routes
That error typically means your Express route is running without prisma middleware.

### Expected pattern (Express)
In your backend bootstrap (e.g. `src/index.ts`), ensure prisma is attached **BEFORE** you mount routers:

```ts
import { prisma } from "./prisma"; // wherever you instantiate PrismaClient

app.use((req, _res, next) => {
  // @ts-expect-error - attach prisma to request
  req.prisma = prisma;
  next();
});

// routes AFTER middleware
app.use("/api/v1", v1Router);
```

Or if you have a dedicated middleware file, make sure every router uses it:

```ts
router.use(prismaMiddleware);
router.use("/owner/kyc", ownerKycRouter);
```

Restart backend after changes.
