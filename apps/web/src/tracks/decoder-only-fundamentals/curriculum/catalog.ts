import { FORMULA_IDS, formulaCatalog } from "../../../math/formulaCatalog";
import { SCORE_MATRIX_VISUALIZATION_ID } from "../../visualization/visualizationRegistry";
import { decoderNodeMap } from "../nodes";
import { part0Glossary } from "./content/part0/glossary";
import { part1Glossary } from "./content/part1/glossary";
import { part2Glossary } from "./content/part2/glossary";
import type {
  CurriculumRendererRegistry,
  RenderableCurriculum,
} from "./curriculumRendererRegistry";
import {
  curriculumDiagramComponent,
  curriculumDiagramIds,
  curriculumVisualizationIds,
} from "./diagramRegistry";
import { curriculumGuidePage, curriculumGuidePages } from "./guidePages";
import { CHAPTER_IDS, GUIDE_PAGE_IDS, PART_IDS } from "./ids";
import { curriculumLearningFigures } from "./learningFigureRegistry";
import { curriculumReferences } from "./references";
import { guideRuntimeFacts } from "./runtimeFacts";
import type {
  ChapterId,
  ConceptId,
  DiagramId,
  GuidePageId,
  LearningChapter,
  LearningPart,
  PartId,
  ReferenceId,
  VisualizationId,
} from "./types";
import type { CurriculumRegistries } from "./validation";

const PART_SPECS = [
  { id: PART_IDS[0], title: "Part 0 자연어 처리와 Token" },
  { id: PART_IDS[1], title: "Part 1 언어 모델과 다음 Token 예측" },
  { id: PART_IDS[2], title: "Part 2 숫자 표현과 Hidden State" },
  { id: PART_IDS[3], title: "Part 3 GPT" },
  { id: PART_IDS[4], title: "Part 4 Transformer Block" },
  { id: PART_IDS[5], title: "Part 5 Self-Attention" },
] as const;

type ChapterSpec = {
  readonly id: ChapterId;
  readonly partId: PartId;
  readonly order: number;
  readonly title: string;
  readonly conceptId: ConceptId;
  readonly conceptTitle: string;
  readonly pageId?: GuidePageId;
  readonly guideSectionIds?: readonly string[];
  readonly incumbentSectionId?: string;
  readonly diagramId: DiagramId;
  readonly visualizationId?: VisualizationId;
  readonly nodeId: string;
  readonly references: readonly ReferenceId[];
};

// allow: SIZE_OK — fixed 14-chapter curriculum data table
const CHAPTER_SPECS = [
  {
    id: CHAPTER_IDS[0],
    partId: PART_IDS[0],
    order: 0,
    title: "자연어 처리란?",
    conceptId: "decoder.intro.nlp",
    conceptTitle: "자연어 처리",
    pageId: GUIDE_PAGE_IDS[0],
    guideSectionIds: ["everyday-question"],
    diagramId: "decoder.diagram.intro.nlp",
    nodeId: "decoder.root.input-context",
    references: [
      "ref.tistory.21",
      "ref.repo.generation",
      "ref.transformer-paper",
    ],
  },
  {
    id: CHAPTER_IDS[1],
    partId: PART_IDS[0],
    order: 1,
    title: "Token이란?",
    conceptId: "decoder.tokenization.token",
    conceptTitle: "Token",
    pageId: GUIDE_PAGE_IDS[1],
    guideSectionIds: ["token-unit", "token-id-bridge"],
    diagramId: "decoder.diagram.tokenization.token",
    nodeId: "decoder.root.input-context",
    references: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
  {
    id: CHAPTER_IDS[2],
    partId: PART_IDS[0],
    order: 2,
    title: "Vocabulary와 Token ID",
    conceptId: "decoder.tokenization.vocabulary",
    conceptTitle: "Vocabulary와 Token ID",
    pageId: GUIDE_PAGE_IDS[2],
    diagramId: "decoder.diagram.tokenization.vocabulary",
    nodeId: "decoder.root.token-embedding",
    references: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
  {
    id: CHAPTER_IDS[3],
    partId: PART_IDS[0],
    order: 3,
    title: "Tokenization 방식",
    conceptId: "decoder.tokenization.methods",
    conceptTitle: "Tokenization 방식",
    pageId: GUIDE_PAGE_IDS[3],
    guideSectionIds: [
      "word",
      "character",
      "subword",
      "byte",
      "trade-off",
      "current-nanogpt",
    ],
    diagramId: "decoder.diagram.tokenization.methods",
    nodeId: "decoder.root.input-context",
    references: ["ref.tistory.22", "ref.repo.tokenizer", "ref.rfc3629"],
  },
  {
    id: CHAPTER_IDS[4],
    partId: PART_IDS[1],
    order: 0,
    title: "언어 모델이란?",
    conceptId: "decoder.language-model.definition",
    conceptTitle: "언어 모델",
    pageId: GUIDE_PAGE_IDS[4],
    diagramId: "decoder.diagram.language-model.definition",
    nodeId: "decoder.root.logits",
    references: ["ref.tistory.21", "ref.repo.model", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[5],
    partId: PART_IDS[1],
    order: 1,
    title: "다음 Token 예측",
    conceptId: "decoder.language-model.next-token",
    conceptTitle: "다음 Token 예측",
    pageId: GUIDE_PAGE_IDS[5],
    diagramId: "decoder.diagram.language-model.next-token",
    nodeId: "decoder.root.token-selection",
    references: ["ref.tistory.21", "ref.repo.schema", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[6],
    partId: PART_IDS[1],
    order: 2,
    title: "조건부 확률",
    conceptId: "decoder.language-model.conditional-probability",
    conceptTitle: "조건부 확률",
    pageId: GUIDE_PAGE_IDS[6],
    diagramId: "decoder.diagram.language-model.conditional-probability",
    nodeId: "decoder.root.logits",
    references: ["ref.tistory.21", "ref.repo.model", "ref.transformer-paper"],
  },
  {
    id: CHAPTER_IDS[7],
    partId: PART_IDS[1],
    order: 3,
    title: "Autoregressive Generation",
    conceptId: "decoder.language-model.autoregressive",
    conceptTitle: "Autoregressive Generation",
    pageId: GUIDE_PAGE_IDS[7],
    diagramId: "decoder.diagram.language-model.autoregressive",
    nodeId: "decoder.root.append-context",
    references: ["ref.tistory.21", "ref.repo.generation", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[8],
    partId: PART_IDS[2],
    order: 0,
    title: "Token Embedding",
    conceptId: "decoder.representation.embedding",
    conceptTitle: "Token Embedding",
    pageId: GUIDE_PAGE_IDS[8],
    diagramId: "decoder.diagram.representation.embedding",
    nodeId: "decoder.root.token-embedding",
    references: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[9],
    partId: PART_IDS[2],
    order: 1,
    title: "Position Embedding",
    conceptId: "decoder.representation.position",
    conceptTitle: "Position Embedding",
    pageId: GUIDE_PAGE_IDS[9],
    diagramId: "decoder.diagram.representation.position",
    nodeId: "decoder.root.position-embedding",
    references: ["ref.tistory.23", "ref.repo.model", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[10],
    partId: PART_IDS[2],
    order: 2,
    title: "Hidden State",
    conceptId: "decoder.representation.hidden-state",
    conceptTitle: "Hidden State",
    pageId: GUIDE_PAGE_IDS[10],
    diagramId: "decoder.diagram.representation.hidden-state",
    nodeId: "decoder.root.hidden-state",
    references: ["ref.tistory.24", "ref.repo.layers", "ref.nanogpt-pinned"],
  },
  {
    id: CHAPTER_IDS[11],
    partId: PART_IDS[3],
    order: 0,
    title: "GPT",
    conceptId: "decoder.architecture.gpt",
    conceptTitle: "GPT",
    incumbentSectionId: "root-generation-overview",
    diagramId: "root",
    nodeId: "decoder.root.architecture",
    references: [
      "ref.repo.model",
      "ref.transformer-paper",
      "ref.nanogpt-pinned",
    ],
  },
  {
    id: CHAPTER_IDS[12],
    partId: PART_IDS[4],
    order: 0,
    title: "Transformer Block",
    conceptId: "decoder.architecture.block",
    conceptTitle: "Transformer Block",
    incumbentSectionId: "block-overview",
    diagramId: "transformer-block",
    nodeId: "decoder.root.transformer-block",
    references: [
      "ref.repo.layers",
      "ref.transformer-paper",
      "ref.nanogpt-pinned",
    ],
  },
  {
    id: CHAPTER_IDS[13],
    partId: PART_IDS[5],
    order: 0,
    title: "Self-Attention",
    conceptId: "decoder.attention.self",
    conceptTitle: "Self-Attention",
    incumbentSectionId: "qkv",
    diagramId: "self-attention",
    visualizationId: SCORE_MATRIX_VISUALIZATION_ID,
    nodeId: "decoder.block.self-attention",
    references: [
      "ref.repo.layers",
      "ref.transformer-paper",
      "ref.nanogpt-pinned",
    ],
  },
] as const satisfies readonly ChapterSpec[];

function chapterFromSpec(spec: ChapterSpec): LearningChapter {
  const conceptBase = {
    id: spec.conceptId,
    chapterId: spec.id,
    title: spec.conceptTitle,
    guideSectionIds:
      spec.guideSectionIds ??
      (spec.pageId === undefined
        ? spec.incumbentSectionId === undefined
          ? []
          : [spec.incumbentSectionId]
        : [`${spec.pageId}.section`]),
    relatedNodeIds: [spec.nodeId],
    diagramId: spec.diagramId,
    ...(spec.visualizationId === undefined
      ? { visualizationCtaCount: 0 }
      : {
          visualizationId: spec.visualizationId,
          visualizationCtaCount: 1,
        }),
    referenceIds: spec.references,
  };
  return {
    id: spec.id,
    partId: spec.partId,
    order: spec.order,
    title: spec.title,
    concepts: [
      spec.pageId === undefined
        ? conceptBase
        : { ...conceptBase, guidePageId: spec.pageId },
    ],
  };
}

const parts: readonly LearningPart[] = PART_SPECS.map(
  ({ id, title }, order) => ({
    id,
    order,
    title,
    chapters: CHAPTER_SPECS.filter((spec) => spec.partId === id).map(
      chapterFromSpec,
    ),
  }),
);

const curriculumGlossary = [
  ...part0Glossary,
  ...part1Glossary,
  ...part2Glossary,
] as const;

const rendererRegistry = {
  resolveGuidePage: curriculumGuidePage,
  resolveDiagram: curriculumDiagramComponent,
  glossary: curriculumGlossary,
  formulas: formulaCatalog,
  runtimeFacts: guideRuntimeFacts,
  figures: curriculumLearningFigures,
} satisfies CurriculumRendererRegistry;

export const decoderCurriculum = {
  parts,
  guidePages: curriculumGuidePages,
  rendererRegistry,
} satisfies RenderableCurriculum;

export const decoderCurriculumRegistries: CurriculumRegistries = {
  diagramIds: new Set([
    ...curriculumDiagramIds,
    "root",
    "transformer-block",
    "self-attention",
  ]),
  figureIds: new Set(CHAPTER_SPECS.map(({ diagramId }) => diagramId)),
  figureOwners: new Map(
    CHAPTER_SPECS.map(({ id, diagramId }) => [diagramId, id]),
  ),
  visualizationIds: curriculumVisualizationIds,
  nodeIds: new Set(Object.keys(decoderNodeMap)),
  formulaIds: new Set(FORMULA_IDS),
  termIds: new Set(curriculumGlossary.map(({ id }) => id)),
  references: curriculumReferences,
};
