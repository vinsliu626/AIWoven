import type { BlogPost } from "../types";

const PUBLISHED = "2026-10-15";

const refs = {
  dunlosky: {
    title: "Improving Students’ Learning With Effective Learning Techniques (Dunlosky, Rawson, Marsh, Nathan & Willingham), Psychological Science in the Public Interest 14(1)",
    publisher: "SAGE",
    year: "2013",
    url: "https://doi.org/10.1177/1529100612453266",
  },
  roediger: {
    title: "Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention (Roediger & Karpicke), Psychological Science 17(3)",
    publisher: "SAGE",
    year: "2006",
    url: "https://doi.org/10.1111/j.1467-9280.2006.01693.x",
  },
  cepeda: {
    title: "Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis (Cepeda et al.), Psychological Bulletin 132(3)",
    publisher: "American Psychological Association",
    year: "2006",
    url: "https://doi.org/10.1037/0033-2909.132.3.354",
  },
  apsPress: {
    title: "Which Study Strategies Make the Grade? (press release on Dunlosky et al., 2013)",
    publisher: "Association for Psychological Science",
    year: "2013",
    url: "https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html",
  },
};

export const studySkillsArticles: BlogPost[] = [
  {
    slug: "active-recall-vs-rereading",
    title: "Active Recall vs Rereading: Which Works Better?",
    description:
      "What the research says about active recall (retrieval practice) versus rereading, why rereading feels more effective than it is, and how to switch without wasting time.",
    category: "Study Skills",
    date: PUBLISHED,
    relatedToolUrl: "/ai-study",
    seoTitle: "Active Recall vs Rereading: What the Research Says | AIWoven",
    seoDescription:
      "Active recall beats rereading for long-term retention in many studies. See the evidence, why rereading feels productive, and a simple routine to use instead.",
    primaryKeyword: "active recall vs rereading",
    tags: ["active-recall", "study-skills", "spaced-repetition"],
    intro:
      "If you study by rereading your notes and highlighting, you are in very good company—it is one of the most common study habits. It is also one of the least effective for long-term memory. <strong>Active recall</strong>, also called retrieval practice, means closing the book and trying to bring the information back from memory. This guide summarizes the evidence, explains why rereading feels so convincing, and gives you a practical way to switch.",
    keyTakeaways: [
      "In many studies, practicing retrieval leads to better long-term retention than spending the same time restudying.",
      "Rereading can look better in the very short term, which is part of why it feels effective.",
      "A major review rated practice testing and spaced practice as high-utility techniques, and rereading and highlighting as low-utility.",
      "Combining active recall with spacing over several days is more effective than either alone.",
    ],
    sections: [
      {
        heading: "What the evidence says",
        blocks: [
          {
            type: "p",
            html: "In a well-known 2006 experiment, Roediger and Karpicke had students study short prose passages and then either take recall tests or restudy the passages. When students were tested five minutes later, repeated studying produced better recall. But on tests two days and one week later, the pattern reversed: students who had practiced recalling the material remembered substantially more than those who had restudied it.",
          },
          {
            type: "p",
            html: "A broader 2013 review by Dunlosky and colleagues evaluated ten common study techniques. It rated <strong>practice testing</strong> and <strong>distributed (spaced) practice</strong> as high utility—beneficial across many ages, materials, and test types—while rating <strong>rereading</strong>, <strong>highlighting</strong>, and <strong>summarization</strong> as low utility on their own.",
          },
          {
            type: "table",
            caption: "Selected ratings from Dunlosky et al. (2013)",
            headers: ["Technique", "Utility rating"],
            rows: [
              ["Practice testing (active recall)", "High"],
              ["Distributed practice (spacing)", "High"],
              ["Elaborative interrogation, self-explanation, interleaved practice", "Moderate"],
              ["Summarization, highlighting/underlining, rereading", "Low"],
            ],
          },
        ],
      },
      {
        heading: "Why rereading feels like it works",
        blocks: [
          {
            type: "p",
            html: "Rereading makes material feel familiar. Familiar text reads smoothly, and that smoothness is easy to mistake for knowing it. The test comes later, when you need to produce the answer without the page in front of you. Retrieval practice is uncomfortable precisely because it exposes what you can’t yet recall—and that discomfort is useful information about what to study next.",
          },
          {
            type: "callout",
            tone: "note",
            title: "Rereading still has a place",
            html: "Reading material carefully the first time is necessary—you can’t recall what you never understood. The problem is using rereading as your <em>main</em> review method. Read once to understand, then switch to retrieval.",
          },
        ],
      },
      {
        heading: "Five ways to practice active recall",
        blocks: [
          {
            type: "ol",
            items: [
              "<strong>Blurting:</strong> close your notes, write everything you remember about a topic, then check what you missed.",
              "<strong>Flashcards:</strong> question on the front, answer on the back—and answer before you flip. See <a href='/blog/turn-class-notes-into-flashcards'>how to make good flashcards from notes</a>.",
              "<strong>Practice questions:</strong> past papers, end-of-chapter questions, or a quiz generated from your slides in <a href='/ai-study'>AI Study</a>, which includes an explanation for each answer.",
              "<strong>Explain it:</strong> teach the concept out loud to a friend or an empty room without looking at notes.",
              "<strong>Cue questions:</strong> use the cue column of Cornell-style notes to quiz yourself (see <a href='/blog/how-to-take-better-notes-in-college-lectures'>better lecture notes</a>).",
            ],
          },
        ],
        toolLinks: [
          { href: "/ai-study", label: "Generate an explained quiz" },
          { href: "/quiz-me", label: "Quiz yourself on flashcards" },
        ],
      },
      {
        heading: "Add spacing for the biggest effect",
        blocks: [
          {
            type: "p",
            html: "Spacing your practice out over time is the other high-utility technique. A large meta-analysis by Cepeda and colleagues (2006) found that the best gap between study sessions depends on how long you need to remember the material—the longer the retention period, the longer the useful gap. In practice: review new material within a day or two, then again a few days later, then again before the exam.",
          },
          {
            type: "example",
            title: "A simple 30-minute active-recall session",
            lines: [
              "0–5 min   Blurt everything you remember from last lecture",
              "5–10 min  Check against your notes; mark gaps",
              "10–25 min Flashcards or practice questions on the gaps",
              "25–30 min Explain the hardest concept out loud",
              "Then: schedule the next review for 2–3 days later",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        question: "Is active recall better than rereading for every subject?",
        answer: "Retrieval practice has been studied across many subjects and materials and is consistently rated among the most effective techniques. Some skills, like solving problems, also need worked practice—but even there, attempting problems from memory is a form of active recall.",
      },
      {
        question: "How often should I use active recall?",
        answer: "Use it every time you review, and space reviews out over days rather than cramming them into one session. Short, frequent recall sessions tend to beat one long one.",
      },
      {
        question: "Are highlighters useless?",
        answer: "Highlighting was rated low utility as a study technique on its own. It can help you mark what to turn into questions later—just don’t count highlighting as studying.",
      },
    ],
    references: [refs.roediger, refs.dunlosky, refs.apsPress, refs.cepeda],
    ctaTitle: "Switch from rereading to retrieval",
    ctaDescription: "Generate flashcards and an explained quiz from your slides, then practice in several formats.",
    ctaLinks: [
      { href: "/ai-study", label: "Open AI Study" },
      { href: "/quiz-me", label: "Open Quiz Me" },
    ],
  },
  {
    slug: "how-to-study-for-exams-with-ai",
    title: "How to Study for Exams Using AI",
    description:
      "A week-by-week plan for using AI to prepare for exams—organizing material, generating practice questions, and understanding mistakes—while keeping your own thinking in charge.",
    category: "Study Skills",
    date: PUBLISHED,
    relatedToolUrl: "/ai-study",
    seoTitle: "How to Study for Exams Using AI: A Step-by-Step Plan | AIWoven",
    seoDescription:
      "Use AI to study for exams effectively: organize lectures into notes, generate practice questions, review mistakes, and avoid the shortcuts that hurt learning.",
    primaryKeyword: "how to study for exams with AI",
    tags: ["exam-prep", "ai-study-assistant", "active-recall"],
    intro:
      "AI is most useful for exam prep when it removes busywork—organizing scattered material, generating practice questions, explaining a confusing step—so that more of your time goes to the part that builds memory: practicing. It is least useful when it does the thinking for you. This guide lays out a plan, from two weeks out to the night before, with honest notes on where AI helps and where it doesn’t.",
    keyTakeaways: [
      "Use AI to organize material and generate practice, not to produce answers you then read.",
      "Start with the syllabus and past papers so you know what to prioritize.",
      "Spend most of your time on practice questions and spaced review.",
      "Always check AI explanations against your course materials, and follow your course’s AI policy.",
    ],
    sections: [
      {
        heading: "First: check what is allowed",
        blocks: [
          {
            type: "callout",
            tone: "warning",
            title: "Know your course’s AI policy",
            html: "Policies differ between institutions, courses, and even assignments. Using AI to make study materials for yourself is usually treated differently from using it on assessed work—but check, and never use AI in an exam unless it is explicitly permitted.",
          },
        ],
      },
      {
        heading: "Two weeks out: map the exam",
        blocks: [
          {
            type: "ol",
            items: [
              "List every topic from the syllabus, lecture titles, and any exam guidance.",
              "Rate each topic: confident, shaky, or lost.",
              "Gather your materials: slides, readings, and lecture notes. Turn any lecture recordings you haven’t processed into structured notes with <a href='/ai-note'>AI Note</a>.",
              "Build a one-page study guide per major topic (see <a href='/blog/create-study-guide-from-lecture-notes'>how to create a study guide from lecture notes</a>).",
            ],
          },
        ],
        toolLinks: [{ href: "/ai-note", label: "Process lecture recordings" }],
      },
      {
        heading: "One week out: switch to practice",
        blocks: [
          {
            type: "p",
            html: "This is where most of your time should go. Retrieval practice and spacing are among the best-supported study techniques (see <a href='/blog/active-recall-vs-rereading'>active recall vs rereading</a>).",
          },
          {
            type: "ul",
            items: [
              "Upload each lecture’s slides to <a href='/ai-study'>AI Study</a> and generate a quiz. Each question includes an explanation, and wrong answers show your answer next to the correct one.",
              "Generate flashcards for definitions and key relationships, then practice them in <a href='/quiz-me'>Quiz Me</a> as matching, fill-in-the-blank, or multiple choice.",
              "Do real past papers if your course provides them—AI-generated questions are practice, not a prediction of the exam.",
              "Revisit each “shaky” topic every couple of days instead of finishing one topic completely before starting the next.",
            ],
          },
        ],
        toolLinks: [
          { href: "/ai-study", label: "Generate a practice quiz" },
          { href: "/quiz-me", label: "Practice flashcards" },
        ],
      },
      {
        heading: "Use AI to understand mistakes, not to skip them",
        blocks: [
          {
            type: "p",
            html: "When you get something wrong, the most valuable step is understanding why. A good pattern with a general assistant like <a href='/chat'>AI Chat</a>:",
          },
          {
            type: "example",
            title: "Prompts that keep you thinking",
            lines: [
              "“Here is my answer and the correct answer. Ask me questions that",
              " help me find my mistake—don't tell me directly.”",
              "",
              "“Explain this concept in two different ways, then give me one",
              " new question to check I understood.”",
              "",
              "“What is the most common misconception about this topic?”",
            ],
          },
          {
            type: "p",
            html: "Check explanations against your lecture notes and textbook. AI can be confidently wrong, and your exam is marked against your course’s definitions.",
          },
        ],
      },
      {
        heading: "The last two days",
        blocks: [
          {
            type: "ul",
            items: [
              "Focus on topics you’re still getting wrong in practice.",
              "Do one timed practice under exam-like conditions if possible.",
              "Review your one-page study guides rather than learning new material.",
              "Sleep. Late-night cramming trades away the consolidation you need.",
            ],
          },
        ],
      },
      {
        heading: "Common AI study mistakes to avoid",
        blocks: [
          {
            type: "table",
            caption: "Helpful vs harmful AI use for exam prep",
            headers: ["Instead of…", "Try…"],
            rows: [
              ["Reading AI summaries over and over", "Turning summaries into questions and answering them"],
              ["Asking AI to answer practice questions for you", "Answering first, then asking for feedback"],
              ["Trusting every explanation", "Checking against slides and textbook"],
              ["Generating hundreds of flashcards", "Keeping the cards that match the syllabus"],
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        question: "Can AI predict what will be on my exam?",
        answer: "No. AI can help you practice the material and identify important concepts, but only your course materials, syllabus, and instructor indicate what will be assessed.",
      },
      {
        question: "Is it cheating to study with AI?",
        answer: "Using AI to create study materials for yourself is generally different from using it on graded work, but rules vary. Check your course and institution’s policies.",
      },
    ],
    references: [refs.dunlosky, refs.roediger, refs.cepeda],
    ctaTitle: "Build your exam practice in minutes",
    ctaDescription: "Turn slides into explained quizzes and flashcards, and lectures into structured notes.",
    ctaLinks: [
      { href: "/ai-study", label: "Open AI Study" },
      { href: "/ai-note", label: "Open AI Note" },
    ],
  },
  {
    slug: "create-study-guide-from-lecture-notes",
    title: "How to Create a Study Guide from Lecture Notes",
    description:
      "A step-by-step method and template for turning a semester of lecture notes into a focused study guide—scope, structure, connections, and built-in practice questions.",
    category: "Study Skills",
    date: PUBLISHED,
    relatedToolUrl: "/ai-note",
    seoTitle: "How to Create a Study Guide from Lecture Notes (Template) | AIWoven",
    seoDescription:
      "Turn lecture notes into a focused study guide: define the scope, organize by topic, capture definitions and relationships, and add practice questions. Template included.",
    primaryKeyword: "how to make a study guide from notes",
    tags: ["study-guide", "lecture-notes", "exam-prep"],
    intro:
      "A study guide is not a shorter copy of your notes. It is a map of what you need to know for one exam, organized so that you can test yourself on it. A good one is short enough to review in one sitting and complete enough that nothing assessed is missing. Here is a step-by-step method and a template you can reuse.",
    keyTakeaways: [
      "Define the scope from the syllabus and exam guidance before you start writing.",
      "Organize by topic, not by lecture date.",
      "Every topic gets definitions, key relationships, one example, and practice questions.",
      "Leave the answers out of the main guide so it doubles as a self-test.",
    ],
    sections: [
      {
        heading: "Step 1: Define the scope",
        blocks: [
          {
            type: "p",
            html: "Start from what is assessed: the syllabus, learning outcomes, exam format, and anything the instructor said about the exam. List the topics, and note which lectures cover each. Topics often span several lectures, which is why organizing by topic beats organizing by date.",
          },
        ],
      },
      {
        heading: "Step 2: Get every lecture into a consistent format",
        blocks: [
          {
            type: "p",
            html: "Study guides are much easier to build from notes that share a structure. If your notes are a mix of handwriting, slides, and recordings, standardize them first. For recordings, <a href='/ai-note'>AI Note</a> produces the same sections every time—executive summary, key definitions, key concepts, relationships between concepts, and key takeaways—which map directly onto the template below. For more on processing recordings, see <a href='/blog/turn-lecture-recordings-into-study-notes'>turning lecture recordings into notes</a>.",
          },
        ],
        toolLinks: [{ href: "/ai-note", label: "Standardize lecture notes" }],
      },
      {
        heading: "Step 3: Fill in the template for each topic",
        blocks: [
          {
            type: "example",
            title: "Study guide template (one topic)",
            lines: [
              "TOPIC: ______________________   Lectures: __, __   Confidence: low / med / high",
              "",
              "1. Big picture (2–3 sentences): what is this and why does it matter?",
              "2. Must-know definitions: term — definition in my own words",
              "3. Key relationships: X → Y because ___ ; X vs Y: ___",
              "4. One worked example (from the lecture or textbook)",
              "5. Common mistakes / easily confused ideas",
              "6. Practice questions (answers on a separate page):",
              "   a) recall:   What is ___?",
              "   b) explain:  Why does ___ cause ___?",
              "   c) apply:    Given ___, what happens to ___?",
            ],
          },
          {
            type: "p",
            html: "Keep each topic to roughly one page. If it runs longer, you are probably copying notes rather than distilling them.",
          },
        ],
      },
      {
        heading: "Step 4: Connect the topics",
        blocks: [
          {
            type: "p",
            html: "Exams often reward understanding how topics relate. Add a final page that links them: a simple concept map, or a list of “X is used in Y” and “X contrasts with Y” statements. This is where you’ll often discover gaps in your understanding.",
          },
        ],
      },
      {
        heading: "Step 5: Use the guide as a test, not a reading",
        blocks: [
          {
            type: "ol",
            items: [
              "Cover everything except the topic names and try to reconstruct each section from memory.",
              "Answer the practice questions without notes, then check.",
              "Turn weak spots into flashcards (see <a href='/blog/turn-class-notes-into-flashcards'>how to turn notes into flashcards</a>).",
              "Revisit the guide on a spaced schedule in the weeks before the exam.",
            ],
          },
          {
            type: "p",
            html: "For extra practice questions, upload the relevant slides to <a href='/ai-study'>AI Study</a> and generate a quiz—each answer comes with an explanation you can compare with your guide.",
          },
        ],
        toolLinks: [{ href: "/ai-study", label: "Generate practice questions" }],
      },
    ],
    faqs: [
      {
        question: "How long should a study guide be?",
        answer: "Short enough to review in one sitting—often around a page per major topic. Its job is to point to what you must know and test you on it, not to replace your notes.",
      },
      {
        question: "Should I make my study guide by hand or with AI?",
        answer: "Making it yourself is part of studying, because deciding what matters forces you to process the material. AI can speed up the organizing and generate practice questions; review and edit anything it produces.",
      },
    ],
    references: [refs.dunlosky],
    ctaTitle: "Start your study guide from structured notes",
    ctaDescription: "Turn lectures into consistent notes, then generate practice questions from your slides.",
    ctaLinks: [
      { href: "/ai-note", label: "Open AI Note" },
      { href: "/ai-study", label: "Open AI Study" },
    ],
  },
  {
    slug: "organize-university-notes",
    title: "How to Organize University Notes Efficiently",
    description:
      "A simple, low-maintenance system for organizing university notes across courses: folder structure, file naming, a weekly routine, and what to do with recordings and scans.",
    category: "Study Skills",
    date: PUBLISHED,
    relatedToolUrl: "/ai-note",
    seoTitle: "How to Organize University Notes Efficiently (Simple System) | AIWoven",
    seoDescription:
      "Organize university notes with a simple system: one folder per course, consistent file names, a weekly 15-minute routine, and a plan for recordings, slides, and scans.",
    primaryKeyword: "how to organize university notes",
    tags: ["organization", "note-taking", "study-skills"],
    intro:
      "Most note systems fail not because they are too simple but because they are too elaborate to keep up during a busy semester. The goal is a system you can maintain in fifteen minutes a week and that lets you find any lecture’s notes in seconds when exams arrive. Here is one that works across handwritten notes, typed notes, recordings, and slides.",
    keyTakeaways: [
      "One folder per course, one subfolder per week, and the same file-naming pattern everywhere.",
      "Keep a single “source of truth” per lecture so you never have to compare three versions.",
      "A 15-minute weekly routine prevents end-of-semester chaos.",
      "Process recordings and scans weekly; an unprocessed recording is hard to study from.",
    ],
    sections: [
      {
        heading: "Folder structure",
        blocks: [
          {
            type: "example",
            title: "Example folder layout",
            lines: [
              "Semester-2026-Fall/",
              "  BIO-201 Cell Biology/",
              "    00-Admin/            syllabus, rubric, exam info",
              "    Week-01/",
              "      2026-09-01_L01_Cell-membranes_notes.md",
              "      2026-09-01_L01_Cell-membranes_slides.pdf",
              "      2026-09-01_L01_Cell-membranes_audio.m4a",
              "    Week-02/ …",
              "    Exam-prep/           study guides, practice quizzes",
            ],
          },
          {
            type: "p",
            html: "Dates in <code>YYYY-MM-DD</code> format sort correctly, and putting the lecture number and topic in every file name means search works even if files end up in the wrong folder.",
          },
        ],
      },
      {
        heading: "One source of truth per lecture",
        blocks: [
          {
            type: "p",
            html: "It is common to end up with handwritten notes, a slide deck, a recording, and an AI summary for the same lecture. Pick one document as the source of truth—usually your typed or structured notes—and fold the others into it: add missing definitions from the AI notes, paste in key slide diagrams, and note the timestamp of anything in the recording you want to revisit.",
          },
        ],
      },
      {
        heading: "The 15-minute weekly routine",
        blocks: [
          {
            type: "ol",
            items: [
              "<strong>Collect:</strong> move this week’s slides, scans, and recordings into the course’s week folder and rename them.",
              "<strong>Process:</strong> turn recordings into structured notes with <a href='/ai-note'>AI Note</a>, and photos of handouts into PDFs with the <a href='/converter'>Converter</a> if needed.",
              "<strong>Merge:</strong> update each lecture’s source-of-truth notes.",
              "<strong>Extract:</strong> add new definitions and key relationships to your flashcards (see <a href='/blog/turn-class-notes-into-flashcards'>turning notes into flashcards</a>).",
              "<strong>Flag:</strong> write down anything you don’t understand to ask about next week.",
            ],
          },
        ],
        toolLinks: [
          { href: "/ai-note", label: "Process this week’s recordings" },
          { href: "/converter", label: "Convert images to PDF" },
        ],
      },
      {
        heading: "Choosing formats that last",
        blocks: [
          {
            type: "table",
            caption: "Formats for different kinds of material",
            headers: ["Material", "Good format", "Why"],
            rows: [
              ["Typed notes", "Markdown, DOCX, or your notes app", "Searchable and easy to edit"],
              ["Slides and readings", "PDF", "Preserves layout; works with most study tools"],
              ["Handwritten pages", "Scanned PDF", "One file per lecture instead of many photos"],
              ["Recordings", "M4A or MP3", "Widely supported and reasonably small"],
            ],
          },
          {
            type: "p",
            html: "Keeping slides and notes as PDF or DOCX also means you can upload them to <a href='/ai-study'>AI Study</a> later to generate flashcards or a practice quiz without converting anything at exam time.",
          },
        ],
      },
      {
        heading: "When exams arrive",
        blocks: [
          {
            type: "p",
            html: "With everything organized by week and topic, building a study guide is mostly a matter of collecting each topic’s notes into one place. See <a href='/blog/create-study-guide-from-lecture-notes'>how to create a study guide from lecture notes</a> and <a href='/blog/how-to-study-for-exams-with-ai'>how to study for exams using AI</a>.",
          },
        ],
      },
    ],
    faqs: [
      {
        question: "Should I organize notes by date or by topic?",
        answer: "Store them by date (week folders), because that’s how they arrive and it’s easy to maintain. Organize your study guides by topic, because that’s how exams test you.",
      },
      {
        question: "What’s the best app for organizing university notes?",
        answer: "The best app is the one you’ll keep using. A consistent folder structure and naming pattern matter more than the specific app, and they let you switch tools later without losing anything.",
      },
    ],
    ctaTitle: "Process this week’s lectures in minutes",
    ctaDescription: "Turn recordings into structured notes and course files into flashcards and quizzes.",
    ctaLinks: [
      { href: "/ai-note", label: "Open AI Note" },
      { href: "/ai-study", label: "Open AI Study" },
    ],
  },
];
