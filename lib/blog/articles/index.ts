import type { BlogPost } from "../types";

import { aiDetectionArticles } from "./ai-detection";
import { lectureNotesArticles } from "./lecture-notes";
import { studySkillsArticles } from "./study-skills";

export const articles: BlogPost[] = [...aiDetectionArticles, ...lectureNotesArticles, ...studySkillsArticles];
