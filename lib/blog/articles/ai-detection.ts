import type { BlogPost } from "../types";

const PUBLISHED = "2026-10-15";

const refs = {
  openaiClassifier: {
    title: "New AI classifier for indicating AI-written text (with July 2023 update)",
    publisher: "OpenAI",
    year: "2023",
    url: "https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/",
  },
  weberWulff: {
    title: "Testing of detection tools for AI-generated text (Weber-Wulff et al.), International Journal for Educational Integrity 19, 26",
    publisher: "Springer Nature",
    year: "2023",
    url: "https://doi.org/10.1007/s40979-023-00146-z",
  },
  liang: {
    title: "GPT detectors are biased against non-native English writers (Liang, Yuksekgonul, Mao, Wu & Zou), Patterns",
    publisher: "Cell Press",
    year: "2023",
    url: "https://doi.org/10.1016/j.patter.2023.100779",
  },
  sadasivan: {
    title: "Can AI-Generated Text be Reliably Detected? (Sadasivan, Kumar, Balasubramanian, Wang & Feizi)",
    publisher: "arXiv:2303.11156",
    year: "2023",
    url: "https://arxiv.org/abs/2303.11156",
  },
  vanderbilt: {
    title: "Guidance on AI Detection and Why We’re Disabling Turnitin’s AI Detector",
    publisher: "Vanderbilt University",
    year: "2023",
    url: "https://www.vanderbilt.edu/brightspace/2023/08/16/guidance-on-ai-detection-and-why-were-disabling-turnitins-ai-detector/",
  },
  kirchenbauer: {
    title: "A Watermark for Large Language Models (Kirchenbauer et al.), Proceedings of ICML 2023, PMLR 202",
    publisher: "PMLR",
    year: "2023",
    url: "https://proceedings.mlr.press/v202/kirchenbauer23a.html",
  },
};

export const aiDetectionArticles: BlogPost[] = [
  {
    slug: "how-accurate-are-ai-detectors",
    title: "How Accurate Are AI Detectors in 2026?",
    description:
      "What “accuracy” actually means for AI detectors, what independent research has found, and how to read a detector score without over-trusting it.",
    category: "AI Detection",
    date: PUBLISHED,
    relatedToolUrl: "/ai-detector",
    seoTitle: "How Accurate Are AI Detectors? Evidence & Limits (2026) | AIWoven",
    seoDescription:
      "AI detectors can be useful signals but are not proof. Learn what accuracy figures mean, what independent studies found, and how to interpret a score responsibly.",
    primaryKeyword: "how accurate are AI detectors",
    tags: ["ai-detection", "accuracy", "academic-integrity"],
    intro:
      "Short answer: AI detectors are good enough to be a useful <strong>signal</strong> and not reliable enough to be <strong>proof</strong>. How accurate a specific detector is depends heavily on the text you give it—its length, how much it was edited, who wrote it, and which model produced any AI portions. This guide explains what accuracy numbers really measure, what independent research has found so far, and how to read a score without drawing conclusions it cannot support.",
    keyTakeaways: [
      "A single “accuracy %” hides two different errors: missing AI text (false negatives) and flagging human text (false positives).",
      "Independent evaluations have repeatedly found detectors less reliable than their marketing suggests, especially on edited or paraphrased text.",
      "False positives matter most for students, and published research has found higher false-positive rates for some non-native English writers.",
      "Treat a detector score as a reason to look more closely—never as evidence of authorship on its own.",
    ],
    sections: [
      {
        heading: "What “accuracy” means for an AI detector",
        blocks: [
          {
            type: "p",
            html: "An AI detector is a classifier: it looks at a piece of text and estimates whether it resembles AI-generated writing. Like any classifier, it can be wrong in two directions, and those two errors have very different consequences.",
          },
          {
            type: "table",
            caption: "The four possible outcomes when a detector judges a document",
            headers: ["", "Detector says “AI”", "Detector says “human”"],
            rows: [
              ["Text was AI-generated", "True positive (correct)", "False negative — AI text slips through"],
              ["Text was human-written", "<strong>False positive</strong> — a person is wrongly flagged", "True negative (correct)"],
            ],
          },
          {
            type: "p",
            html: "A vendor can report a high overall accuracy while still producing false positives that matter enormously to the people affected. A detector that is tuned to almost never flag human writing will usually miss more AI text, and vice versa. That trade-off is why you should look for <strong>both</strong> the false-positive rate and the detection rate—and ask what kind of text they were measured on.",
          },
        ],
      },
      {
        heading: "What independent research has found",
        blocks: [
          {
            type: "p",
            html: "Several well-documented evaluations are worth knowing about. They are not the final word—detectors and language models both keep changing—but they show consistent patterns.",
          },
          {
            type: "ul",
            items: [
              "<strong>OpenAI’s own classifier (2023).</strong> When OpenAI launched its AI text classifier, it reported that on its challenge set the tool correctly identified 26% of AI-written text as “likely AI-written” while mislabeling human text as AI-written 9% of the time. OpenAI withdrew the tool in July 2023, citing its low rate of accuracy.",
              "<strong>Weber-Wulff et al. (2023).</strong> A team of researchers tested 14 detection tools, including commercial systems, and concluded the tools were “neither accurate nor reliable,” with performance dropping further when AI text was machine-translated or obfuscated.",
              "<strong>Liang et al. (2023).</strong> Researchers at Stanford found that several popular detectors misclassified a large share of essays written by non-native English speakers (TOEFL essays) as AI-generated, while classifying essays by US eighth-graders far more accurately.",
              "<strong>Sadasivan et al. (2023).</strong> This paper showed that repeatedly paraphrasing AI text can sharply reduce detection rates across several detector types, and argued that reliable detection becomes harder as models improve.",
            ],
          },
          {
            type: "callout",
            tone: "note",
            title: "A note on “2026” accuracy claims",
            html: "Detectors are updated frequently, so results from 2023 studies do not describe every tool you can use today. But the underlying limits—edited text, short text, and writer-dependent false positives—have not been eliminated. Be skeptical of any tool that claims near-perfect accuracy without publishing how and on what text it was tested.",
          },
        ],
      },
      {
        heading: "Why a vendor’s accuracy number may not apply to your text",
        blocks: [
          {
            type: "p",
            html: "Even an honest benchmark measures performance on a particular test set. Your document may look nothing like it. These factors change how reliable a score is:",
          },
          {
            type: "table",
            caption: "Factors that make a detector score more or less trustworthy",
            headers: ["Factor", "Why it matters"],
            rows: [
              ["Text length", "Short texts give the model very little evidence. Many tools set a minimum length for this reason (AIWoven’s detector requires at least 80 words)."],
              ["Editing and paraphrasing", "Human revision of AI drafts—or AI polishing of human drafts—produces mixed text that detectors handle poorly."],
              ["Writer background", "Simpler, more predictable phrasing (common among language learners) can look “AI-like” to statistical methods."],
              ["Genre", "Formulaic writing such as lab reports, abstracts, or definitions is naturally predictable, which can raise scores."],
              ["Source model", "A detector trained mostly on one family of models may generalize poorly to newer or different ones."],
            ],
          },
        ],
      },
      {
        heading: "How to read a detector score responsibly",
        blocks: [
          {
            type: "ol",
            items: [
              "<strong>Read the score as a probability, not a verdict.</strong> “72% AI” means the model finds the text similar to AI writing it has seen; it does not mean 72% of the words were written by AI.",
              "<strong>Look at which passages drove the score.</strong> Sentence-level highlights tell you where to look. A score driven entirely by a formulaic definition paragraph means something different from one driven by an entire essay.",
              "<strong>Compare with other evidence.</strong> Drafts, version history, notes, sources, and the writer’s ability to explain their reasoning are far stronger evidence than any classifier output.",
              "<strong>Never act on a score alone.</strong> Universities including Vanderbilt have publicly disabled AI detection features over false-positive concerns, and vendors themselves generally advise against using scores as the sole basis for decisions.",
            ],
          },
        ],
      },
      {
        heading: "How AIWoven’s detector reports results",
        blocks: [
          {
            type: "p",
            html: "The <a href='/ai-detector'>AIWoven AI Detector</a> is built to be read as a signal. It accepts English text of at least 80 words and returns a three-way breakdown—AI-generated, human-written and AI-refined, and human-written—plus highlighted passages that contributed most to the AI-like signal. Every report includes a reminder that detection is probabilistic.",
          },
          {
            type: "p",
            html: "If you are a student checking your own draft, the most useful thing the report gives you is not the headline number but the highlighted passages: places where your phrasing is generic enough that you may want to add your own reasoning, examples, or sources. If you want to understand the mechanics behind the scores, read <a href='/blog/how-do-ai-detectors-work'>how AI detectors work</a>.",
          },
        ],
        toolLinks: [{ href: "/ai-detector", label: "Check a draft with AI Detector" }],
      },
    ],
    faqs: [
      {
        question: "Can an AI detector prove that a student used AI?",
        answer: "No. A detector produces a statistical estimate of how closely text resembles AI writing. It cannot identify who wrote something or how it was produced, and it can be wrong in both directions.",
      },
      {
        question: "Which AI detector is the most accurate?",
        answer: "There is no independent, up-to-date leaderboard that settles this. Accuracy varies by text type and changes as tools and language models are updated. Look for tools that publish their false-positive rates and test conditions.",
      },
      {
        question: "Do AI detectors work on short texts?",
        answer: "Generally less well. Short passages provide little statistical evidence, which is why many detectors set a minimum length and why scores on short texts should be treated with extra caution.",
      },
    ],
    references: [refs.openaiClassifier, refs.weberWulff, refs.liang, refs.sadasivan, refs.vanderbilt],
    ctaTitle: "Review your draft before you submit",
    ctaDescription: "See an AI-likelihood breakdown and the specific passages behind it—then decide what to revise.",
    ctaLinks: [
      { href: "/ai-detector", label: "Open AI Detector" },
      { href: "/ai-note", label: "Organize your sources with AI Note" },
    ],
  },
  {
    slug: "ai-detector-false-positives",
    title: "Can AI Detectors Produce False Positives?",
    description:
      "Yes—human writing can be flagged as AI-generated. Why false positives happen, who is most affected, and what to do if your own work is flagged.",
    category: "AI Detection",
    date: PUBLISHED,
    relatedToolUrl: "/ai-detector",
    seoTitle: "AI Detector False Positives: Why They Happen & What to Do | AIWoven",
    seoDescription:
      "AI detectors can flag human writing as AI. Learn why false positives happen, who is most at risk, and the practical steps to take if your work is flagged.",
    primaryKeyword: "AI detector false positive",
    tags: ["ai-detection", "false-positives", "academic-integrity"],
    intro:
      "Yes. Every AI detector can label genuinely human writing as AI-generated—this is called a <strong>false positive</strong>. Even a small false-positive rate adds up quickly when thousands of assignments are checked, and the cost of an error falls on the person wrongly flagged. This guide explains why false positives happen, which kinds of writing are most exposed, and what to do—calmly and concretely—if your own work is flagged.",
    keyTakeaways: [
      "False positives are a built-in property of statistical detectors, not a rare glitch.",
      "Formulaic genres, heavily edited text, short passages, and some non-native English writing are flagged more often.",
      "If you are flagged, your drafts, version history, notes, and ability to explain your work are your strongest evidence.",
      "Detector scores should start a conversation, not end one.",
    ],
    sections: [
      {
        heading: "Why human writing gets flagged",
        blocks: [
          {
            type: "p",
            html: "Most detectors work by estimating how predictable a piece of text is compared with what a language model would produce (see <a href='/blog/how-do-ai-detectors-work'>how AI detectors work</a>). Anything that makes human writing more predictable can push its score toward “AI.”",
          },
          {
            type: "ul",
            items: [
              "<strong>Formulaic genres.</strong> Lab methods, abstracts, definitions, and summaries follow tight conventions, so the “expected” next word is often the one a human chose too.",
              "<strong>Simpler vocabulary and sentence structure.</strong> Liang et al. (2023) found that several detectors misclassified a large share of TOEFL essays by non-native English writers as AI-generated.",
              "<strong>Heavy editing tools.</strong> Grammar and style tools smooth out the irregularities that statistical detectors associate with human writing.",
              "<strong>Short text.</strong> With fewer words, a handful of predictable sentences can dominate the score.",
              "<strong>Shared templates.</strong> Course rubrics, reused intros, or sentence starters taught in class can make many students’ writing look alike.",
            ],
          },
        ],
      },
      {
        heading: "Why “only 1%” still matters",
        blocks: [
          {
            type: "p",
            html: "When Vanderbilt University explained its decision to disable Turnitin’s AI detector in 2023, it did the arithmetic: the university had submitted about 75,000 papers to Turnitin in 2022, so even a 1% false-positive rate could mean roughly 750 papers incorrectly labeled. A rate that sounds small at the level of one paper becomes a large number of people at the level of an institution.",
          },
          {
            type: "example",
            title: "Worked example: base rates",
            lines: [
              "Class of 200 essays, all written by students without AI.",
              "Detector false-positive rate: 2%",
              "Expected wrongly flagged essays: 200 × 0.02 = 4",
              "",
              "Every one of those 4 flags is 100% wrong — and looks exactly like a “real” flag.",
            ],
          },
          {
            type: "p",
            html: "This is why a flag on its own cannot tell you whether a specific person used AI: in a group where nobody did, every flag is a false positive. A detector score is not proof of AI use.",
          },
        ],
      },
      {
        heading: "What to do if your work is flagged",
        blocks: [
          {
            type: "ol",
            items: [
              "<strong>Stay calm and ask for specifics.</strong> Ask which tool was used, what score it gave, and which passages were flagged. Ask what your course or institution’s policy says about how detector results are used.",
              "<strong>Gather your process evidence.</strong> Version history (Google Docs, Word, or Git), earlier drafts, outlines, research notes, browser history for sources, and annotated readings all show how the work developed.",
              "<strong>Offer to explain your work.</strong> Being able to walk through your argument, sources, and choices in conversation is persuasive evidence of authorship.",
              "<strong>Point to known limitations—respectfully.</strong> It is reasonable to note that detector developers and universities have acknowledged false positives. The sources at the end of this article are a good starting point.",
              "<strong>Follow the formal process if needed.</strong> If there is an appeal or review process, use it, and keep copies of everything you submit.",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Don’t try to “fix” a flag by running your work through a paraphraser",
            html: "Rewriting genuine work to dodge a detector can make it look less like your own voice and does nothing to show how you produced it. Your process evidence is far more useful.",
          },
        ],
      },
      {
        heading: "How to lower your risk before submitting",
        blocks: [
          {
            type: "ul",
            items: [
              "Write in a tool that keeps <strong>version history</strong>, and don’t paste the whole essay in at the end.",
              "Keep your <strong>notes and outlines</strong>. If you take lecture notes with <a href='/ai-note'>AI Note</a>, those notes are part of your record of how you learned the material.",
              "Add <strong>specific reasoning</strong>: your own examples, comparisons to class discussions, and clear citations. Generic summaries are both weaker writing and more likely to be flagged.",
              "If your course allows it, run a <a href='/ai-detector'>self-check</a> and use the highlighted passages as revision prompts—places where your writing could be more specific.",
            ],
          },
        ],
        toolLinks: [{ href: "/ai-detector", label: "Self-check a draft" }],
      },
      {
        heading: "Guidance for educators",
        blocks: [
          {
            type: "p",
            html: "If you use AI detection, treat it as one input in a broader conversation. Assessment design—drafts, in-class writing, oral explanations, and assignments tied to class-specific material—reduces reliance on detectors in the first place. Vanderbilt’s published guidance is a useful example of an institution explaining these trade-offs openly.",
          },
        ],
      },
    ],
    faqs: [
      {
        question: "How common are AI detector false positives?",
        answer: "It depends on the tool, the threshold, and the kind of writing. Published figures range widely, and false-positive rates measured on one type of text may not apply to another. Assume they are possible for any document.",
      },
      {
        question: "Can Grammarly or other editing tools cause an AI flag?",
        answer: "Heavy automated editing can make writing more uniform, which may raise some detectors’ scores. Light spelling and grammar fixes are less likely to matter, but there is no guarantee either way.",
      },
      {
        question: "Is a high AI score enough to prove misconduct?",
        answer: "No. A score is a statistical estimate. Decisions about academic integrity should rest on broader evidence, such as drafts, sources, and a conversation with the student.",
      },
    ],
    references: [refs.vanderbilt, refs.liang, refs.weberWulff, refs.openaiClassifier],
    ctaTitle: "Know where your draft stands",
    ctaDescription: "See which passages look generic to a detector and strengthen them with your own reasoning before you submit.",
    ctaLinks: [
      { href: "/ai-detector", label: "Open AI Detector" },
      { href: "/ai-note", label: "Keep organized lecture notes" },
    ],
  },
  {
    slug: "how-do-ai-detectors-work",
    title: "How Do AI Detectors Work?",
    description:
      "A plain-English explanation of the main ways AI text detectors work—trained classifiers, perplexity-based scoring, and watermarking—and why each can fail.",
    category: "AI Detection",
    date: PUBLISHED,
    relatedToolUrl: "/ai-detector",
    seoTitle: "How Do AI Detectors Work? Classifiers, Perplexity & Watermarks | AIWoven",
    seoDescription:
      "Learn how AI detectors estimate whether text was AI-generated: trained classifiers, perplexity and burstiness, and watermarking—plus why each method can fail.",
    primaryKeyword: "how do AI detectors work",
    tags: ["ai-detection", "how-it-works"],
    intro:
      "AI detectors do not “recognize” ChatGPT the way a person recognizes a friend’s handwriting. They measure statistical properties of text and compare them with patterns learned from examples of human and AI writing. Understanding the main approaches makes it much easier to see why detectors are useful in some situations and unreliable in others.",
    keyTakeaways: [
      "Most detectors are trained classifiers or statistical tests that measure how predictable text is.",
      "Predictable is not the same as AI-written—careful, formulaic, or simple human writing can also be predictable.",
      "Watermarking can be far more reliable, but only for text from models that embed a watermark, and edits can weaken it.",
      "Paraphrasing and mixed human–AI editing are the main reasons detection breaks down.",
    ],
    sections: [
      {
        heading: "The core idea: predictability",
        blocks: [
          {
            type: "p",
            html: "Language models generate text by repeatedly choosing likely next words. As a result, AI text tends to be statistically “smooth”: each word is a reasonable, high-probability choice. Human writing is usually a little less predictable—we use unusual words, vary sentence length, and make idiosyncratic choices.",
          },
          {
            type: "example",
            title: "Two ways to finish the same sentence",
            lines: [
              "Prompt:  “Photosynthesis is the process by which plants…”",
              "",
              "Highly predictable:  “…convert light energy into chemical energy.”",
              "Less predictable:    “…quietly bank sunlight as sugar, like a battery that never runs flat.”",
            ],
          },
          {
            type: "p",
            html: "Detectors turn this intuition into numbers. Two terms appear often: <strong>perplexity</strong> (roughly, how surprised a language model is by the text—lower means more predictable) and <strong>burstiness</strong> (how much predictability varies from sentence to sentence; human writing often mixes plain and surprising sentences). Notice the problem in the example above: the first, “predictable” sentence is also exactly what a careful human student might write in a biology answer.",
          },
        ],
      },
      {
        heading: "The three main detection methods",
        blocks: [
          {
            type: "table",
            caption: "How common AI detection approaches compare",
            headers: ["Method", "How it works", "Main weakness"],
            rows: [
              ["Trained classifier", "A model is trained on labeled examples of human and AI text and learns to tell them apart.", "Can fail on writing styles, topics, or AI models it wasn’t trained on."],
              ["Zero-shot statistical scoring", "Uses a language model to measure perplexity, burstiness, or similar signals without special training data.", "Formulaic or simple human writing can look “AI-like.”"],
              ["Watermarking", "The AI model subtly biases its word choices in a secret, detectable pattern when generating text.", "Only works for watermarked models; paraphrasing and edits can weaken it."],
            ],
          },
          {
            type: "p",
            html: "Watermarking deserves a special mention. Kirchenbauer et al. (2023) showed that a model can nudge its sampling toward a hidden set of “green” tokens so that the watermark can later be detected with a statistical test—without access to the model itself. But a watermark only exists if the company running the model chooses to embed it, so it cannot tell you anything about text produced by models that don’t.",
          },
        ],
      },
      {
        heading: "Why detectors fail",
        blocks: [
          {
            type: "ul",
            items: [
              "<strong>Paraphrasing.</strong> Sadasivan et al. (2023) showed that running AI text through paraphrasing models can substantially lower detection rates across several detector types, including watermark-based ones.",
              "<strong>Mixed authorship.</strong> A human-written essay polished by AI—or an AI draft heavily revised by a human—doesn’t fit neatly into either category.",
              "<strong>Distribution shift.</strong> New models write differently from the ones a detector was trained on, and detectors must be retrained to keep up.",
              "<strong>Writer differences.</strong> Liang et al. (2023) found popular detectors disproportionately flagged essays by non-native English writers, consistent with predictability-based scoring. See <a href='/blog/ai-detector-false-positives'>why false positives happen</a>.",
            ],
          },
        ],
      },
      {
        heading: "What a detector score actually tells you",
        blocks: [
          {
            type: "p",
            html: "A detector score summarizes how similar a text is to the AI writing the detector has learned about. It does not reveal which tool was used, how much of the text was AI-generated, or whether using AI broke any rule. Sentence-level scores are more informative than a single number, because they show <em>where</em> the signal comes from. Either way, a score is a reason to look closer, not proof of how a text was written.",
          },
          {
            type: "p",
            html: "That is how the <a href='/ai-detector'>AIWoven AI Detector</a> presents results: an overall breakdown into AI-generated, human-and-AI-refined, and human-written, with the passages that contributed most to the AI-like signal highlighted for review. For what these numbers mean in practice, see <a href='/blog/how-accurate-are-ai-detectors'>how accurate AI detectors are</a>.",
          },
        ],
        toolLinks: [{ href: "/ai-detector", label: "See a sentence-level report" }],
      },
    ],
    faqs: [
      {
        question: "What is perplexity in AI detection?",
        answer: "Perplexity measures how surprised a language model is by a piece of text. Lower perplexity means the text is more predictable, which some detectors treat as a sign of AI generation—though predictable human writing exists too.",
      },
      {
        question: "Can AI detectors identify which AI model wrote a text?",
        answer: "Generally no. Most detectors estimate whether text resembles AI writing; they are not designed to reliably attribute text to a specific model or tool.",
      },
      {
        question: "Do watermarks make AI detection reliable?",
        answer: "Watermarks can make detection much more reliable for text produced by a watermarking model, but only if the model provider embeds one, and edits or paraphrasing can weaken the signal.",
      },
    ],
    references: [refs.kirchenbauer, refs.sadasivan, refs.liang, refs.weberWulff],
    ctaTitle: "See the signal for yourself",
    ctaDescription: "Paste 80+ words of English text to get a breakdown and the passages behind it.",
    ctaLinks: [
      { href: "/ai-detector", label: "Open AI Detector" },
      { href: "/ai-humanizer", label: "Smooth stiff phrasing" },
    ],
  },
  {
    slug: "ai-detector-vs-plagiarism-checker",
    title: "AI Detector vs Plagiarism Checker: What’s the Difference?",
    description:
      "Plagiarism checkers look for matching sources; AI detectors estimate writing patterns. How they differ in method, evidence, and errors—and when to use each.",
    category: "AI Detection",
    date: PUBLISHED,
    relatedToolUrl: "/ai-detector",
    seoTitle: "AI Detector vs Plagiarism Checker: Key Differences Explained | AIWoven",
    seoDescription:
      "A plagiarism checker finds text that matches existing sources; an AI detector estimates whether writing resembles AI output. Compare how they work and when to use each.",
    primaryKeyword: "AI detector vs plagiarism checker",
    tags: ["ai-detection", "plagiarism", "academic-integrity"],
    intro:
      "They answer different questions. A <strong>plagiarism checker</strong> asks, “Does this text match something that already exists?” An <strong>AI detector</strong> asks, “Does this text look statistically like AI-generated writing?” Because the questions differ, so do the evidence they produce and the mistakes they make. Confusing the two is one of the most common sources of misunderstanding about academic integrity tools.",
    keyTakeaways: [
      "Plagiarism checkers compare your text against databases of existing sources and show the matches.",
      "AI detectors estimate how AI-like your writing is; there is no source document to point to.",
      "A plagiarism match can be inspected and verified; an AI score cannot be verified the same way.",
      "Original AI-generated text can pass a plagiarism check, and properly quoted human text can trigger one—so neither tool replaces the other.",
    ],
    sections: [
      {
        heading: "Side-by-side comparison",
        blocks: [
          {
            type: "table",
            caption: "Plagiarism checker vs AI detector",
            headers: ["", "Plagiarism checker", "AI detector"],
            rows: [
              ["Question answered", "Does this text match existing sources?", "Does this text resemble AI-generated writing?"],
              ["How it works", "Compares text against web pages, publications, and (often) previously submitted papers", "Measures statistical patterns such as predictability using trained models"],
              ["Typical output", "Similarity percentage plus links to matching sources", "Probability or percentage that text is AI-like, sometimes with highlighted sentences"],
              ["Can you verify the result?", "Yes—you can open the matched source and compare", "Not directly—there is no source document to check"],
              ["Common false alarms", "Properly quoted material, common phrases, bibliographies, shared templates", "Formulaic, simple, heavily edited, or short human writing"],
              ["What it misses", "Original AI-generated text, paraphrased or translated plagiarism", "Edited or paraphrased AI text; text from models it wasn’t trained on"],
            ],
          },
        ],
      },
      {
        heading: "Why a plagiarism match is stronger evidence",
        blocks: [
          {
            type: "p",
            html: "When a plagiarism checker reports a match, you can open both texts and see the overlap for yourself. The tool may still be wrong about whether the overlap is a problem—a correctly cited quotation is not plagiarism—but the underlying evidence is concrete and inspectable.",
          },
          {
            type: "p",
            html: "An AI detector cannot offer that. Its output is an estimate produced by a model, and the same text can receive different scores from different tools. That is why AI scores need far more caution: see <a href='/blog/ai-detector-false-positives'>why AI detectors produce false positives</a>.",
          },
        ],
      },
      {
        heading: "Similarity percentage is not a plagiarism verdict",
        blocks: [
          {
            type: "p",
            html: "A similarity score of 20% does not mean 20% of an essay was plagiarized. It means 20% of the text overlaps with something in the database—which might include your own quotations, references, standard terminology, or the assignment prompt. The person reviewing the report still has to decide whether each match is legitimate.",
          },
          {
            type: "callout",
            tone: "tip",
            title: "Before you submit",
            html: "Check that every quotation has quotation marks and a citation, and that paraphrases are genuinely in your own words <em>and</em> cited. Most “plagiarism” flags students worry about are citation problems that are easy to fix.",
          },
        ],
      },
      {
        heading: "When to use each tool",
        blocks: [
          {
            type: "ul",
            items: [
              "<strong>Use a plagiarism checker</strong> when you want to confirm that quotations and paraphrases are properly attributed, especially in research-heavy work. Your institution may provide one; AIWoven does not currently offer plagiarism checking.",
              "<strong>Use an AI detector</strong> as a self-review signal: the highlighted passages show where your writing reads as generic and could use more of your own analysis. AIWoven’s <a href='/ai-detector'>AI Detector</a> is built for this.",
              "<strong>Use neither as proof.</strong> Both tools need a human to interpret them in context, and AI detection in particular should never be the sole basis for a decision.",
            ],
          },
        ],
        toolLinks: [{ href: "/ai-detector", label: "Run an AI self-check" }],
      },
      {
        heading: "A simple pre-submission workflow",
        blocks: [
          {
            type: "ol",
            items: [
              "Finish your draft from your own outline and notes (if your notes came from lectures, <a href='/ai-note'>AI Note</a> can keep them organized).",
              "Check citations: every quote marked and cited, every paraphrase cited.",
              "If your course provides a plagiarism checker, review each match and fix attribution problems.",
              "Optionally run an AI self-check and strengthen any passages flagged as generic with specific examples and reasoning.",
              "Keep your drafts and version history in case questions come up later.",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        question: "Can a plagiarism checker detect ChatGPT?",
        answer: "Not reliably. AI-generated text is usually new text rather than copied text, so it may not match any source in a plagiarism database. Detecting AI-like writing requires a different kind of tool—with its own limitations.",
      },
      {
        question: "Is using AI the same as plagiarism?",
        answer: "Not necessarily. Whether AI use is allowed—and how it must be disclosed—depends on your course and institution’s policy. Check the policy for each assignment.",
      },
      {
        question: "Does AIWoven have a plagiarism checker?",
        answer: "No. AIWoven offers an AI Detector, which estimates how AI-like writing is. For source matching, use the plagiarism checker provided by your institution.",
      },
    ],
    references: [refs.weberWulff, refs.vanderbilt],
    ctaTitle: "Review your writing with a clear signal",
    ctaDescription: "Get an AI-likelihood breakdown with highlighted passages, then revise with your own reasoning.",
    ctaLinks: [
      { href: "/ai-detector", label: "Open AI Detector" },
      { href: "/ai-note", label: "Organize lecture notes" },
    ],
  },
];
