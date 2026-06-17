# Care+ — Production Media Checklist

This file inventories every visual asset on the platform that's currently a
placeholder. Treat it as the punch list before launch: each item lists where
the asset renders, what's there today, what it should become, and where to
upload the real file.

Last updated: 2026-06-17 (Phase 4 media pass).

---

## How to replace an asset

1. **Upload via the existing admin uploader.** Most surfaces accept files
   through their admin CRUD page (`/admin/packages`, `/admin/products`,
   `/admin/education-library`, `/admin/nurses`). The presign route handles
   S3 storage; you don't touch the bucket directly.
2. **Or update the source file.** Static catalogues (`lib/serviceCatalog.ts`,
   `lib/packagesCatalog.ts`, hero photos in `app/[locale]/page.tsx`) point at
   URLs. Swap the URL for an S3 URL after upload.
3. **For nurse profile photos:** the existing nurse profile form uploads via
   the `nurse-profile` presign scope. Real consent is required — see the
   policy note at the bottom of this doc.

---

## 1. Public-facing surfaces

| Surface | File / location | Current state | Replace with |
|---|---|---|---|
| Public hero photo on `/` | `app/[locale]/page.tsx` (Unsplash) | Stock nurse photo | Real Care+ nurse in a home setting (consented) |
| Login page side image | `app/[locale]/login/page.tsx` | Stock photo | Same — or warmer brand-style hero |
| Register page side image | `app/[locale]/register/page.tsx` | Stock photo | Same |
| Hero badge "Verified by Care+" icon | Inline `<ShieldCheck>` | OK — keep | Keep |
| Trust stats (count cards) | Live from `getPublicStats` | OK — keep | Keep |

## 2. Service catalogue (`/services` and category pages)

| Service slug | File | Current photo | Replace with |
|---|---|---|---|
| `one-time` | `lib/serviceCatalog.ts` line 30 | Stock medical | Real one-time visit moment (IV / wound dressing / vitals) |
| `shifts` | `lib/serviceCatalog.ts` line 41 | Stock care environment | Care continuity / multi-hour shift |
| `packages` | `lib/serviceCatalog.ts` line 54 | Stock meeting | Elderly or post-op care being delivered at home |
| `additional` | `lib/serviceCatalog.ts` line 68 | Stock helper | Caregiver helping with cooking / driving / companionship |

## 3. Care packages (`/services/packages` + detail)

Each entry in `lib/packagesCatalog.ts` has an `image` URL. Today four packages
use Unsplash placeholders. The admin packages editor (`/admin/packages`)
already supports file uploads through the `package` presign scope; uploading a
real photo there overrides the catalogue placeholder.

| Package | File | Today | Replace with |
|---|---|---|---|
| Elderly Care | `lib/packagesCatalog.ts` line 86 | Stock | Elderly patient + Care+ nurse, home setting |
| Post-Op Recovery | line 163 | Stock | Wound dressing or post-op rest |
| Wound Care | line 240 | Stock | Wound care visit (consented) |
| Maternity / Mother & Baby | line 316 | Stock | Mother-baby moment |

## 4. Medical store products

| Surface | Today | Decision required |
|---|---|---|
| `lib/data/store.ts` | Single emoji icons (🩺 🌡️ etc.) | Either (a) ship as-is — playful and clear at MVP, or (b) photograph real products. Recommend (a) for launch, plan (b) for v1.1. |

## 5. Education content — Health Hub

`scripts/seedEducationLibrary.ts` currently seeds 12 sample videos using
Google's `gtv-videos-bucket` public sample MP4s (Big Buck Bunny, Sintel, etc.)
plus their matching thumbnails. These are **the most jarring "demo content"
on the platform** — the videos play but the content is unrelated cartoons.

| Surface | Today | Replace with |
|---|---|---|
| 12 seed videos | Google sample MP4s | 12 real ~60–120s educational videos shot by the Care+ care team |
| 12 seed thumbnails | Google sample JPGs | Real video stills or branded thumbnails |
| Video categories | wellness / chronic / post-op / etc. | Same — already correct |

Upload path: `/admin/education-library` → "Add video" → upload video + thumbnail. The presign scope is `education-video` (100 MB cap) and `education-thumbnail`.

After uploading real videos, **delete the placeholder seed rows** so the
content team only sees their work.

## 6. Nurse profiles

Seeded nurses (`scripts/seedData.ts`) now use **ui-avatars.com colored
initials** instead of random `pravatar.cc` faces. The initials look
intentionally placeholder-like and don't masquerade as real people. Six accent
colors rotate by nurse index so the marketplace looks visually varied.

Real consented nurse photos replace these via the nurse profile form
(`/nurse/setup`) when each nurse is onboarded. Replacing a photo triggers
re-approval (the `profileImage` field is in `SIGNIFICANT_NURSE_FIELDS`).

**Policy note:** every real nurse photo on the platform must be uploaded by
the nurse themselves through the admin-approved profile form, with explicit
consent recorded. Stock photos of strangers presented as real nurses are not
acceptable in any market — least of all healthcare.

## 7. Community donations

User-generated. Posts upload their own photos via the community form. No
team action needed.

## 8. Patient profile / identity verification

User-generated. The patient uploads their ID via the profile editor.

## 9. Other surfaces (no media needed)

- Dashboard cards: rely on icons + gradients — intentional, no images needed.
- Find Care wizard: text + icons only — intentional, no images.
- Booking form: text only.
- All admin surfaces: text + icons.

---

## Priority ranking for launch

1. **Health Hub videos** — biggest visible improvement. Replace 12 cartoon
   placeholders with 12 real branded videos. Until this is done, every patient
   who opens the Hub realises the content is filler.
2. **Public hero photo on `/`** — first impression. Stock photo of a nurse is
   acceptable for soft-launch but should be a real Care+ nurse before any
   marketing push.
3. **Service catalogue photos** — second-impression. Better Unsplash photos
   work in the interim; replace with real Care+ photography over time.
4. **Package catalogue photos** — same as above.
5. **Real nurse profile photos** — happen organically as real nurses sign up.
6. **Store product photos** — defer to v1.1.

## Hosts allowlisted in `next.config.ts`

The Next.js `Image` component allows remote hosts via `remotePatterns`. Today:

- `images.unsplash.com` — placeholder catalogue + hero
- `i.pravatar.cc` — legacy seed avatars (deprecated, kept for back-compat)
- `ui-avatars.com` — new seed-nurse initial avatars
- `commondatastorage.googleapis.com` — seed-education sample videos / thumbs
- `${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com` — real production uploads

After all assets migrate to S3, the Unsplash / pravatar / ui-avatars hosts can
be removed from the allowlist.
