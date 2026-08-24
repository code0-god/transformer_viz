import { formulaCatalog } from "../../math/formulaCatalog";
import { MathFormula } from "../../math/MathFormula";
import type { ArchitectureNodeId } from "../catalog";
import { AttentionConnectors } from "./AttentionConnectors";
import { OperationNode, SplitHeadsNode, StateNode } from "./AttentionNodes";
import { ATTENTION_HEIGHT, ATTENTION_WIDTH, geometry } from "./geometry";

export interface AttentionDiagramProps {
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly onSelectNode: (id: ArchitectureNodeId) => void;
}

const operations = [
  [
    "attention-qkv-projection",
    "architecture-attention-projection",
    geometry.qkv,
  ],
  ["attention-query", "architecture-attention-query", geometry.query],
  ["attention-key", "architecture-attention-key", geometry.key],
  ["attention-value", "architecture-attention-value", geometry.value],
  ["attention-scores", "architecture-attention-score", geometry.scores],
  ["attention-scale", "architecture-attention-scale", geometry.scale],
  ["attention-causal-mask", "architecture-attention-mask", geometry.mask],
  ["attention-softmax", "architecture-attention-softmax", geometry.softmax],
  [
    "attention-value-aggregation",
    "architecture-attention-aggregation",
    geometry.aggregation,
  ],
  ["attention-merge-heads", "architecture-attention-merge", geometry.merge],
  [
    "attention-output-projection",
    "architecture-attention-projection",
    geometry.projection,
  ],
] satisfies readonly (readonly [
  ArchitectureNodeId,
  string,
  Omit<import("../ArchitectureNode").NodeBounds, "radius">,
])[];

export function AttentionDiagram({
  selectedNodeId,
  onSelectNode,
}: AttentionDiagramProps) {
  return (
    <figure className="architecture-figure architecture-detail-figure architecture-attention-figure">
      <section
        className="architecture-svg-scroll architecture-attention-scroll"
        aria-label="Scrollable Self-Attention architecture diagram"
      >
        <svg
          className="architecture-diagram architecture-attention-diagram"
          viewBox={`0 0 ${ATTENTION_WIDTH} ${ATTENTION_HEIGHT}`}
          role="img"
          aria-labelledby="attention-detail-svg-title attention-detail-svg-desc"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="attention-detail-svg-title">
            Causal Multi-Head Self-Attention architecture
          </title>
          <desc id="attention-detail-svg-desc">
            LN1 output enters one combined QKV projection. Query and Key form
            scaled, causally masked probabilities. Value joins only at
            aggregation. Head outputs merge and pass through output projection
            to Attention Output.
          </desc>
          <defs>
            <marker
              id="attention-detail-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
              overflow="visible"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          <StateNode
            bounds={geometry.input}
            title="Attention Input X"
            formulaId="attention-input-state"
          />
          {operations.slice(0, 4).map(([id, className, bounds]) => (
            <OperationNode
              key={id}
              id={id}
              className={className}
              bounds={bounds}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
          <SplitHeadsNode
            bounds={geometry.querySplit}
            formulaId="attention-query-heads"
          />
          <SplitHeadsNode
            bounds={geometry.keySplit}
            formulaId="attention-key-heads"
          />
          <SplitHeadsNode
            bounds={geometry.valueSplit}
            formulaId="attention-value-heads"
          />
          {operations.slice(4, 9).map(([id, className, bounds]) => (
            <OperationNode
              key={id}
              id={id}
              className={className}
              bounds={bounds}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
          <StateNode
            bounds={geometry.headOutputs}
            title="Head Outputs"
            formulaId="attention-head-outputs"
          />
          {operations.slice(9).map(([id, className, bounds]) => (
            <OperationNode
              key={id}
              id={id}
              className={className}
              bounds={bounds}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
          <StateNode
            bounds={geometry.output}
            title="Attention Output"
            formulaId="attention-output-state"
          />
          <AttentionConnectors />
        </svg>
      </section>
      <figcaption className="architecture-math-caption">
        <MathFormula formula={formulaCatalog["attention-value-edge"]} />
        <span>
          는 score 계산에 참여하지 않고, Softmax 이후 Value MatMul에서
        </span>
        <MathFormula
          formula={formulaCatalog["attention-symbol-probabilities"]}
        />
        <span>와 결합합니다.</span>
      </figcaption>
    </figure>
  );
}
