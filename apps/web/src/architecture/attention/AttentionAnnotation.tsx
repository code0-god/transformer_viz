import {
  ATTENTION_SYMBOLS,
  notationCatalog,
  symbolicShape,
} from "../../domain/notation";
import type { CurrentAttentionShapes } from "../../domain/shapes";
import { formulaCatalog } from "../../math/formulaCatalog";
import { MathFormula } from "../../math/MathFormula";
import type { ArchitectureNodeId } from "../catalog";

export interface AttentionAnnotationProps {
  readonly shapes: CurrentAttentionShapes;
  readonly selectedLayer: number;
  readonly selectedHead: number;
  readonly selectedNodeId: ArchitectureNodeId | null;
}

const attentionOperationIds: readonly ArchitectureNodeId[] = [
  "attention-qkv-projection",
  "attention-query",
  "attention-key",
  "attention-value",
  "attention-scores",
  "attention-scale",
  "attention-causal-mask",
  "attention-softmax",
  "attention-value-aggregation",
  "attention-merge-heads",
  "attention-output-projection",
];

function Fact({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function OperationDetail({
  shapes,
  selectedNodeId,
}: Pick<AttentionAnnotationProps, "shapes" | "selectedNodeId">) {
  const id =
    selectedNodeId !== null && attentionOperationIds.includes(selectedNodeId)
      ? selectedNodeId
      : null;
  if (id === null) {
    const flowIds: readonly ArchitectureNodeId[] = [
      "attention-scores",
      "attention-scale",
      "attention-causal-mask",
      "attention-softmax",
      "attention-value-aggregation",
    ];
    return (
      <div className="architecture-attention-operation architecture-attention-flow-formulas">
        <strong>Self-Attention flow</strong>
        {flowIds.map((flowId) => (
          <MathFormula key={flowId} formula={formulaCatalog[flowId]} />
        ))}
        <span>한 줄 요약</span>
        <MathFormula formula={formulaCatalog["attention-summary"]} />
      </div>
    );
  }

  const notation = notationCatalog[id];
  const currentShape = shapes.currentShape(id) ?? "실행 후 표시";
  return (
    <div
      className="architecture-attention-operation"
      data-testid="attention-operation-copy"
    >
      <strong>{notation.title}</strong>
      <MathFormula formula={formulaCatalog[id]} className="katex" />
      <p>{notation.description}</p>
      <span>Symbolic shape</span>
      <code>{symbolicShape(notation)}</code>
      <span>Current shape</span>
      <code className="architecture-actual-shape">{currentShape}</code>
      {id === "attention-causal-mask" ? (
        <div className="architecture-mask-conditions">
          <code>j ≤ i: score 유지</code>
          <code>j &gt; i: 차단</code>
        </div>
      ) : null}
    </div>
  );
}

export function AttentionAnnotation({
  shapes,
  selectedLayer,
  selectedHead,
  selectedNodeId,
}: AttentionAnnotationProps) {
  const pending = "실행 후 표시";
  return (
    <aside className="architecture-annotation architecture-attention-annotation">
      <h3>Self-Attention</h3>
      <p className="architecture-attention-input-definition">
        X는 선택한 Transformer Block의 LayerNorm 1 출력 X_LN1입니다.
      </p>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-symbols-title"
      >
        <h4 id="attention-symbols-title">A. 기호</h4>
        <dl className="architecture-attention-symbols">
          {ATTENTION_SYMBOLS.map(({ symbol, meaning }) => (
            <div key={symbol}>
              <dt>{symbol}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-current-title"
      >
        <h4 id="attention-current-title">B. 현재 모델값</h4>
        <dl className="architecture-attention-facts" aria-label="현재 모델값">
          <Fact label="Layer" value={String(selectedLayer)} />
          <Fact label="Head" value={String(selectedHead)} />
          <Fact
            label="T"
            value={
              shapes.sequenceLength === null
                ? "—"
                : String(shapes.sequenceLength)
            }
          />
          <Fact label="C" value={String(shapes.modelWidth)} />
          <Fact label="H" value={String(shapes.headCount)} />
          <Fact label="D" value={String(shapes.headDimension)} />
          <Fact label="1 / √D" value={String(shapes.scaleFactor)} />
          <Fact label="Q / K / V" value={shapes.headTensor ?? pending} />
          <Fact
            label="Full Q / K / V"
            value={shapes.fullHeadTensor ?? pending}
          />
        </dl>
      </section>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-operation-title"
      >
        <h4 id="attention-operation-title">C. 현재 연산</h4>
        <OperationDetail shapes={shapes} selectedNodeId={selectedNodeId} />
      </section>
    </aside>
  );
}
