# AI Note audio data retention

**Status:** 2026-10-15. Follow-up to finding F-08 in `docs/audits/audio-to-notes-audit.md`.
**Scope:** data created by audio notes (upload and in-browser recording).
**Not changed:** the privacy page (`app/privacy/page.tsx`), production configuration, and any existing rows. No existing user data has been deleted.

## 1. What is stored

| Table | Contents | Sensitive? |
|---|---|---|
| `AiNoteSession` | Owner and creation time | Low |
| `AiNoteChunk.data` | Raw audio bytes as uploaded or recorded | **High:** lecture audio, possibly other voices |
| `AiNoteTranscript` | Per-segment ASR text (`text`, `rawText`, `canonicalText`) and hashes | **High:** full spoken content |
| `AiNoteSummaryPart` | Per-segment LLM "evidence ledgers" | Medium–High (derived content) |
| `AiNoteJob` | Stage, progress, billing seconds, hashes, and the finished note (`noteMarkdown`) | Medium (user output) |

`AiNoteJob` is not linked to `AiNoteSession` by a cascading foreign key, so deleting a session does not delete its job or note.

## 2. Actual behaviour

### Before this change (verified in code)

| State | Audio | Transcripts | Ledgers | Note |
|---|---|---|---|---|
| Completed | Deleted at completion | **Kept indefinitely** | **Kept indefinitely** | Kept |
| User cancelled an upload (`DELETE /api/ai-note/start`) | Deleted (cascade) | Deleted (cascade) | Deleted (cascade) | Job row kept, if one exists |
| Failed or interrupted (any stage before `done`) | **Kept indefinitely** | **Kept indefinitely** | **Kept indefinitely** | Partial draft, if any |
| Abandoned (closed tab, never finalized) | **Kept indefinitely** | n/a | n/a | n/a |

There was no scheduled cleanup anywhere in the repository. `app/privacy/page.tsx:35` says audio inputs "are processed temporarily and are not stored long-term".

### After this change

| State | Audio | Transcripts | Ledgers | Note |
|---|---|---|---|---|
| Completed | Deleted at completion | **Deleted at completion** | **Deleted at completion** | Kept |
| User cancelled | Unchanged (deleted) | Unchanged | Unchanged | Unchanged |
| Failed or interrupted | Unchanged (kept): **needs a decision** (§3) | Unchanged | Unchanged | Unchanged |
| Abandoned | Unchanged (kept): **needs a decision** (§3) | n/a | n/a | n/a |

**Why completed-note cleanup was safe to implement.** After a note completes, no code reads its transcripts or ledgers. The finalize `done` branch and `/api/ai-note/status` serve `AiNoteJob.noteMarkdown`, and `?resumeNoteId=` uses only that field for completed notes. Deletion runs only after the finished note is saved. It is best-effort: a failure is ignored and does not fail the note. It affects only notes that complete after this change. Transcript hashes stay on `AiNoteJob` for traceability. Code: `deleteCompletedNoteProcessingData` in `app/api/ai-note/finalize/route.ts`. Tests: `tests/api/ai-note-finalize-stages.test.ts` ("retention of processing data").

## 3. Proposed retention periods (need approval)

| State | Proposal | Rationale |
|---|---|---|
| Completed: audio, transcripts, ledgers | Delete at completion | **Implemented** (above) |
| Completed: finished note | Keep while the account exists, or until a note-history feature defines a period | It is the user's output, and resume links depend on it. This is a product decision. |
| Abandoned (no job, no chunk upload for 24 h) | Delete audio after **24 h** | No path can use it; recording uploads keep the session "active" while chunks arrive |
| Failed or interrupted job (no update for 7 days) | Delete audio, transcripts, ledgers after **7 days** | Long enough for "Retry from finalizing", short enough to honour "not stored long-term" |

These values are encoded as a proposal in `lib/aiNote/retention.ts` (`AI_NOTE_RETENTION_PROPOSAL`). `classifyAiNoteRetention` decides eligibility only and deletes nothing. Tests: `tests/api/ai-note-retention.test.ts`.

## 4. Not done, and why

- **No scheduled deletion of abandoned or failed sessions.** It would delete existing user data, needs the periods above approved, and needs a scheduler. The repository has no cron configuration, and adding one is a production configuration change.
- **No privacy-page edits.** After the change, completed notes match the page's claim. Abandoned and failed sessions still do not, until the cleanup is approved. Whether the page should change is an owner or legal decision.

## 5. How to proceed

1. Size the problem with the read-only report. It only reads, and prints counts and sizes, never content or user IDs:
   ```bash
   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/ai-note-retention-report.ts
   ```
   This has been verified only against an empty local development database.
2. Approve or adjust the periods in §3.
3. Then, as a separate reviewed change: add a cleanup job that uses `classifyAiNoteRetention`. It should run in dry-run mode first, delete in small batches, and log counts only. Schedule it (Vercel cron or another worker).
