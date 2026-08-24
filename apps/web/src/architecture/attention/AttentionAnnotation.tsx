import type { ReactNode } from "react";

import { symbolicShape } from "../../domain/notation";
import type { CurrentAttentionShapes } from "../../domain/shapes";
import type { FormulaId, RuntimeFormulaId } from "../../math/formulaCatalog";
import { MathFormula } from "../../math/MathFormula";
import { shapeFormula } from "../../math/trustedFormulaBuilders";
import {
  decoderAttentionGuide,
  decoderAttentionGuideCopy,
  decoderAttentionOperationIds,
} from "../../tracks/decoder-only-fundamentals/guide";
import { decoderOnlyFundamentalsProfile } from "../../tracks/decoder-only-fundamentals/profile";
import type { ArchitectureNodeId } from "../catalog";

export interface AttentionAnnotationProps {
  readonly shapes: CurrentAttentionShapes;
  readonly selectedLayer: number;
  readonly selectedHead: number;
  readonly selectedNodeId: ArchitectureNodeId | null;
}

const formulas = decoderOnlyFundamentalsProfile.notation.formulas;
const notationEntries = decoderOnlyFundamentalsProfile.notation.entries;

class AttentionGuideError extends Error {
  constructor(readonly symbol: string) {
    super(`Missing attention symbol formula: ${symbol}`);
    this.name = "AttentionGuideError";
  }
}

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
  if (formulaId === undefined) throw new AttentionGuideError(symbol);
  return <MathFormula formula={formulas[formulaId]} />;
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
    selectedNodeId !== null &&
    decoderAttentionOperationIds.some(
      (operationId) => operationId === selectedNodeId,
    )
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
        <strong>{decoderAttentionGuideCopy.flowTitle}</strong>
        {flowIds.map((flowId) => (
          <MathFormula key={flowId} formula={formulas[flowId]} />
        ))}
        <span>{decoderAttentionGuideCopy.summaryLabel}</span>
        <MathFormula formula={formulas["attention-summary"]} />
      </div>
    );
  }

  const notation = notationEntries[id];
  const currentShape = shapes.currentShape(id);
  return (
    <div
      className="architecture-attention-operation"
      data-testid="attention-operation-copy"
    >
      <strong>{notation.title}</strong>
      <MathFormula formula={formulas[id]} className="katex" />
      <p>{notation.description}</p>
      <span>{decoderAttentionGuideCopy.symbolicShape}</span>
      <MathFormula
        formula={shapeFormula(
          "attention-symbolic-shape",
          symbolicShape(notation),
          `${notation.title} symbolic shape`,
        )}
        className="architecture-symbolic-shape"
      />
      <span>{decoderAttentionGuideCopy.currentShape}</span>
      {currentShape === null ? (
        <span className="architecture-actual-shape">
          {decoderAttentionGuideCopy.pending}
        </span>
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
            <MathFormula formula={formulas["attention-mask-keep"]} />
            <span>: {decoderAttentionGuideCopy.scoreKept}</span>
          </span>
          <span>
            <MathFormula formula={formulas["attention-mask-block"]} />
            <span>: {decoderAttentionGuideCopy.blocked}</span>
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
  const pending = decoderAttentionGuideCopy.pending;
  return (
    <aside
      className="architecture-annotation architecture-attention-annotation"
      data-guide-page-id={decoderAttentionGuide.id}
    >
      <h3>{decoderAttentionGuide.title}</h3>
      <p className="architecture-attention-input-definition">
        <MathFormula formula={formulas["attention-input-definition"]} />
        <span>{decoderAttentionGuideCopy.inputExplanation}</span>
      </p>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-symbols-title"
      >
        <h4 id="attention-symbols-title">
          {decoderAttentionGuideCopy.symbolsTitle}
        </h4>
        <dl className="architecture-attention-symbols">
          {decoderOnlyFundamentalsProfile.notation.symbols.map(
            ({ symbol, meaning }) => (
              <div key={symbol}>
                <dt>
                  <SymbolFormula symbol={symbol} />
                </dt>
                <dd>{meaning}</dd>
              </div>
            ),
          )}
        </dl>
      </section>
      <section
        className="architecture-notation-section"
        aria-labelledby="attention-current-title"
      >
        <h4 id="attention-current-title">
          {decoderAttentionGuideCopy.currentModelTitle}
        </h4>
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
            label={<MathFormula formula={formulas["attention-scale-factor"]} />}
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
        <h4 id="attention-operation-title">
          {decoderAttentionGuideCopy.currentOperationTitle}
        </h4>
        <OperationDetail shapes={shapes} selectedNodeId={selectedNodeId} />
      </section>
    </aside>
  );
}
