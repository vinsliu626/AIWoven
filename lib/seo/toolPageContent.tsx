import Link from "next/link";

import type { SeoContentSection } from "@/components/seo/SeoContent";

export type ToolSeoContent = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  seoTitle: string;
  sections: SeoContentSection[];
};

export const toolPageContent: Record<"detector" | "note" | "study" | "humanizer" | "converter", ToolSeoContent> = {
  detector: {
    heroEyebrow: "AI Detector",
    heroTitle: "AI Detector for Student Writing, Draft Reviews, and Risk Checks",
    heroSubtitle:
      "Paste text, review suspicious passages, and check whether writing sounds overly machine-like before you submit or publish it.",
    seoTitle: "AI Detector Guide",
    sections: [
      {
        heading: "What is AI Detector?",
        content: (
          <>
            <p>
              An AI detector is a tool that reviews writing patterns and estimates whether a passage looks machine-generated. The
              keyword here is pattern, not proof. Good detectors do not claim mind-reading accuracy. They help you find sections
              that deserve another look because the rhythm, phrasing, or consistency feels too synthetic.
            </p>
            <p>
              That matters for students because modern writing workflows are messy. A paper might start with class notes from{" "}
              <Link href="/ai-note">AI Note</Link>, move into concept review with <Link href="/ai-study">AI Study</Link>, and
              later become a final submission. Somewhere in that chain, the voice can become too polished or generic. AI Detector
              gives you a checkpoint before that becomes someone else&apos;s concern.
            </p>
          </>
        ),
      },
      {
        heading: "How does it work?",
        content: (
          <>
            <p>
              The detector looks at sentence predictability, phrasing repetition, flow uniformity, and other surface signals that
              commonly appear in generated text. Instead of reducing a draft to one magic verdict, the more useful workflow is
              sentence-level review. You want to know where the suspicious language is, not just whether a score looks high.
            </p>
            <p>
              In practice, that means the tool helps you inspect the exact sections that need editing. A result can then feed into{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link> if the tone is too stiff, or back into your study source if the
              problem started earlier. If supporting files come from screenshots or document exports, <Link href="/converter">Converter</Link>{" "}
              helps clean up the raw inputs before you even reach the writing stage.
            </p>
          </>
        ),
      },
      {
        heading: "How to use it (step-by-step)",
        content: (
          <>
            <ol>
              <li>Paste your draft, paragraph, or suspicious excerpt into the detector.</li>
              <li>Run the check and focus on the highlighted passages rather than only the overall score.</li>
              <li>Read those lines out loud and compare them to your class notes or outline.</li>
              <li>Rewrite vague or overly smooth sections in your own words.</li>
              <li>If the tone still feels synthetic, refine it in <Link href="/ai-humanizer">AI Humanizer</Link>.</li>
            </ol>
            <p>
              Students usually get the best results when they use the detector late in the process, after building cleaner inputs
              in <Link href="/ai-note">AI Note</Link> and improving understanding with <Link href="/ai-study">AI Study</Link>.
              Detection works better as an editing step than as a first draft strategy.
            </p>
          </>
        ),
      },
      {
        heading: "Key benefits",
        content: (
          <>
            <ul>
              <li>Fast review before assignment submission or publication.</li>
              <li>Sentence-level visibility into the passages that actually need work.</li>
              <li>Useful for self-checking, not just for policing other writers.</li>
              <li>Pairs well with note, study, rewrite, and file-prep workflows.</li>
            </ul>
            <p>
              The real advantage is clarity. Instead of worrying abstractly about whether a draft &quot;looks AI,&quot; you can
              see which passages need sharper examples, more variation, or a less templated tone.
            </p>
          </>
        ),
      },
      {
        heading: "Limitations",
        content: (
          <>
            <p>
              No AI detector is perfect. Formal student writing, carefully edited prose, or highly repetitive technical language
              can trigger false positives. That means you should never treat detector output as a final judgment on authorship or
              honesty.
            </p>
            <p>
              The smarter mindset is to treat detection as review support. If a passage gets flagged, revise it if the language is
              genuinely weak. If the writing is sound and grounded in your own work, use the signal as a prompt to double-check,
              not to panic.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases (students, developers, etc.)",
        content: (
          <>
            <p>
              Students use AI Detector before submitting essays, scholarship drafts, and discussion posts. Tutors and teachers can
              use it to identify passages that deserve closer reading, especially when style drifts sharply from the rest of a
              paper. Developers and content teams can also use it as a QA pass when generated copy needs to sound less robotic.
            </p>
            <p>
              In all of those cases, the best results come from combining tools: gather source material in{" "}
              <Link href="/ai-note">AI Note</Link>, build understanding in <Link href="/ai-study">AI Study</Link>, inspect the
              draft here, humanize awkward sections, and keep file handling simple with <Link href="/converter">Converter</Link>.
            </p>
          </>
        ),
      },
      {
        heading: "FAQ",
        content: (
          <>
            <h3>Can an AI detector prove that text is AI-generated?</h3>
            <p>No. It can flag patterns and probabilities, but it should not be treated as absolute proof.</p>
            <h3>Should students use AI Detector on their own drafts?</h3>
            <p>Yes. That is one of the best use cases because it helps catch stiff wording before submission.</p>
            <h3>What should I do if a section gets flagged?</h3>
            <p>Compare it to your source notes, add more specific detail, and rewrite it in a more natural voice.</p>
            <h3>When should I use AI Humanizer after the detector?</h3>
            <p>Use it when the meaning is right but the wording is still too smooth, generic, or obviously generated.</p>
          </>
        ),
      },
    ],
  },
  note: {
    heroEyebrow: "AI Note",
    heroTitle: "AI Note Generator for Lectures, Readings, and Fast Study Prep",
    heroSubtitle:
      "Upload audio, paste source text, or work from transcripts to turn raw material into structured notes you can actually review.",
    seoTitle: "AI Note Generator Guide",
    sections: [
      {
        heading: "What is AI Note?",
        content: (
          <>
            <p>
              An AI note generator helps convert lectures, transcripts, recordings, and source text into more structured notes.
              For students, that usually means less cleanup after class and a faster path to studying. Instead of manually
              reorganizing messy material, you can start with a cleaner summary, outline, or concept list.
            </p>
            <p>
              The important distinction is that good notes are not just shorter text. They should make the material easier to scan,
              compare, and revisit. That is why <Link href="/ai-note">AI Note</Link> is most useful when your source is rough or
              incomplete, not when the material is already perfectly formatted.
            </p>
          </>
        ),
      },
      {
        heading: "How does it work?",
        content: (
          <>
            <p>
              The tool accepts audio, recordings, transcripts, or pasted text and then restructures the content into clearer notes.
              It can separate main points from supporting examples, remove filler, and produce a cleaner study base. That base can
              then move into <Link href="/ai-study">AI Study</Link> if you want flashcards, quiz prompts, or revision outputs.
            </p>
            <p>
              In a broader workflow, the note stage sits near the beginning. If you later transform note content into written
              answers, <Link href="/ai-detector">AI Detector</Link> can help you spot robotic phrasing, while{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link> can make the final language sound more natural. If class materials
              arrive as files that need reformatting, <Link href="/converter">Converter</Link> keeps that part simple too.
            </p>
          </>
        ),
      },
      {
        heading: "How to use it (step-by-step)",
        content: (
          <>
            <ol>
              <li>Start with one real input: a lecture recording, transcript, article, or rough class note set.</li>
              <li>Generate structured notes with headings, key terms, and examples.</li>
              <li>Compare the output to your slides or syllabus to confirm the emphasis is right.</li>
              <li>Trim or regenerate anything that feels too vague or too broad.</li>
              <li>Move the strongest sections into <Link href="/ai-study">AI Study</Link> for active recall later.</li>
            </ol>
            <p>
              This keeps the tool grounded in real student use. You are not asking AI to replace understanding. You are using it
              to remove repetitive formatting work so you can focus on comprehension and review.
            </p>
          </>
        ),
      },
      {
        heading: "Key benefits",
        content: (
          <>
            <ul>
              <li>Speeds up note cleanup after long lectures or dense readings.</li>
              <li>Creates more consistent structure across classes and sources.</li>
              <li>Reduces manual rewriting when your inputs are messy.</li>
              <li>Feeds directly into study and writing-review workflows.</li>
            </ul>
            <p>
              The biggest benefit is momentum. Once the notes are clear, the rest of the workflow becomes easier to trust and much
              faster to continue.
            </p>
          </>
        ),
      },
      {
        heading: "Limitations",
        content: (
          <>
            <p>
              AI notes are only as useful as the review step that follows them. A polished note set can create false confidence if
              you never verify or actively study it. The tool may also miss nuance if the lecture wandered or if the reading had
              unclear priorities.
            </p>
            <p>
              That means you still need to compare results to the original material. Clean notes are helpful. Perfectly reliable
              notes do not exist without human judgment.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases (students, developers, etc.)",
        content: (
          <>
            <p>
              Students use AI Note for lecture recordings, reading-heavy courses, seminar transcripts, and revision sheets.
              Researchers can use it to compress source material before outlining. Teams can use it to turn meetings or interviews
              into structured follow-up notes before turning action items into more formal documentation.
            </p>
            <p>
              In each case, the long-term value comes from chaining the workflow: organize content here, study it in{" "}
              <Link href="/ai-study">AI Study</Link>, inspect submitted writing with <Link href="/ai-detector">AI Detector</Link>,
              humanize the final tone, and use <Link href="/converter">Converter</Link> when the source files are inconvenient.
            </p>
          </>
        ),
      },
      {
        heading: "FAQ",
        content: (
          <>
            <h3>Is AI Note best for recordings or text?</h3>
            <p>Both, but it is especially useful when the original material is long, repetitive, or poorly organized.</p>
            <h3>Should I trust AI notes without checking them?</h3>
            <p>No. Review them against your slides, reading, or syllabus before relying on them for exams.</p>
            <h3>What should I do after generating notes?</h3>
            <p>Turn the strongest sections into questions, flashcards, or review prompts in AI Study.</p>
            <h3>Can I reuse AI notes in writing?</h3>
            <p>Yes, but review the tone first. AI Detector and AI Humanizer help prevent generic final wording.</p>
          </>
        ),
      },
    ],
  },
  study: {
    heroEyebrow: "AI Study",
    heroTitle: "AI Study Tool for Flashcards, Quizzes, and Faster Revision",
    heroSubtitle:
      "Upload documents, extract the core ideas, and turn them into revision-ready notes, flashcards, and quiz sets without leaving the workspace.",
    seoTitle: "AI Study Tool Guide",
    sections: [
      {
        heading: "What is AI Study?",
        content: (
          <>
            <p>
              An AI study tool helps students turn source material into active review assets instead of leaving everything as
              passive notes. That distinction matters. Clean information alone does not guarantee recall. Students usually remember
              more when they work from flashcards, self-test prompts, and comparison questions than when they only reread summaries.
            </p>
            <p>
              <Link href="/ai-study">AI Study</Link> is designed around that second step. It takes cleaned input from your own
              files or from earlier note work and turns it into materials you can actually revise from on a deadline.
            </p>
          </>
        ),
      },
      {
        heading: "How does it work?",
        content: (
          <>
            <p>
              The tool accepts documents such as PDFs, DOCX files, and slide decks, extracts the important content, and lets you
              generate outputs like notes, flashcards, and quizzes. That means you do not have to manually build study sets every
              time a class gives you another packet or presentation.
            </p>
            <p>
              The best results usually come when the source material is already organized. Many students first clean raw lecture
              material in <Link href="/ai-note">AI Note</Link>, then use this page for retrieval-focused review. If the final
              answers later become written assignments, <Link href="/ai-detector">AI Detector</Link> and{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link> keep the tone from sounding too generic. If source files need cleanup
              first, <Link href="/converter">Converter</Link> helps there too.
            </p>
          </>
        ),
      },
      {
        heading: "How to use it (step-by-step)",
        content: (
          <>
            <ol>
              <li>Upload a document or bring in cleaned content from your earlier notes.</li>
              <li>Select the study outputs you actually need, such as notes, flashcards, or quizzes.</li>
              <li>Generate one focused set rather than every possible format at once.</li>
              <li>Answer the questions without looking to test weak spots honestly.</li>
              <li>Only revisit the concepts you missed instead of rereading everything.</li>
            </ol>
            <p>
              This is where the tool moves beyond summarization. It is not just producing text. It is helping you reach the part
              of studying that improves recall.
            </p>
          </>
        ),
      },
      {
        heading: "Key benefits",
        content: (
          <>
            <ul>
              <li>Turns long documents into usable revision material much faster than manual prep.</li>
              <li>Supports active recall instead of passive rereading.</li>
              <li>Works well for exam cram sessions and structured weekly review.</li>
              <li>Pairs naturally with note cleanup and writing review tools.</li>
            </ul>
            <p>
              The major benefit is leverage. You spend less time formatting study resources and more time actually testing your
              memory.
            </p>
          </>
        ),
      },
      {
        heading: "Limitations",
        content: (
          <>
            <p>
              AI Study does not replace learning discipline. If you generate too many outputs and never use them, the workflow
              becomes busy rather than effective. The tool also depends on the quality of the source material. Weak inputs still
              require review.
            </p>
            <p>
              Students get the most value when they keep the scope tight: one chapter, one lecture, one problem set, then test,
              revise, and move on.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases (students, developers, etc.)",
        content: (
          <>
            <p>
              Students use AI Study for midterm review, weekly reading checks, language memorization, and fast conversion of slide
              decks into flashcards. Tutors can use it to create guided practice sets. Training teams and documentation owners can
              also use the same structure for internal learning materials when they need lightweight knowledge checks.
            </p>
            <p>
              When that workflow starts with better notes in <Link href="/ai-note">AI Note</Link> and ends with cleaner
              explanation quality in <Link href="/ai-detector">AI Detector</Link> or{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link>, the result is much more reliable than depending on one tool alone.
            </p>
          </>
        ),
      },
      {
        heading: "FAQ",
        content: (
          <>
            <h3>Is AI Study better than reading notes?</h3>
            <p>It is better for recall because it helps you retrieve information instead of just recognizing it.</p>
            <h3>What files work best?</h3>
            <p>Clean PDFs, DOCX files, and slide decks usually work well, especially when the source is already organized.</p>
            <h3>Should I use AI Note before AI Study?</h3>
            <p>Often yes. Cleaner source notes usually lead to stronger flashcards and better quiz outputs.</p>
            <h3>Can I use the results in assignments?</h3>
            <p>Yes, but review the tone before submitting. AI Detector and AI Humanizer help with that final step.</p>
          </>
        ),
      },
    ],
  },
  humanizer: {
    heroEyebrow: "AI Humanizer",
    heroTitle: "AI Humanizer for Smoother, More Natural Student Writing",
    heroSubtitle:
      "Paste stiff or overly polished text, keep the meaning intact, and make the final wording sound more like a real person wrote it.",
    seoTitle: "AI Humanizer Guide",
    sections: [
      {
        heading: "What is AI Humanizer?",
        content: (
          <>
            <p>
              An AI humanizer is a rewrite tool designed to improve robotic wording without changing the core meaning. Students
              usually need this when a paragraph is technically correct but still sounds overly smooth, generic, or obviously
              machine-assisted.
            </p>
            <p>
              The point is not disguise. The point is clarity. <Link href="/ai-humanizer">AI Humanizer</Link> is most useful when
              the idea is already yours but the phrasing has become stiff through rushed drafting, copied note language, or too
              much generic AI output.
            </p>
          </>
        ),
      },
      {
        heading: "How does it work?",
        content: (
          <>
            <p>
              The tool rewrites tone, rhythm, and structure while trying to keep the original meaning stable. That usually means
              reducing repetitive transitions, adding more natural sentence variation, and smoothing sections that feel too formal
              or templated.
            </p>
            <p>
              It works best at the end of a workflow that already has decent source material. If the paragraph was built from weak
              notes, start in <Link href="/ai-note">AI Note</Link>. If the topic is still shaky, review it in{" "}
              <Link href="/ai-study">AI Study</Link>. Then inspect suspicious sections in <Link href="/ai-detector">AI Detector</Link>{" "}
              before using the humanizer. If your files need prep first, <Link href="/converter">Converter</Link> belongs upstream
              in the process.
            </p>
          </>
        ),
      },
      {
        heading: "How to use it (step-by-step)",
        content: (
          <>
            <ol>
              <li>Paste the paragraph or draft section that sounds too stiff.</li>
              <li>Review whether the meaning is already correct before rewriting.</li>
              <li>Run the humanizer and compare the new version to the original.</li>
              <li>Read the result aloud to make sure the flow feels natural.</li>
              <li>Use AI Detector afterward if you want one more quality pass.</li>
            </ol>
            <p>
              Students get better results by revising selected sections rather than running an entire paper through the tool
              blindly. Target the parts that feel too polished or too flat, not everything at once.
            </p>
          </>
        ),
      },
      {
        heading: "Key benefits",
        content: (
          <>
            <ul>
              <li>Improves tone and readability without requiring a full redraft.</li>
              <li>Helps note-based writing sound less copied from a generic summary.</li>
              <li>Useful for reflections, discussion posts, essays, and statements.</li>
              <li>Fits well into a broader workflow with detector and study tools.</li>
            </ul>
            <p>
              The biggest benefit is control. You keep the core idea while fixing the wording that makes the draft feel less like
              you.
            </p>
          </>
        ),
      },
      {
        heading: "Limitations",
        content: (
          <>
            <p>
              Humanizing does not fix weak reasoning. If the paragraph is generic because the underlying idea is shallow, better
              phrasing will only go so far. It also should not be used as a substitute for understanding or as a way to cover
              borrowed arguments.
            </p>
            <p>
              The strongest drafts still come from better notes, stronger study habits, and honest revision before the rewrite
              layer is added.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases (students, developers, etc.)",
        content: (
          <>
            <p>
              Students use AI Humanizer for scholarship essays, personal reflections, lab responses, and discussion posts that
              sound too generic after an AI-assisted first pass. Editors and content teams can use it to reduce templated language
              in generated copy. Product teams can also use it to make internal drafts sound less robotic before review.
            </p>
            <p>
              In all those cases, the rewrite works better when it follows stronger source prep in{" "}
              <Link href="/ai-note">AI Note</Link>, better understanding from <Link href="/ai-study">AI Study</Link>, and a final
              pass from <Link href="/ai-detector">AI Detector</Link>. If the supporting material needs conversion first,{" "}
              <Link href="/converter">Converter</Link> keeps the setup clean.
            </p>
          </>
        ),
      },
      {
        heading: "FAQ",
        content: (
          <>
            <h3>Will AI Humanizer change my meaning?</h3>
            <p>It should preserve the core meaning, but you should still review important passages manually.</p>
            <h3>When should I use it?</h3>
            <p>Use it after the ideas are correct but the wording still sounds stiff, flat, or too machine-like.</p>
            <h3>Should I humanize an entire essay at once?</h3>
            <p>Usually no. Target the sections that actually need tone repair.</p>
            <h3>What tool should I use before this one?</h3>
            <p>AI Note and AI Study usually strengthen the source material, while AI Detector helps identify which lines need revision.</p>
          </>
        ),
      },
    ],
  },
  converter: {
    heroEyebrow: "Converter",
    heroTitle: "File Converter for PDFs, Images, Audio, and Quick Format Changes",
    heroSubtitle:
      "Convert common files without leaving the NexusDesk workspace, then keep moving through notes, study prep, or writing review.",
    seoTitle: "File Converter Guide",
    sections: [
      {
        heading: "What is Converter?",
        content: (
          <>
            <p>
              A file converter solves one of the least glamorous but most common workflow problems: the format you have is not the
              format you need. Students run into this with PDFs, image files, audio exports, and assignment uploads all the time.
              A clean converter keeps that small problem from becoming a deadline problem.
            </p>
            <p>
              In NexusDesk, <Link href="/converter">Converter</Link> sits next to the content tools for a reason. A format change
              is rarely the final goal. It is usually the step that lets you move on to notes, studying, or writing.
            </p>
          </>
        ),
      },
      {
        heading: "How does it work?",
        content: (
          <>
            <p>
              You choose a source format, pick a compatible target format, upload the file, and run the conversion directly in the
              workspace. The value is speed and convenience. You are not leaving the product ecosystem just to solve a routine file
              task.
            </p>
            <p>
              That matters because converted files often feed the next step. A PDF may become notes in <Link href="/ai-note">AI Note</Link>.
              A document may become revision material in <Link href="/ai-study">AI Study</Link>. A converted excerpt may later be
              described in writing that you inspect with <Link href="/ai-detector">AI Detector</Link> and smooth in{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link>.
            </p>
          </>
        ),
      },
      {
        heading: "How to use it (step-by-step)",
        content: (
          <>
            <ol>
              <li>Select the source format and the target format you need.</li>
              <li>Upload the file and confirm the pair is supported.</li>
              <li>Run the conversion and preview the result if needed.</li>
              <li>Download the output and check readability, especially for images or slides.</li>
              <li>Move the converted content into notes, study, or writing tools if that is your next step.</li>
            </ol>
            <p>
              This keeps the converter in its proper role. It solves the format problem quickly so you can continue working instead
              of context-switching across random utility sites.
            </p>
          </>
        ),
      },
      {
        heading: "Key benefits",
        content: (
          <>
            <ul>
              <li>Fast file-format changes without another app or download step.</li>
              <li>Useful for assignment uploads, slide prep, screenshots, and document handling.</li>
              <li>Keeps file tasks inside the same workspace as your other academic tools.</li>
              <li>Reduces last-minute friction right before deadlines.</li>
            </ul>
            <p>
              The benefit is not glamour. It is momentum. You solve the format issue and keep the rest of the workflow moving.
            </p>
          </>
        ),
      },
      {
        heading: "Limitations",
        content: (
          <>
            <p>
              Conversion does not improve the substance of the content. A blurry or badly formatted source file may still produce a
              mediocre result. Students should also verify readability after conversion, especially when small text or diagrams are
              involved.
            </p>
            <p>
              It is also not a study tool by itself. Once the file is usable, you still need to decide whether the next step is
              note cleanup, revision, or writing review.
            </p>
          </>
        ),
      },
      {
        heading: "Use cases (students, developers, etc.)",
        content: (
          <>
            <p>
              Students use Converter for turning PDFs into images, preparing files for LMS uploads, extracting usable assets from
              lecture materials, and standardizing class documents. Developers and operations teams can use it for quick asset
              normalization when they need lightweight browser-side conversion instead of opening heavier desktop tools.
            </p>
            <p>
              The value increases when the next step stays nearby. Convert the file here, build notes in{" "}
              <Link href="/ai-note">AI Note</Link>, generate review material in <Link href="/ai-study">AI Study</Link>, and clean
              up any related text with <Link href="/ai-detector">AI Detector</Link> and{" "}
              <Link href="/ai-humanizer">AI Humanizer</Link>.
            </p>
          </>
        ),
      },
      {
        heading: "FAQ",
        content: (
          <>
            <h3>When should I use Converter instead of another tool?</h3>
            <p>Use it whenever the main problem is file format, not content quality or study structure.</p>
            <h3>Can converted files feed into other NexusDesk tools?</h3>
            <p>Yes. Converted content often becomes the source for AI Note or AI Study next.</p>
            <h3>Will conversion fix a bad source file?</h3>
            <p>No. It changes the format, but poor readability or low resolution can still carry over.</p>
            <h3>Why keep conversion in the same workspace?</h3>
            <p>Because students usually need the file for another task immediately after converting it.</p>
          </>
        ),
      },
    ],
  },
};

