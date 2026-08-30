import { render, screen, within } from "@testing-library/react";
import { createElement } from "react";

import { formulaCatalog } from "../../math/formulaCatalog";
import { LearningGuide } from "../LearningGuide";
import type { LearningFigureRegistry } from "../learningFigureTypes";
import type { SelectedOperationPresentation } from "../types";
import { validateLearningProfile } from "../validation";
import { attentionGuide, attentionGuideGlossary } from "./attentionGuide";
import { decoderOnlyFundamentalsProfile } from "./profile";

const outlineIds = [
  "qkv",
  "heads",
  "score",
  "scale",
  "mask",
  "softmax",
  "value",
  "merge",
] as const;

const glossaryIds = [
  "query",
  "key",
  "value",
  "head",
  "score",
  "causal-mask",
  "softmax",
  "attention-weight",
  "weighted-sum",
] as const;

const attentionNodeIds = [
  "decoder.attention.qkv-projection",
  "decoder.attention.query",
  "decoder.attention.key",
  "decoder.attention.value",
  "decoder.attention.score-matmul",
  "decoder.attention.scale",
  "decoder.attention.causal-mask",
  "decoder.attention.softmax",
  "decoder.attention.value-matmul",
  "decoder.attention.merge-heads",
  "decoder.attention.output-projection",
] as const;

const selectedOperation: SelectedOperationPresentation = {
  id: "decoder.operation.attention-softmax",
  title: "Softmax",
  summary: "",
  formulaIds: ["attention-softmax"],
  facts: [],
};
const figures: LearningFigureRegistry = {
  figureIds: new Set(["self-attention"]),
  metadata: () => ({ preferredWidth: 1000, renderer: "static" }),
  preferredWidth: () => 1000,
  render: () =>
    createElement(
      "svg",
      { "aria-label": "Attention Figure", role: "img", viewBox: "0 0 1 1" },
      createElement("title", null, "Attention Figure"),
    ),
};

describe("decoder Attention learning guide", () => {
  test("exposes the terminal outline and glossary contracts", () => {
    // Given: the standalone Attention guide and glossary.
    const availableGlossaryIds = new Set(
      attentionGuideGlossary.map(({ id }) => id),
    );

    // When: route structure and glossary references are read.
    const sectionIds = attentionGuide.sections.map(({ id }) => id);

    // Then: stable machine IDs preserve the required order and terminal state.
    expect(sectionIds).toEqual(outlineIds);
    expect(attentionGuide.outlineSectionIds).toEqual(outlineIds);
    expect(attentionGuide.glossary).toEqual(glossaryIds);
    expect(glossaryIds.every((id) => availableGlossaryIds.has(id))).toBe(true);
    expect(attentionGuide.nextStep).toBeUndefined();
  });

  test("validates as a standalone terminal page", () => {
    // Given: the current profile contracts with only the Attention page replaced.
    const profile = {
      ...decoderOnlyFundamentalsProfile,
      guide: {
        ...decoderOnlyFundamentalsProfile.guide,
        pages: {
          ...decoderOnlyFundamentalsProfile.guide.pages,
          "decoder.self-attention": attentionGuide,
        },
      },
    };

    // When: profile validation scans references and route mappings.
    const issues = validateLearningProfile(profile);

    // Then: the standalone page satisfies all machine-consumed invariants.
    expect(issues).toEqual([]);
  });

  test("maps every Attention node exactly once", () => {
    // Given: every primary and associated mapping on the Attention page.
    const mappedNodeIds = attentionGuide.sections.flatMap(
      ({ associatedNodeIds = [] }) => associatedNodeIds,
    );

    // When: mapping multiplicity is counted.
    const mappingCounts = new Map<string, number>();
    for (const nodeId of mappedNodeIds) {
      mappingCounts.set(nodeId, (mappingCounts.get(nodeId) ?? 0) + 1);
    }

    // Then: all eleven route nodes occur once and every primary is associated.
    expect([...mappingCounts.keys()].sort()).toEqual(
      [...attentionNodeIds].sort(),
    );
    expect([...mappingCounts.values()]).toEqual(attentionNodeIds.map(() => 1));
    for (const section of attentionGuide.sections) {
      if (section.primaryNodeId === undefined) continue;
      expect(section.associatedNodeIds).toContain(section.primaryNodeId);
    }
  });

  test("places formulas after explanatory blocks and the full formula last", () => {
    // Given: ordered blocks in every Attention section.
    const sections = attentionGuide.sections;

    // When: formula positions are inspected.
    const formulaPositions = sections.flatMap((section) =>
      section.blocks.flatMap((block, index) =>
        block.kind === "formula"
          ? [{ sectionId: section.id, formulaId: block.formulaId, index }]
          : [],
      ),
    );

    const narrative = attentionGuide.introduction.find(
      (block) => block.kind === "visual-narrative",
    );
    const narrativeStages = new Set(
      narrative?.kind === "visual-narrative"
        ? narrative.beats.map(({ stage }) => stage)
        : [],
    );

    // Then: local prose or the preceding narrative explains every formula.
    expect(
      formulaPositions.every(
        ({ index, sectionId }) =>
          index > 0 ||
          (sectionId === "scale" && narrativeStages.has("scores")) ||
          (sectionId === "merge" && narrativeStages.has("value")),
      ),
    ).toBe(true);
    const finalSection = sections.at(-1);
    expect(finalSection).toBeDefined();
    expect(formulaPositions.at(-1)).toEqual({
      sectionId: "merge",
      formulaId: "attention-summary",
      index: (finalSection?.blocks.length ?? 0) - 1,
    });
  });

  test("renders the selected operation only in its matching section", () => {
    // Given: Softmax is the route-visible selected node.
    const { container } = render(
      createElement(LearningGuide, {
        page: attentionGuide,
        glossary: attentionGuideGlossary,
        formulas: formulaCatalog,
        figures,
        selectedNodeId: "decoder.attention.softmax",
        selectedOperations: {
          "decoder.runtime.selected-operation": selectedOperation,
        },
      }),
    );

    // When: dynamic operation output is located.
    const softmaxSection = screen.getByRole("region", {
      name: "Score를 Weight로 바꾸기",
    });
    const operation = within(softmaxSection).getByText(selectedOperation.title);

    // Then: the output is nested only under the mapped section.
    expect(operation).toBeInTheDocument();
    expect(
      screen.getAllByText(selectedOperation.title, {
        selector: "[data-operation-presentation-id] > strong",
      }),
    ).toHaveLength(1);
    expect(container.getElementsByClassName("katex-error")).toHaveLength(0);
  });
});
