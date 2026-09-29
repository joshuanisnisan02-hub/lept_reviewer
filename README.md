# LEPT Review Hub

A modern LEPT study companion built around:

**Diagnose -> Learn -> Practice -> Understand Mistakes -> Review -> Retain -> Simulate -> Improve**

## Current build status

### Learner experience
- Responsive Next.js + TypeScript + Tailwind foundation
- Public landing page
- Email/password Supabase authentication
- Guest/demo mode
- Supabase session middleware
- Live onboarding with database-backed LEPT track options
- Elementary / Secondary selection
- PRC-aligned handling for BEEd, ECE, SNE, TLE areas, TVTEd, and legacy MAPEH guidance
- Target examination date and realistic daily study target
- Hybrid dashboard: demo data for guests, real profile/activity data for signed-in learners
- Empty states for new accounts instead of fabricated performance
- Learning path starter
- Practice generator / quiz starter
- Flashcards starter
- Mistake-review starter
- Progress view
- Live Sources & Alignment registry

### Data & adaptive foundations
- Supabase PostgreSQL schema
- Row Level Security on all public tables
- Learner-owned progress, attempts, notes, bookmarks, plans, sessions, and mastery records
- Source registry
- Competencies, modules, lessons, questions, and flashcards
- Question exposure history
- Mistake recovery status
- Competency mastery tracking
- Automatic attempt-processing trigger
- Foreign-key indexes for scale
- Protected admin/reviewer content access
- Learner role escalation protection
- Admin TOS coverage dashboard

### Verified source baseline
Registered source records include:
- PRB for Professional Teachers Resolution No. 11, s. 2025
- PRB for Professional Teachers Resolution No. 20, s. 2025
- Annex A to Resolution No. 20, s. 2025
- PRC Resolution No. 2053(A), s. 2025
- CHED 2017 teacher-education memorandum-order index

Production competencies and question banks are intentionally not bulk-generated until the current TOS is extracted and reviewed.

## Local setup

Create a local environment file from the template:

```bash
cp .env.example .env.local
```

Set:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Then run:

```bash
npm install
npm run dev
```

The publishable key may be used by the browser client, but privileged Supabase secret/service-role keys must never be committed or placed in `NEXT_PUBLIC_` variables.

## Supabase

Project schema is live in the connected `lept_reviewer` Supabase project.

The database security advisor currently reports no security lints. Performance indexes have been added; unused-index notices are expected while the new database contains little learner activity.

## Admin access

The route `/admin` contains the first content-administration and TOS-coverage view.

Learner accounts cannot promote themselves to admin or content reviewer. Assign elevated roles only through trusted administrative/database operations.

## Academic content rule

Production coverage must be derived from the latest applicable official PRC LEPT Table of Specifications and current PRC-CHED alignment guidance. CHED and DepEd materials may expand and contextualize competencies, but should not silently replace the examination blueprint.

Do not label AI-generated or unreviewed content as verified.

## Next build phase

1. Extract and import the current PRC TOS competency matrix.
2. Build database-backed lesson reader and module progress.
3. Connect verified question-bank practice to persisted attempts.
4. Implement smart question sampling using TOS weight, mastery, and exposure history.
5. Persist spaced-repetition flashcard reviews.
6. Build diagnostic and Mock LEPT analysis.
7. Generate adaptive daily study plans and review queues.
8. Expand the admin CMS for content review/publishing.

## Disclaimer

LEPT Review Hub is an independent review platform and is not affiliated with or endorsed by the Professional Regulation Commission unless officially authorized. Examination coverage may be updated by PRC. Always refer to current official PRC announcements.
