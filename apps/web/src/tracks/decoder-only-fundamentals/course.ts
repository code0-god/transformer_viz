import type { LearningCourseOverview } from "../types";
import { decoderCurriculum } from "./curriculum/catalog";

const chapters = decoderCurriculum.parts.flatMap((part) =>
  part.chapters.map((chapter) => ({
    id: chapter.id,
    slug: chapter.id.replace("decoder.chapter.", "").replaceAll(".", "-"),
    title: chapter.title,
  })),
);

export const decoderOnlyFundamentalsCourse: LearningCourseOverview = {
  title: "Decoder-only Transformer 기초",
  modelLabel: "nanoGPT Educational Model",
  summary: "텍스트부터 Self-Attention까지 단계적으로 살펴봅니다.",
  journey: [
    "텍스트",
    "토큰",
    "언어 모델",
    "Embedding",
    "GPT",
    "Transformer Block",
    "Self-Attention",
  ],
  initialChapterId: "decoder.chapter.0.1",
  chapters,
};
