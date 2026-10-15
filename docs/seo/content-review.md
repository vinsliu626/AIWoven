# SEO content review — first batch (2026-10-15)

This file tracks the first batch of study-guide articles, the keyword each page owns, and every claim that a
human should verify before the batch is promoted. Articles live in `lib/blog/articles/*.ts` and render at
`/blog/<slug>`. Run `npm test -- tests/lib/blog-content.test.ts` after any edit: it checks unique slugs and
keywords, metadata lengths, dates, internal links, anchors, references, and the "detectors are not proof" rule.

## Status

All 14 articles are **drafted and live in the codebase** (statically generated, in the sitemap). They have not
had an independent editorial or fact-check review. Items under *Needs verification* below were checked
against search results during drafting, but the primary sources could not be opened from the build sandbox.

## Keyword ownership (avoid cannibalization)

| Keyword theme | Owner page | Supporting pages (link to the owner, don't compete) |
|---|---|---|
| AI study assistant | `/` (homepage) | `/chat` |
| AI note taker, AI lecture notes | `/ai-note` | `/blog/ai-note-vs-traditional-notes`, `/blog/turn-lecture-recordings-into-study-notes` |
| Audio to notes, lecture transcription | `/ai-note` | `/blog/convert-audio-to-study-notes` |
| AI flashcards | `/ai-study` | `/blog/turn-class-notes-into-flashcards` |
| AI detector | `/ai-detector` | the four AI Detection articles |

Each article declares a single `primaryKeyword`; the test suite fails if two articles share one.

## Articles

| # | Slug | Primary keyword | Category |
|---|---|---|---|
| 1 | `how-accurate-are-ai-detectors` | how accurate are AI detectors | AI Detection |
| 2 | `ai-detector-false-positives` | AI detector false positive | AI Detection |
| 3 | `how-do-ai-detectors-work` | how do AI detectors work | AI Detection |
| 4 | `ai-detector-vs-plagiarism-checker` | AI detector vs plagiarism checker | AI Detection |
| 5 | `turn-lecture-recordings-into-study-notes` | lecture recording to notes | Lecture Notes |
| 6 | `how-to-take-better-notes-in-college-lectures` | how to take better notes in college | Lecture Notes |
| 7 | `ai-note-vs-traditional-notes` *(existing URL, rewritten)* | AI note taker vs manual note taking | Lecture Notes |
| 8 | `convert-audio-to-study-notes` | audio to notes | Lecture Notes |
| 9 | `summarize-long-lectures-with-ai` | summarize lecture with AI | Lecture Notes |
| 10 | `turn-class-notes-into-flashcards` | turn notes into flashcards | Lecture Notes |
| 11 | `active-recall-vs-rereading` | active recall vs rereading | Study Skills |
| 12 | `how-to-study-for-exams-with-ai` | how to study for exams with AI | Study Skills |
| 13 | `create-study-guide-from-lecture-notes` | how to make a study guide from notes | Study Skills |
| 14 | `organize-university-notes` | how to organize university notes | Study Skills |

Article 7 replaces the April 2026 post at the same URL ("AI Notes vs Traditional Notes") instead of adding a
near-duplicate page; it keeps its original publish date and shows `Updated 2026-10-15`.

## Needs verification before promotion

### Citations (open each primary source and confirm)
- [ ] **OpenAI classifier** — URL `openai.com/index/new-ai-classifier-for-indicating-ai-written-text/` is the
      current path for the January 2023 post as far as we know; confirm it resolves and still carries the July 2023
      note. Figures used: 26% true positive, 9% false positive on the challenge set; withdrawn July 20, 2023.
- [ ] **Weber-Wulff et al. 2023**, IJEI 19:26, DOI 10.1007/s40979-023-00146-z — "14 tools including commercial
      systems"; quoted phrase "neither accurate nor reliable".
- [ ] **Liang et al. 2023**, *Patterns*, DOI 10.1016/j.patter.2023.100779 — TOEFL vs US 8th-grade essays; the
      article says "a large share" rather than quoting a percentage. Some coverage calls this an opinion piece;
      confirm the article type before describing it further.
- [ ] **Sadasivan et al.**, arXiv 2303.11156 — recursive paraphrasing reduces detection, including watermarking.
- [ ] **Kirchenbauer et al. 2023**, ICML (PMLR 202) — green-token watermark description.
- [ ] **Vanderbilt (Aug 16, 2023)** — 75,000 papers in 2022 and the "≈750 at 1%" arithmetic.
- [ ] **Dunlosky et al. 2013**, PSPI 14(1), DOI 10.1177/1529100612453266 — high: practice testing, distributed
      practice; moderate: elaborative interrogation, self-explanation, interleaving; low: summarization,
      highlighting, rereading (plus keyword mnemonic and imagery, not mentioned in the article).
- [ ] **Roediger & Karpicke 2006**, *Psychological Science* 17(3) — the article states only the qualitative
      result (restudy better at 5 minutes; testing better at 2 days and 1 week). Do not add percentages without
      checking the full text; secondary sources disagree on them.
- [ ] **Cepeda et al. 2006**, *Psychological Bulletin* 132(3) — optimal gap grows with retention interval.
- [ ] **Mueller & Oppenheimer 2014** and **Morehead, Dunlosky & Rawson 2019** — the replication found small,
      non-significant pooled effects favoring longhand.
- [ ] **Cornell method page** (University of Cincinnati) — confirm URL; attribution of the method to Walter Pauk.

### Product claims (confirm against the current app before each release)
- [ ] AI Note accepts MP3, M4A, WAV, WEBM, OGG, AAC, FLAC, and MP4 (`components/workspace/note/NoteUploadPane.tsx`),
      supports in-browser recording and pasted text, and produces Executive Summary, Key Definitions, Key Concepts,
      Relationships Between Concepts, optional sections, and Key Takeaways (`lib/aiNote/prompts.ts`).
- [ ] AI Study accepts PDF, DOCX, PPTX only (no pasted text) and generates notes, flashcards, or quizzes with
      explanations; generated cards sync into reusable flashcard sets.
- [ ] Quiz Me offers matching, fill-in-the-blank, and multiple choice over flashcard sets.
- [ ] AI Detector: English only, 80-word minimum, three-way breakdown, highlighted passages.
- [ ] Converter pairs referenced on landing pages: PDF→JPG/PNG/WEBP, JPG→PNG/WEBP/PDF, PNG→JPG/WEBP/PDF, WEBP→JPG
      (`lib/converter/config.ts`). Audio/video conversion is **not** enabled and is no longer advertised.
- [ ] AIWoven has **no plagiarism checker**; article 4 says so explicitly.

### Editorial judgment calls
- [ ] Time estimates in article 5's comparison table are labelled as rough guides, not measurements.
- [ ] Article 1's title says "in 2026" but its evidence is from 2023 studies; the article says so in a callout.
      Add newer independent evaluations if any are published before promotion.
- [ ] No author names, ratings, testimonials, or user counts are used anywhere. Bylines read "By AIWoven".

## Existing posts flagged for consolidation (not changed in this batch)

These older posts overlap with each other. Consider merging and 301-redirecting the weaker URL after checking
Search Console data for each:

- `best-ai-tools-for-students` / `ai-tools-for-college-students` / `how-ai-helps-college-students`
- `best-ai-humanizer-tool` / `ai-humanizer-guide` / `how-to-make-ai-text-sound-human`
- `pdf-to-jpg-converter` / `how-to-convert-pdf-to-jpg-online` (also overlaps the `/convert-pdf-to-jpg` landing page)
- `best-ai-detector-for-students` / `how-to-detect-ai-writing` (now also near the new AI Detection cluster)
