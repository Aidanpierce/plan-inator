# Plan-inator Implementation Plan

## Context

Plan-inator is a personal productivity app combining time budgeting with task scheduling. The core philosophy is **kind and gentle** — no pressure, just helpful guidance. The app calculates how much available time a user has each day/week, tracks tasks across categories with priorities, estimates task durations from historical data, and schedules work accordingly. It includes a warning system with customizable rulesets and a welcome-back flow for returning users.

---

## Technology Stack

| Layer | Choice | Why |
|---|---|---|
| **Platform** | **PWA** | Installable on mobile + desktop from one codebase. Supports push notifications, offline use. No app store needed. |
| **Framework** | **SvelteKit (Svelte 5)** | Compiles to minimal JS (fast for frequent daily use). Simple reactivity model. Built-in routing. |
| **Language** | **TypeScript** | Type safety for the data model and algorithms. |
| **Database** | **Dexie.js (IndexedDB)** | Local-first, no server needed. Sufficient capacity for historical data. Schema versioning built-in. |
| **Styling** | **Tailwind CSS** | Fast UI development, easy to craft a warm/gentle aesthetic. |
| **Testing** | **Vitest + Playwright + Svelte Testing Library** | Unit (algorithms), component (UI), and E2E (flows). |
| **Package Manager** | **pnpm** | Fast, disk-efficient. |

**Key decision: No backend.** All data lives in the browser via IndexedDB. If sync is ever needed, a CRDT layer (y.js) can be added later without rearchitecting.

---

## Architecture

```
Pages/Routes  -->  Svelte Stores  -->  Service Layer  -->  Data Layer (Dexie/IndexedDB)
                   (reactive state)    (pure TS, no UI)    (repository pattern)
```

- **Service layer is framework-agnostic** — all algorithms are pure TypeScript, independently testable.
- **Repository pattern** for data access — components never touch Dexie directly.
- **Stores** bridge services and UI with reactive state.

---

## Data Model

### Core Entities

- **Task**: id, title, description, categoryId, type (assignment|study|general), status (backlog|active|completed|abandoned), estimatedMinutes, systemEstimateMinutes, estimateConfidence, deadline, scheduledDate, priority, timestamps
- **TimeEntry**: id, taskId, startedAt, endedAt, durationMinutes — tracks actual time spent on tasks
- **Category**: id, name, color, icon, priority, isAutoDetected, parentCategoryId — supports nesting (e.g. "CS 101" under "Classes")
- **DayTemplate**: id, name, dayOfWeek, sleepHours, personalHours, commitments[], availableMinutes — defines the time budget for each day type
- **Commitment**: id, dayTemplateId, name, durationMinutes, categoryId — classes, meetings, etc.
- **ProductivitySnapshot**: id, date, availableMinutes, productiveMinutes, factor, categoryBreakdown — daily productivity record
- **WarningRuleset**: id, name, isPreset, rules[] — groups of warning rules
- **WarningRule**: triggerType (deadline_approaching|no_progress|overdue|estimate_exceeded|category_neglected), params, message, severity (gentle|reminder|nudge)
- **WarningAssignment**: links a ruleset to a category, task, or global scope
- **UserSettings**: sleep/personal hour defaults, welcomeBackThresholdDays, lastActiveAt, notification prefs, theme

---

## Key Algorithms

### Time Budget
`availableMinutes = 1440 - (sleep * 60) - (personal * 60) - sum(commitments)`. Apply productivity factor to get effective available time.

### Productivity Factor
Weighted rolling average (14-day window, exponential decay) of `productiveMinutes / availableMinutes`. Defaults to 50% for new users. Clamped to [10%, 100%].

### Time Estimation
Log-normal model from completed tasks in the same category/type. Requires 3+ historical data points; falls back to user estimate otherwise. Returns estimate + confidence score.

### Task Scheduling
Priority-based greedy algorithm. Score = 50% deadline urgency + 30% category priority + 20% task priority. Assigns tasks to days (not hours). Deadline tasks scheduled latest-possible to leave room for urgent additions. Unschedulable tasks trigger warnings.

### Category Auto-Detection
Tokenize uncategorized task titles, find common tokens (2+ occurrences), cluster by shared tokens. Present as suggestions for user confirmation.

### Warning Evaluation
Runs on app open + periodically. Checks each rule against target tasks. Deduplicates repeated warnings. Three presets:
- **Relaxed** (default): deadline 2 days, no progress 72h, overdue 1 day
- **Studious**: deadline 5 days + 1 day, no progress 48h, estimate exceeded 50%
- **Chill**: deadline 1 day, overdue 3 days

All messages use gentle tone: "Hey, [task] is due in 2 days. No rush, just wanted to make sure it's on your radar."

---

## Welcome-Back Flow

**Trigger:** `daysSince(lastActiveAt) >= welcomeBackThresholdDays` (default 3 days).

1. Greeting: "Welcome back! You've been away for X days."
2. In-progress triage (card-swipe UI): "Still working" / "Finished!" / "Not doing this"
3. Overdue triage: "Done" / "Abandoned" / "Still want (ASAP)" / "Still want (eventually)"
4. Summary: "All caught up! X active tasks, Y hours available this week."

---

## Implementation Phases

### Phase 1: Foundation
- SvelteKit project scaffold (TypeScript, Tailwind, Vitest, Playwright)
- Dexie database definition and migrations (`/src/lib/db/database.ts`)
- Repository layer (`/src/lib/db/repositories/`)
- Time budget service (`/src/lib/services/timeBudget.ts`)
- App shell layout, dashboard page, settings page (day template config)
- **Deliverable:** User configures day templates, sees available hours per day/week

### Phase 2: Tasks & Categories
- Task CRUD, time entry tracking with start/stop timer
- Category management with priority ordering
- Category auto-detection service
- Active tasks page, task detail page, backlog
- TaskCard, CategoryBadge, Timer components
- **Deliverable:** Full task lifecycle — create, categorize, track time, complete

### Phase 3: Productivity & Estimation  ← current
- Productivity factor calculation (rolling window)
- Time estimation service (log-normal model)
- Daily productivity snapshot background computation
- Dashboard enhancements: productivity trends, estimation on task cards
- **Deliverable:** System predicts task durations and tracks productivity

### Phase 4: Scheduling
- Scheduling algorithm (`/src/lib/services/scheduler.ts`)
- Weekly schedule view page
- Manual override controls (move tasks between days)
- **Deliverable:** Auto-generated weekly schedule respecting priorities and deadlines

### Phase 5: Warnings
- Warning evaluator service
- PWA notification integration (service worker)
- Preset rulesets (Relaxed, Studious, Chill)
- Warning settings UI for custom rulesets
- **Deliverable:** Configurable, gentle notifications about tasks

### Phase 6: Welcome-Back & Polish
- Welcome-back detection and triage flow
- Swipeable TriageCard component
- PWA manifest, service worker, offline support
- Data export/import
- Full E2E test suite, accessibility audit
- **Deliverable:** Complete, installable PWA

---

## Directory Structure

```
/src
  /lib
    /db
      database.ts
      /repositories/        # One per entity
    /services/               # Pure TS algorithm modules
    /stores/                 # Svelte reactive stores
    /components/             # Reusable UI components
    /test/
      seed.ts                # Sample data for dev/testing
  /routes
    /(app)
      +layout.svelte         # App shell
      /dashboard/
      /tasks/ + /[id]/
      /categories/
      /schedule/
      /settings/ + /warnings/
      /welcome-back/
  /tests/                    # Playwright E2E
```

---

## Testing Strategy

- **Unit tests (Vitest):** Every service module — budget calc, productivity, estimation, scheduling, warnings, category detection, welcome-back logic
- **Component tests (Svelte Testing Library):** TaskCard, Timer, TriageCard, WarningBanner
- **E2E tests (Playwright):** Onboarding flow, full task lifecycle, welcome-back triage, warning delivery
- **Test seed data:** `/src/lib/test/seed.ts` populates realistic sample data

---

## Verification

1. `pnpm dev` — run locally, configure day templates, create tasks, track time
2. `pnpm test` — unit + component tests pass
3. `pnpm test:e2e` — Playwright E2E tests pass
4. Install as PWA on mobile, verify offline functionality and notifications
5. Simulate absence (set lastActiveAt to past date), verify welcome-back flow triggers
