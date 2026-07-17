# AIWoven — Handshake Project Description

## 1. Short Project Story

I built AIWoven because students already have access to many powerful AI tools, but each one solves only one part of the learning process. One platform records lectures, another creates notes, another makes flashcards, and another provides AI chat. AIWoven brings those steps into one connected workspace. Students can turn lectures and documents into organized notes, generate large interactive flashcards and quizzes with explanations, switch between AI models, improve their writing, and convert files without constantly moving between websites. I built it around a problem I experience myself as a student: the tools are powerful, but the workflow is fragmented. My goal was to create one continuous path from lecture to review to exam.

## 2. How I Built It

AIWoven is a TypeScript application built with Next.js 16 App Router and React 19. The interface uses Tailwind CSS 4 and Framer Motion for responsive layouts and reduced-motion-aware animation. Server functionality is implemented with Next.js Route Handlers.

Data is stored in PostgreSQL through Prisma 6. The currently configured development database is hosted on Neon. NextAuth provides JWT-based sessions with Google and GitHub providers when their credentials are configured; a development-only Credentials provider exists for isolated Playwright acceptance tests. Owner access is verified again inside protected server pages and APIs rather than relying on client UI state.

The AI layer supports Groq and OpenRouter chat workflows and OpenAI-compatible DeepSeek and Kimi providers when configured. AI Note includes audio/transcript processing, AI Study generates structured notes, flashcards, and validated quizzes with explanations, and the detector can call the project’s detector service. File conversion uses browser and server utilities including PDF.js, Mammoth, JSZip, and FFmpeg where appropriate.

Billing and entitlements use Stripe Checkout, customer portal, and webhook flows. Internal usage limits, promo redemption, owner bypass behavior, and usage events are stored in PostgreSQL. Private Owner Analytics is protected by server-side authorization. The public website reads a separate cached aggregate containing only approved counts, never user IDs, emails, event rows, paths, IP data, or timestamps.

Quality checks use Vitest for unit and route tests and Playwright for authenticated desktop/mobile browser acceptance. The repository is configured for a standard Next.js production build and includes Vercel-oriented site URL and deployment behavior, without assuming that every local environment is deployed.

## 3. Verified Impact

As of July 17, 2026, the internal analytics database records **4 distinct registered students** completing **15 successful major-tool activities**, including **5 AI Study generation activities**. The database also contains **6 saved study sessions with flashcards**. These figures exclude anonymous website visits and are a point-in-time snapshot; the public homepage queries the same approved aggregate with a five-minute cache.
