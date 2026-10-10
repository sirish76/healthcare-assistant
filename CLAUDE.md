# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Zumanely ("Zume" / HealthAssist AI) is an AI healthcare-insurance assistant. Users chat about Medicare, Medicaid, ACA and private plans, look up doctors, and book consultations: free 20-minute ones, or paid 60-minute ones through Stripe. Production domains are `zumanely.ai` and `doctors.sirish.world`.

- `healthcare-assistant-backend/`: Spring Boot 3.2 on Java 17, built with Maven. Package `com.healthassist`.
- `healthcare-assistant-frontend/`: React 18 with Vite 5 and Tailwind, plain JSX (no TypeScript).
- Tests exist only for the coverage-transition feature (below). There is no linter.

## Commands

```bash
# Full stack (Postgres + backend :8080 + nginx frontend :3000)
docker compose up -d --build
docker compose up -d --build backend        # rebuild one service
docker logs -f healthassist-backend

# Production-style stack with TLS on 80/443 and the knowledge (RAG) service
docker compose -f docker-compose.ssl.yml up -d --build

# Backend locally (needs Postgres; DB_HOST defaults to "postgres", so set DB_HOST=localhost)
cd healthcare-assistant-backend && mvn spring-boot:run
mvn package -DskipTests                     # what the Dockerfile runs

# Frontend dev server on :3000; proxies /api to localhost:8080 (vite.config.js)
cd healthcare-assistant-frontend && npm install && npm run dev
npm run build
npm test                                    # Vitest (jsdom), incl. axe-core accessibility checks; single file: npx vitest run src/router.test.jsx

# Backend tests (no DB needed); single class: mvn test -Dtest=DeadlineCalculatorTest
cd healthcare-assistant-backend && mvn test
```

Secrets are read from the root `.env` by docker compose: `ANTHROPIC_API_KEY`, `ZOCDOC_API_KEY`, `DB_PASSWORD`, `SMTP_APP_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Google Calendar uses a service-account key mounted from `healthcare-assistant-backend/config/service-account.json` to `/app/config/`. Every backend setting lives in `src/main/resources/application.yml` as `${ENV_VAR:default}`.

## Architecture

**Request path.** The browser talks to nginx in the frontend container. nginx serves the SPA and proxies `/api/*` to `backend:8080`. In dev, Vite does the same proxying. `src/services/api.js` wraps every backend call.

**Frontend.**
- **Routing:** URL paths, through a ~60-line History-API router in `src/router.jsx` (`navigate`, `useLocation`, `Link`). There's no routing library. nginx's `try_files` fallback makes deep links work.
- **Routes:** `/` (home, aimed at people who just lost their job), `/compare` (the coverage wizard), `/chat`, `/more` (the former landing content), `/contact` (`?type=paid-60` for paid sessions) and `/profile`.
  - Stripe returns to `/?payment=success&session_id=…` or `/?payment=cancelled`, and `HomePage` shows a banner for each. Don't change those URLs without updating `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL`.
  - `legacyRedirect` maps `/transition` and the old `/#about`, `/#services` and `/#contact` anchors to their new locations.
- **Layout:** every page except `/chat` gets `SiteHeader`, `SiteFooter`, a floating `ChatLauncher` (tablet and desktop; on phones the chat button is in the header) and `ChatDrawer`, which renders `ChatInterface compact`. All pages except home are lazy-loaded.
- **Theme:** colour tokens are in `src/theme.js`. Use `BRAND.accent` (#17766C) for teal text and buttons; `#2AA89A` is too light for text on white.
- **Auth:** `AuthContext` handles Google Sign-In, and its script loads only when someone clicks "Sign in".

**Chat flow** (the core feature):
1. `ChatController` passes the request to `ChatService.processMessage`, which calls `AnthropicService.chat`.
2. `AnthropicService` first sends `GET {knowledge.service.url}/api/knowledge/search?q=…&top_k=5` to the knowledge RAG service. It adds the results to the large `SYSTEM_PROMPT_TEMPLATE`, then calls the Anthropic Messages API. The model is set in `application.yml` under `anthropic.api.model`. The client sends the conversation history with every request (`ChatRequest.conversationHistory`).
3. Doctor search uses a text-tag protocol, not native tool use. The system prompt tells Claude to emit `[DOCTOR_SEARCH: specialty="…", location="…", insurance="…"]`. `ChatService` regex-matches that tag, strips it, calls `ZocDocService.searchDoctors`, and returns `contentType=DOCTOR_RESULTS` with structured results. If you change the tag format, update the prompt and `DOCTOR_SEARCH_PATTERN` together.
4. If the user's message starts with `[User's insurance plan: …]`, the system prompt tells Claude to personalize answers to that plan. The frontend adds this prefix from the saved profile.

**Persistence.** Postgres through Spring Data JPA, using `ddl-auto: update`. There are no migrations, so the schema follows the entity classes (`UserEntity`, `ConversationEntity`, `MessageEntity`). The `/api/conversations` endpoints persist chat history separately from `/api/chat`, which is stateless.

**Auth.** `/api/auth/google` verifies a Google ID token and upserts a `UserEntity`. After that, the conversation and profile endpoints identify the user only through an `X-User-Id` request header. The server does not verify that header.

**Scheduling and payments.**
- `CalendarService` computes slots from Google Calendar free/busy data: 20-minute slots, 9am–5pm America/Los_Angeles, up to 14 days ahead. It inserts events on the calendar named by `CALENDAR_EMAIL`.
- `EmailService` sends notifications through Gmail SMTP.
- Paid sessions go through `StripeService`: `/api/payment/create-checkout-session` creates the checkout session, Stripe redirects back with `?payment=success&session_id=…`, and the app then calls `bookPaidSlot`. Stripe also sends events to `/api/payment/webhook`.

**Knowledge service.** It is referenced as `./knowledge-service`, a Python vector store queried by `test_rag-2.sh`, but that directory is not in this repo. Only `docker-compose.ssl.yml` defines it. Under the plain `docker-compose.yml`, the RAG lookup in `AnthropicService` has no target.

## Coverage transition feature ("Lost your job? Compare your coverage options")

- **Backend:** `com.healthassist.transition`. **Frontend:** `components/transition/`, at route `/compare`.
- **Rules engine:** `engine/` is pure Java with no I/O, logging or clock. It computes every number and eligibility decision. The chatbot only receives `chatSummary` and explains it.
- **Regulatory values:** stored in `src/main/resources/transition/regulatory/` (`common.yaml` plus `plan-year-YYYY.yaml`).
  - Every value carries `effectiveDate`, `sourceUrl`, `verified` and an optional `todo`. Shared source metadata uses YAML anchors and merge keys, and top-level `_` keys are dropped.
  - Bump `dataVersion` when values change.
  - To add a plan year, add a new file.
- **CMS Marketplace plan data:** `cms/`. `transition.cms.mode` is `auto` (live if `CMS_MARKETPLACE_API_KEY` is set, otherwise degrades), `live`, `fixture` (sample JSON in `resources/transition/cms-fixtures`) or `off`.
  - Only household-independent data is cached, in `TtlCache`.
  - Plan searches never send income; the engine applies subsidies itself.
- **Privacy (hard requirement):** the feature is stateless, with no DB writes and no logging of inputs or results.
  - Input records override `toString()` with a redacted value.
  - `TransitionExceptionHandler` never echoes rejected values.
  - Endpoints are POST only, and responses are `no-store`.
  - The frontend keeps the wizard in sessionStorage only.
  - "Ask about my results" opens the chat drawer in place with an `ephemeral-` conversation that `App.jsx` never sends to `/api/conversations`.
  - `TransitionControllerPrivacyTest` guards this; keep it passing.

## Repo quirks

- The two compose files have drifted apart: CORS origins, Stripe, SMTP and calendar env vars, and container names all differ. Check which one is deployed before relying on either.
- `fix-v*.sh` are old one-shot scripts that overwrite source files with heredocs. Don't run them. `*.old`, `*.bak` and `*.bak2` files are stale copies.
- `healthcare-assistant-frontend/package-lock.json` is owned by root, so a local `npm install` can't update it.
- Large media files (`public/hero-bg.mp4`) are committed. The landing page uses them as the hero background video.
