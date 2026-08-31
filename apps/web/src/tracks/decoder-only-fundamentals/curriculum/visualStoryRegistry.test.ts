import { decoderGuideCatalog } from "../guide";
import { decoderCurriculum, decoderCurriculumRegistries } from "./catalog";
import { curriculumLearningFigures } from "./learningFigureRegistry";

const CURRICULUM_SCENE_IDS = [
  "decoder.diagram.tokenization.token",
  "decoder.diagram.tokenization.vocabulary",
  "decoder.diagram.tokenization.methods",
  "decoder.diagram.language-model.definition",
  "decoder.diagram.language-model.next-token",
  "decoder.diagram.language-model.conditional-probability",
  "decoder.diagram.language-model.autoregressive",
  "decoder.diagram.representation.embedding",
  "decoder.diagram.representation.position",
  "decoder.diagram.representation.hidden-state",
] as const;

describe("fourteen-Chapter visual story registry", () => {
  test("owns one canonical Figure per Chapter", () => {
    const chapters = decoderCurriculum.parts.flatMap((part) => part.chapters);

    expect(chapters).toHaveLength(14);
    expect(decoderCurriculumRegistries.figureIds.size).toBe(14);
    expect(decoderCurriculumRegistries.figureOwners.size).toBe(14);
  });

  test("maps Golden NLP to DOM and later Figures to scene contracts", () => {
    expect(
      curriculumLearningFigures.metadata("decoder.diagram.intro.nlp"),
    ).toEqual({
      preferredWidth: 960,
      renderer: "static",
    });
    for (const figureId of CURRICULUM_SCENE_IDS) {
      expect(curriculumLearningFigures.metadata(figureId)).toMatchObject({
        fallbackFigureId: expect.stringContaining(".static"),
        loadingStrategy: "visible",
        reducedMotion: "static-final-state",
        renderer: "scene",
      });
    }
  });

  test("registers GPT Block and Attention as architecture scenes", () => {
    expect(decoderGuideCatalog.figureIds).toEqual([
      "root",
      "transformer-block",
      "self-attention",
    ]);
  });
});
