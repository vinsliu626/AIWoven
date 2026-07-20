# AIWoven

AIWoven is an AI-powered learning workspace that helps students transform lecture recordings and educational materials into structured notes and interactive study activities.

It connects note generation, flashcards, quizzes, matching exercises, and review history in one workflow, while keeping authentication, usage limits, and provider failures explicit and testable.

## Live Demo

- Product: [https://aiwoven.app](https://aiwoven.app)
- YouTube demo: **[Add YouTube demo URL before submission]**

## The Problem

During a fast-paced lecture, students often have to choose between listening closely enough to understand the material and trying to write down everything that might matter later. The resulting notes may be incomplete, difficult to review, or disconnected from the activities that help turn information into knowledge.

Many learning tools also address only one stage of this workflow. Students may need to move between platforms, upload the same source material repeatedly, reorganize generated content, and manage multiple services before they can move from a lecture to active practice.

## The Solution

AIWoven provides a connected path from source material to review:

1. Upload a lecture recording or supported educational document.
2. Generate structured, source-grounded notes.
3. Turn the learning material into flashcards, quizzes, and matching exercises.
4. Review and practice within the same workspace, with saved study history for later access.

## Core Features

- **AI Note generation:** Record audio or upload supported audio/video files, transcribe the source, and generate organized study notes with an executive summary, definitions, concepts, relationships, examples when supported, and key takeaways.
- **Upload integrity and recovery:** Chunked AI Note uploads include size and SHA-256 validation, retry handling, structured error codes, trace IDs, and resumable job status.
- **AI Study:** Extract text from PDF, DOCX, and PPTX files in the browser, then generate notes, flashcards, or quiz material within plan-specific limits.
- **Interactive flashcards:** Study with large flip cards, navigation, restart, and shuffle controls. Generated cards can also be synchronized into reusable flashcard sets.
- **Quizzes with explanations:** Multiple-choice, fill-in-the-blank, and matching questions include answers and explanations. The dedicated quiz route supports scoring, incorrect-answer review, and retry.
- **Matching practice:** Reusable flashcard material can be practiced as a term-to-answer matching activity.
- **Saved Study History:** Generated study sessions can be reopened, renamed, retried, or manually deleted. Ownership checks restrict every history operation to the signed-in user, and deleting a history row preserves reusable flashcard material through a nullable database relationship.
- **Authentication and access controls:** NextAuth provides JWT sessions with Google and GitHub providers when configured. Plans, quotas, billing state, owner-only analytics, and protected APIs are enforced on the server.
- **Multi-provider AI workflows:** AI Study tries configured providers in the order Groq, DeepSeek, and Kimi. AI Note uses Groq for primary generation and can route eligible provider failures through an ordered OpenRouter fallback list.
- **Operational error handling:** Provider attempts, retryability, fallback decisions, upload failures, and note-generation stages use structured logging and user-safe error responses.
- **Additional workspace tools:** The repository also contains AI Chat, AI Detector, AI Humanizer, and file-conversion workflows.
- **Production deployment:** The Next.js application is deployed on Vercel at `aiwoven.app`, with canonical site metadata and permanent same-path redirects from the previous Vercel hostname and `www` host.

## OpenAI Build Week Scope

The repository history shows that AIWoven was an existing application before the Build Week work began. The submission scope is therefore presented as a focused period of product hardening and significant improvement, not as a claim that the entire application was created during the event.

### Existing Before Build Week

The latest repository state before July 13, 2026 already included:

- Chat sessions and message persistence.
- AI Note upload, chunking, transcription, processing, and status routes.
- AI Study generation, usage, saved-session, and history routes.
- AI Detector, AI Humanizer, and Converter workspaces.
- NextAuth authentication, Stripe billing, plan entitlements, promo redemption, and usage controls.
- PostgreSQL persistence through Prisma.
- Unit, API, Stripe, detector integration, and Playwright test infrastructure.

### Built or Significantly Improved During Build Week

Commits from July 13, 2026 onward document these meaningful changes:

- Redesigned and unified the AIWoven workspace navigation, including responsive access behavior and protected Owner functionality.
- Completed the NexusDesk-to-AIWoven rename, canonical-domain migration, metadata updates, and deployment configuration.
- Reworked unauthenticated feature access so guests receive a sign-in prompt instead of being dropped directly into pricing, and made plan capabilities easier to compare.
- Refactored shared multi-model workflows and expanded normal-user and Owner acceptance coverage.
- Raised the quality target for generated flashcards, added duplicate filtering and expansion behavior, and added ownership-safe Study History deletion that preserves reusable flashcard sets.
- Added AI Note upload integrity validation, safer client errors, traceability, and targeted route tests.
- Reworked AI Note prompting and validation around source-grounded definitions, concepts, relationships, consistency checks, and complete note structure.
- Activated Groq-to-OpenRouter fallback behavior for eligible rate-limit, timeout, and upstream failures, with per-attempt telemetry.
- Added transcript canonicalization and punctuation normalization before note generation, while retaining raw transcript evidence for audit and debugging.

## How GPT-5.6 Was Used

GPT-5.6 was used during development as a product and engineering reasoning partner. It helped refine product requirements through iterative conversations, analyze product and technical problems, translate ideas into detailed implementation tasks, review architecture and design decisions, and improve prompts and validation plans.

This was a **development-time role**. The repository does not show GPT-5.6 as a production runtime dependency for note generation, flashcards, quizzes, or matching exercises. Runtime AI requests use the providers configured in the application, including Groq, OpenRouter, DeepSeek, and Kimi as described in the architecture below.

## How Codex Was Used

Codex served as an engineering development partner across the existing codebase. Concrete AIWoven work included:

- Inspecting the Next.js, Prisma, authentication, billing, AI Note, and AI Study implementation before changing it.
- Converting detailed product requirements into scoped implementation and validation steps.
- Refactoring the workspace navigation and shared multi-model UI without replacing unrelated functionality.
- Debugging asynchronous AI Note upload, transcription, staged generation, retry, and fallback behavior.
- Implementing Study History deletion with user ownership checks and preserved flashcard relationships.
- Improving flashcard prompts, minimum-card targets, deduplication, quiz explanations, and review behavior.
- Adding upload hashes, structured errors, trace IDs, provider-attempt telemetry, and health checks.
- Running focused Vitest suites, Playwright acceptance tests, TypeScript checks, production builds, and local-versus-deployed validation.
- Investigating GitHub and Vercel failures, then preparing focused commits and deployment fixes.

Codex accelerated implementation and investigation, but generated changes were reviewed, tested, and refined before they were accepted.

## Prompt Engineering Workflow

The development workflow was iterative:

1. Provide Codex with product context, constraints, and expected behavior.
2. Ask it to inspect the relevant existing code and Git state before making changes.
3. Produce an implementation and validation plan grounded in the repository.
4. Implement the requested changes in small, reviewable scopes.
5. Run tests, builds, and targeted local or production validations.
6. Review failures, logs, data relationships, and unexpected behavior.
7. Refine the instructions and repeat until the acceptance criteria are met.
8. Manually review the final changes before committing and deploying them.

AI-generated work was not accepted blindly. Final product, architecture, security, and design decisions remained under human control.

## Build Week Evidence

| Date | Commit | Change | Why it mattered |
| --- | --- | --- | --- |
| 2026-07-17 | [`49ca513`](https://github.com/vinsliu626/AIWoven/commit/49ca513) | Complete AIWoven workspace redesign and access controls | Unified the product workspace and strengthened route-level access behavior. |
| 2026-07-17 | [`92f5355`](https://github.com/vinsliu626/AIWoven/commit/92f5355) | Complete AIWoven navigation and domain migration | Connected the AIWoven brand, canonical URLs, navigation, redirects, and production domain. |
| 2026-07-17 | [`4e4243a`](https://github.com/vinsliu626/AIWoven/commit/4e4243a) | Improve guest sign-in and plan comparison | Improved first-use behavior for signed-out visitors and clarified plan capabilities. |
| 2026-07-18 | [`ac2713c`](https://github.com/vinsliu626/AIWoven/commit/ac2713c) | Refactor multimodel workflow and reduce duplicated code | Consolidated workspace behavior and expanded focused acceptance coverage. |
| 2026-07-18 | [`13c4b0d`](https://github.com/vinsliu626/AIWoven/commit/13c4b0d) | Improve study flashcard generation and history deletion | Improved study-set quality and added ownership-safe, relationship-aware history deletion. |
| 2026-07-18 | [`aca1a0c`](https://github.com/vinsliu626/AIWoven/commit/aca1a0c) | Improve AI Notes upload validation and error traceability | Added upload integrity checks, safer failures, and targeted API tests. |
| 2026-07-18 | [`332ced3`](https://github.com/vinsliu626/AIWoven/commit/332ced3) | Improve study note accuracy and consistency | Strengthened the note-generation pipeline, prompts, audits, and required output structure. |
| 2026-07-19 | [`da752ce`](https://github.com/vinsliu626/AIWoven/commit/da752ce) | Activate OpenRouter fallback on provider limits | Made eligible Groq failures continue through configured OpenRouter models. |
| 2026-07-19 | [`36b23b3`](https://github.com/vinsliu626/AIWoven/commit/36b23b3) | Normalize ASR punctuation before generation | Preserved raw evidence while producing a cleaner canonical transcript for note generation. |

`Codex session evidence: [Add relevant session IDs or screenshots before submission]`

## Technical Architecture

| Layer | Verified implementation |
| --- | --- |
| Web application | Next.js App Router, React, TypeScript, Tailwind CSS, and Framer Motion |
| Server APIs | Next.js Route Handlers with Zod request validation |
| Data | PostgreSQL with Prisma ORM and committed migrations |
| Authentication | NextAuth JWT sessions; Google and GitHub OAuth when configured; development-only credentials for E2E tests |
| AI Note transcription | Configured external ASR endpoint first, with Groq transcription fallback |
| AI Note generation | Groq primary generation with eligible OpenRouter fallback and structured provider-attempt logs |
| AI Study generation | OpenAI-compatible Groq, DeepSeek, and Kimi providers in configured fallback order |
| Document processing | PDF.js for PDF, Mammoth for DOCX, and JSZip for PPTX extraction |
| Media and conversion | Browser/server conversion utilities with FFmpeg support where required |
| Billing | Stripe Checkout, customer portal, webhooks, plans, promo codes, and usage entitlements |
| Quality | Vitest, Playwright, TypeScript, ESLint, route tests, and integration tests |
| Hosting | Vercel with `aiwoven.app` as the canonical production origin |

## Local Development

### Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL
- Python 3 for the optional local detector service
- Provider credentials for the features you intend to run

### Installation

```bash
git clone https://github.com/vinsliu626/AIWoven.git
cd AIWoven
npm install
```

Copy `.env.example` to an ignored local environment file such as `.env.local`, then replace placeholders with your own development values. Never commit secrets.

Generate the Prisma client and apply the committed migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

The repository's `.env.example` documents the baseline configuration; feature-specific variables are also read by the corresponding server modules. The main groups are:

| Variables | Purpose |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | Pooled application connection and direct Prisma migration connection |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Authentication origin and session signing secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in, when enabled |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub sign-in, when enabled |
| `NEXT_PUBLIC_SITE_URL` | Canonical metadata, sitemap, robots, and Open Graph origin |
| `GROQ_API_KEY` | AI Note primary generation, Groq transcription fallback, and first AI Study provider |
| `OPENROUTER_API_KEY`, `AI_NOTE_OPENROUTER_MODELS` | Optional ordered AI Note generation fallback |
| `DEEPSEEK_API_KEY`, `KIMI_API_KEY` | Optional AI Study provider fallbacks |
| `ASR_URL` | Optional external transcription service used before Groq transcription fallback |
| `DETECTOR_URL`, `PY_DETECTOR_URL` | AI Detector service location |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ULTRA` | Billing and subscription workflows |
| `PROMO_CODE_SECRET` | Secure hashing for promo-code redemption |
| `OWNER_EMAIL`, `OWNER_USER_ID` | Server-verified Owner identities |
| `E2E_*`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_PORT` | Local authenticated browser testing |

At least one supported generation provider must be configured for AI Study. AI Note requires Groq for primary generation; OpenRouter is an optional fallback for eligible failures.

### Local AI Detector

`/api/ai-detector` resolves its detector endpoint from `DETECTOR_URL`, then the backward-compatible `PY_DETECTOR_URL`, then the local default `http://127.0.0.1:8000/detect`.

Start the bundled detector stub:

```bash
npm run detector:local
```

Start Next.js and the local detector together:

```bash
npm run dev:all
```

Probe the configured Hugging Face detector endpoint:

```bash
npm run detector:probe:hf
```

The bundled service implements `POST /detect` and `GET /health`. The API returns structured `503` responses when the detector or database is unavailable and `504` when detection times out. `AI_DETECTOR_DEV_BYPASS_AUTH=1` is available only outside production for local route testing.

## Testing and Validation

```bash
# Unit, library, route, and integration tests
npm test

# Stripe-specific tests
npm run test:stripe

# TypeScript validation
npx tsc --noEmit

# ESLint
npm run lint

# Production build
npm run build

# Playwright browser acceptance tests
npm run test:e2e
```

Playwright reads `PLAYWRIGHT_BASE_URL` first and otherwise uses `PLAYWRIGHT_PORT`. When authenticated E2E testing is enabled, the test-only credentials provider is registered only outside production and seeded with `npm run test:seed`.

Additional targeted scripts include the local AI Detector checks in `scripts/test-ai-detector-local.ps1`, AI Note validation in `scripts/test-ai-note.mjs`, and authentication smoke checks in `scripts/auth-smoke.ps1`.

GitHub Actions runs Stripe tests and `npx tsc --noEmit` on pushes to `main` and on pull requests.

## Known Limitations

- AI Study document upload currently supports PDF, DOCX, and PPTX. PPTX extraction is best-effort and reads slide text; speaker notes and complex embedded objects are not guaranteed.
- AI Note accepts audio files and MP4 video, with a default 100 MB upload ceiling. Actual use is also subject to plan quotas and configured server limits.
- AI Study file size, extracted-text length, generation count, output count, difficulty, and cooldown limits vary by plan.
- Generation and transcription depend on configured external providers. Fallbacks improve resilience but cannot guarantee availability when every configured provider is unavailable or rate-limited.
- AI-generated notes and study activities are constrained to the supplied material and validated by the application, but users should still review generated learning content against the original source.

## AI-Assisted Development

AIWoven used GPT-5.6 and Codex as development assistants rather than replacements for software engineering judgment. Requirements, code changes, tests, architecture, design, and deployment decisions remained subject to human review and control.
