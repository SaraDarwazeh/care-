# Care+ — Bilingual launch gates

Pre-production checklist before the EN + AR single coordinated launch.
Every gate below must be **complete and signed off** before flipping
public traffic to the bilingual experience.

## 1. Data — content backfill

- [ ] `scripts/migrateLocalizedContent.ts --dry-run` runs cleanly against a
      **production data snapshot**; diff reviewed by a human.
- [ ] Migration run for real against production (or whatever the launch
      environment is); script reports zero remaining unwrapped
      `LocalizedString` fields across `packages`, `educationCards`,
      `products`.
- [ ] Seed-version meta docs (`meta-seed-version`) present in each
      collection at the post-migration version.

## 2. Code — single normalized shape

After the production backfill has been verified for at least one full
business day:

- [ ] Remove tolerant-read branches from `services/packageService.ts`,
      `services/educationService.ts`, `services/storeService.ts`. The
      codebase should ship with one canonical shape.
- [ ] Re-run `npx tsc --noEmit` and the full test suite to confirm.
- [ ] Keep this file updated when the branches are actually removed.

## 3. Translation QA

- [ ] Every row in `docs/translation-qa.md` signed off by a second
      native Arabic speaker (not the original translator).
- [ ] Glossary (`docs/translation-glossary.md`) refreshed with any new
      canonical terms discovered during QA.
- [ ] Open issues either fixed or filed and triaged.

## 4. SEO

- [ ] Every public page returns the right `<link rel="alternate"
      hreflang>` block in HTML (covered by the `[locale]/layout.tsx`
      metadata).
- [ ] `/sitemap.xml` lists every public route under both locales with
      reciprocal hreflang entries.
- [ ] `/robots.txt` references the sitemap and disallows dashboards.
- [ ] `NEXT_PUBLIC_SITE_URL` set in production env to the real origin.

## 5. Performance

- [ ] Both font pairs (Latin + Arabic) load via `next/font` with the
      appropriate `subsets`. Verify no extra CDN font loads slip in.
- [ ] Lighthouse run on `/en` and `/ar` shows no regression vs. the
      pre-bilingual baseline (>= 90 Performance on a desktop run).

## 6. A11y

- [ ] Screen reader smoke test on `/ar` — verify `<html lang="ar">` is
      announced as Arabic.
- [ ] Any mixed-language fragment (English brand wordmark inside Arabic
      copy, Latin code blocks) carries an explicit `lang` attribute.
- [ ] Form labels read correctly in both directions.

## 7. Functional

- [ ] Locale switcher visible in: public navbar, patient navbar, nurse
      sidebar, admin sidebar, public footer.
- [ ] Switching locale: writes `NEXT_LOCALE` cookie, persists to the
      signed-in user's `AppUser.language`, swaps URL prefix without a
      full reload.
- [ ] Locale mismatch banner appears at most once per browser, never
      again after dismissal.
- [ ] Notification inbox relocalizes after toggle (template-rendered
      items only — legacy English-only items stay English by design).
- [ ] Firebase Auth errors render in the active locale on
      login / register / forgot-password.
- [ ] Nurse schedule + availability start the week on Sunday in AR.

## 8. Rollback plan

- [ ] If a launch-day issue requires reverting: the rollback is to
      switch the `localeDetection: false` flag and force `defaultLocale`
      back to `en` via env override (no destructive data step needed —
      the schema is fully backward-compatible).
- [ ] Page owners notified of which surface they own for hotfix
      response during the first 24h post-launch.

## Sign-off

- [ ] Eng lead:
- [ ] Product:
- [ ] Translation reviewer:
- [ ] Date launched:
