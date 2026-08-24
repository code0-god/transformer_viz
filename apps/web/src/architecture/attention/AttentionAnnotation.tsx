import type { ReactNode } from "react";

import {
  ATTENTION_SYMBOLS,
  notationCatalog,
  symbolicShape,
} from "../../domain/notation";
import type { CurrentAttentionShapes } from "../../domain/shapes";
import {
  type FormulaId,
  formulaCatalog,
  type RuntimeFormulaId,
} from "../../math/formulaCatalog";
import { MathFormula } from "../../math/MathFormula";
import { shapeFormula } from "../../math/trustedFormulaBuilders";
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
  readonly label: ReactNode;
  readonly value: ReactNode;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const attentionSymbolFormulaIds: Readonly<Record<string, FormulaId>> = {
  T: "attention-symbol-sequence-length",
  C: "attention-symbol-model-width",
  H: "attention-symbol-head-count",
  D: "attention-symbol-head-dimension",
  h: "attention-symbol-head-index",
  i: "attention-symbol-query-index",
  j: "attention-symbol-key-index",
  X: "attention-symbol-input",
  "Q / K / V": "attention-symbol-qkv",
  S_h: "attention-symbol-scores",
  A_h: "attention-symbol-probabilities",
  Y_h: "attention-symbol-head-output",
};

function SymbolFormula({ symbol }: Readonly<{ symbol: string }>) {
  const formulaId = attentionSymbolFormulaIds[symbol];
  if (formulaId === undefined)
    throw new Error(`Missing attention symbol formula: ${symbol}`);
  return <MathFormula formula={formulaCatalog[formulaId]} />;
}

function ShapeValue({
  id,
  value,
  pending,
}: Readonly<{
  id: Extract<
    RuntimeFormulaId,
    "attention-head-shape" | "attention-full-head-shape"
  >;
  value: string | null;
  pending: string;
}>) {
  return value === null ? (
    pending
  ) : (
    <MathFormula formula={shapeFormula(id, value, "Current tensor shape")} />
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
  const currentShape = shapes.currentShape(id);
  return (
    <div
      className="architecture-attention-operation"
      data-testid="attention-operation-copy"
    >
      <strong>{notation.title}</strong>
      <MathFormula formula={formulaCatalog[id]} className="katex" />
      <p>{notation.description}</p>
      <span>Symbolic shape</span>
      <MathFormula
        formula={shapeFormula(
          "attention-symbolic-shape",
          symbolicShape(notation),
          `${notation.title} symbolic shape`,
        )}
        className="architecture-symbolic-shape"
      />
      <span>Current shape</span>
      {currentShape === null ? (
        <span className="architecture-actual-shape">실행 후 표시</span>
      ) : (
        <MathFormula
          formula={shapeFormula(
            "attention-current-shape",
            currentShape,
            `${notation.title} current shape`,
          )}
          className="architecture-actual-shape"
        />
      )}
      {id === "attention-causal-mask" ? (
        <div className="architecture-mask-conditions">
          <span>
            <MathFormula formula={formulaCatalog["attention-mask-keep"]} />
            <span>: score 유지</span>
          </span>
          <span>
            <MathFormula formula={formulaCatalog["attention-mask-block"]} />
            <span>: 차단</span>
          </span>
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
        <MathFormula formula={formulaCatalog["attention-input-definition"]} />
        <span>는 선택한 Transformer Block의 LayerNorm 1 출력입니다.</span>
      </p>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-symbols-title"
      >
        <h4 id="attention-symbols-title">A. 기호</h4>
        <dl className="architecture-attention-symbols">
          {ATTENTION_SYMBOLS.map(({ symbol, meaning }) => (
            <div key={symbol}>
              <dt>
                <SymbolFormula symbol={symbol} />
              </dt>
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
            label={<SymbolFormula symbol="T" />}
            value={
              shapes.sequenceLength === null
                ? "—"
                : String(shapes.sequenceLength)
            }
          />
          <Fact
            label={<SymbolFormula symbol="C" />}
            value={String(shapes.modelWidth)}
          />
          <Fact
            label={<SymbolFormula symbol="H" />}
            value={String(shapes.headCount)}
          />
          <Fact
            label={<SymbolFormula symbol="D" />}
            value={String(shapes.headDimension)}
          />
          <Fact
            label={
              <MathFormula formula={formulaCatalog["attention-scale-factor"]} />
            }
            value={String(shapes.scaleFactor)}
          />
          <Fact
            label={<SymbolFormula symbol="Q / K / V" />}
            value={
              <ShapeValue
                id="attention-head-shape"
                value={shapes.headTensor}
                pending={pending}
              />
            }
          />
          <Fact
            label={
              <span className="architecture-full-qkv-label">
                <span>Full</span>
                <SymbolFormula symbol="Q / K / V" />
              </span>
            }
            value={
              <ShapeValue
                id="attention-full-head-shape"
                value={shapes.fullHeadTensor}
                pending={pending}
              />
            }
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
