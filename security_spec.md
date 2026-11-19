# Security Specification — E-Surat Sekolah (Kemendagri)

## 1. Data Invariants
1. **Strict Tenant & Shared School Operator Isolation**: Every document in `schoolSettings`, `employees`, `students`, and `letters` belongs either to a single verified Google-authenticated user (`ownerId == request.auth.uid`) or to the linked school workspace (`ownerId == 'smpnegeripacet_shared'`), which is strictly accessible only to verified Google accounts `sangpujangga.malam88@gmail.com` and `smpnegeripacet@gmail.com` (`email_verified == true`). No other cross-tenant reads, lists, updates, or deletes are permitted.
2. **Verified Auth Mandatory**: Unauthenticated users and users with `email_verified != true` have zero read/write access across all collections (including email-based shared workspace checks to prevent email spoofing).
3. **Immutable Ownership & Creation Time**: `ownerId` and `createdAt` are immutable after document creation. `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
4. **Terminal State Locking on Letters**: A `Letter` transitions through `draf` -> `terbit` -> `arsip`. Once `status == 'arsip'`, no further updates are permitted (immutable official archive record).
5. **Bounded Payload & No Shadow Fields**: Every collection strictly enforces `keys().hasAll(...)` and `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, `isValidId(docId)` on single-doc operations, and explicit `.size()` bounds on all strings and maps.

## 2. Dirty Dozen Adversarial Payloads
1. **Cross-Tenant Read/List**: User B queries `employees` without `where('ownerId', '==', B.uid)` or requests `getDoc(doc(db, 'employees', A_emp))` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Auth token has `email_verified: false` attempting `create` on `letters` -> `PERMISSION_DENIED`.
3. **OwnerId Spoofing on Create**: User A creates `student` with `ownerId: B.uid` -> `PERMISSION_DENIED`.
4. **OwnerId Hijack on Update**: User A updates `student` trying to change `ownerId` to `B.uid` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: User A creates `employee` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning**: User A attempts `setDoc(doc(db, 'employees', 'invalid/..id#' + 'x'.repeat(200)), ...)` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: User A creates `letter` with client-provided `createdAt: new Date('2020-01-01')` instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
8. **CreatedAt Mutation**: User A updates `employee` and tries to alter `createdAt` -> `PERMISSION_DENIED`.
9. **Terminal Archive Tampering**: User A tries to update a `letter` whose existing `status` is `'arsip'` -> `PERMISSION_DENIED`.
10. **Oversized String / Denial-of-Wallet**: User A injects a 500KB string into `student.nama` or `schoolSettings.logoDaerahDataUrl` -> `PERMISSION_DENIED`.
11. **Invalid Enum Value**: User A writes `letter.kategori = 'surat_palsu'` or `employee.statusKepegawaian = 'ROOT'` -> `PERMISSION_DENIED`.
12. **SchoolSettings Path Mismatch**: User A tries to create `schoolSettings/userB_uid` with `ownerId: A.uid` -> `PERMISSION_DENIED`.
