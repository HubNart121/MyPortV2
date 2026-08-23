# PORT_TRACK Security Architecture

## Protected flow

The production security boundary for Backup Export and JSON Restore is:

1. Firebase Authentication performs Google sign-in.
2. The application shell requires a verified Firebase email in the client
   allowlist before protected
   pages become interactive.
3. Every protected Route Handler independently calls `requireAuthorizedUser()`
   with the Firebase ID token;
   page visibility is not treated as an authorization boundary.
4. The browser never reads Backup data directly from Firestore. The protected
   API uses Firebase Admin after server authorization.
5. Firestore and Storage Rules require a verified allowlisted email and the
   matching user UID.
6. The Backup and Restore APIs are rate-limited with Upstash Redis. Production fails closed
   when the limiter is missing, times out, or is unavailable.
7. Restore additionally requires an exact same-origin request, a JSON payload no
   larger than 5 MB, and a schema-valid snapshot. Before mutation, the server
   stores a recovery snapshot in an admin-only Firestore namespace. It then
   verifies all seven category counts and rolls back automatically on failure.

## Main files

```text
app/
  api/
    backup/route.ts
    restore/route.ts
  backup/page.tsx
  login/page.tsx
components/
  AuthProvider.tsx
  BackupExport.tsx
  JsonRestore.tsx
  PortfolioClearPanel.tsx
lib/security/
  api-response.ts
  authorization.ts
  backup-schema.ts
  backup-store.ts
  callback-url.ts
  config.ts
  errors.ts
  firebase-admin.ts
  rate-limit.ts
  restore-schema.ts
  restore-store.ts
firestore.rules
storage.rules
```

## Compatible package versions

The project pins the security-sensitive packages:

```powershell
npm.cmd install --save-exact @upstash/ratelimit@2.0.8 `
  @upstash/redis@1.38.0 `
  firebase-admin@14.2.0 `
  server-only@0.0.1
```

`package.json` also overrides vulnerable transitive versions of PostCSS,
Sharp, brace-expansion, and UUID. Run `npm.cmd audit --omit=dev` after every
dependency change.

## Required environment

Copy `.env.local.example` to `.env.local` for local development. Never commit
the populated file.

Required server-only values:

```env
ALLOWED_GOOGLE_EMAIL=
APP_ORIGIN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Do not add `NEXT_PUBLIC_` to secrets. Production values belong in Firebase App
Hosting / Google Cloud Secret Manager. `NEXT_PUBLIC_FIREBASE_*` values are
Firebase browser configuration and are intentionally public.

## Firebase Authentication configuration

Enable the Google provider in Firebase Authentication and add only the exact
application domains to Firebase Authentication's authorized-domain setting.

## Local development

1. Populate `.env.local`.
2. Ensure Application Default Credentials are available, or set the
   local-only `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Run `npm.cmd run dev`.
4. Open `http://localhost:3000/login`.
5. Sign in with an allowlisted Google account.

In development only, a missing Upstash configuration permits Backup requests
so the UI can be tested locally. Production always fails closed.

## Firebase App Hosting deployment

The secret references are declared in `apphosting.yaml`. Create each secret:

```powershell
npx.cmd firebase-tools apphosting:secrets:set ALLOWED_GOOGLE_EMAIL --project myport-v2
npx.cmd firebase-tools apphosting:secrets:set UPSTASH_REDIS_REST_URL --project myport-v2
npx.cmd firebase-tools apphosting:secrets:set UPSTASH_REDIS_REST_TOKEN --project myport-v2
```

Then deploy the app and rules together:

```powershell
npx.cmd firebase-tools deploy `
  --only apphosting:my-port-v2,firestore:rules,storage `
  --project myport-v2
```

Keep the App Hosting allowlist and Firebase Rules allowlists synchronized before
deploying.

## Session protection

Backup export exposes a read-only `GET` endpoint. JSON Restore uses the separate
`POST /api/restore` endpoint. Both endpoints require a current Firebase ID token,
and the server rechecks the email allowlist because UI state is not a security
boundary.

The `RESTORE FILE` button opens a final confirmation dialog as a guard against
accidental clicks; it is not an authentication control. Authorization is enforced again by the server. Recovery
snapshots are kept outside `users/{uid}` so client Firestore rules cannot read or
write them; only Firebase Admin can access them. The three newest recovery
snapshots per account are retained.

## Threat model

- **Unauthorized Google accounts:** rejected by the Firebase client guard,
  rechecked by `requireAuthorizedUser()`, and denied by Firestore and Storage
  Rules.
- **Stolen Firebase tokens:** server verification checks revocation and the
  allowlist on every protected API request.
- **Client-side bypass:** protected Backup export and Restore are handled by
  server APIs. Hiding UI controls and the confirmation dialog are not treated as
  authorization.
- **Direct API access:** returns JSON 401/403 and rechecks the allowlist in the
  Route Handler.
- **Flooding:** distributed sliding-window rate limits use a hashed account
  identity and an explicitly configured trusted-proxy IP only.
- **Cache leakage:** protected pages and APIs are dynamic and `no-store`.
- **Open redirects:** callbacks must be same-origin relative paths.
- **Environment mistakes:** protected operations fail closed when auth or
  rate-limit configuration is missing.

## Security test checklist

- [ ] Allowlisted Google account signs in and opens `/backup`.
- [ ] Non-allowlisted Google account is signed out and rejected.
- [x] Unauthenticated `/backup` redirects to `/login` with a relative callback.
- [x] Unauthenticated `/api/backup` returns JSON 401, not an HTML redirect.
- [ ] Authenticated but non-allowlisted API request returns JSON 403.
- [ ] Forged, expired, revoked, or incorrectly signed Firebase token returns 401.
- [ ] Cross-origin Restore `POST` returns 403 `INVALID_ORIGIN`.
- [ ] Invalid or over-5-MB Restore payload is rejected.
- [ ] Restore creates an admin-only recovery snapshot before user data changes.
- [ ] Successful Restore read-back counts match all seven JSON categories.
- [ ] A forced Restore failure rolls back to the previous snapshot.
- [ ] Requests above the configured limit return 429 and `Retry-After`.
- [x] Firestore and Storage Rules compile successfully in Firebase dry run.
- [x] Production build and TypeScript checks pass.
- [x] `npm audit` reports zero known vulnerabilities.
