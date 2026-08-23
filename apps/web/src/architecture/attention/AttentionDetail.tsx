import { currentAttentionShapes } from "../../domain/shapes";
import type { ArchitectureNodeId } from "../catalog";
import { AttentionAnnotation } from "./AttentionAnnotation";
import { AttentionDiagram } from "./AttentionDiagram";
import "./attention.css";

export interface AttentionDetailProps {
  readonly layerCount: number;
  readonly headCount: number;
  readonly modelWidth: number;
  readonly traceSequenceLength: number | null;
  readonly selectedLayer: number;
  readonly selectedHead: number;
  readonly selectedNodeId: ArchitectureNodeId | null;
  readonly onNavigateRoot: () => void;
  readonly onBack: () => void;
  readonly onSelectLayer: (layer: number) => void;
  readonly onSelectHead: (head: number) => void;
  readonly onSelectNode: (id: ArchitectureNodeId) => void;
}

function indexes(count: number): number[] {
  const values: number[] = [];
  for (let value = 0; value < count; value += 1) values.push(value);
  return values;
}

function Selector({
  label,
  count,
  selected,
  onSelect,
}: {
  readonly label: "Layer" | "Head";
  readonly count: number;
  readonly selected: number;
  readonly onSelect: (index: number) => void;
}) {
  return (
    <fieldset
      className={`architecture-layer-selector ${label === "Head" ? "architecture-head-selector" : ""}`}
    >
      <legend>{label}</legend>
      <div>
        {indexes(count).map((index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            className={index === selected ? "selected" : undefined}
            aria-label={`${label} ${index}`}
            aria-pressed={index === selected}
            data-layer-index={label === "Layer" ? index : undefined}
            data-head-index={label === "Head" ? index : undefined}
            onClick={() => onSelect(index)}
          >
            {index}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function AttentionDetail(props: AttentionDetailProps) {
  const shapes = currentAttentionShapes(
    { modelWidth: props.modelWidth, headCount: props.headCount },
    props.traceSequenceLength,
  );
  if (shapes === null || props.layerCount <= 0) {
    return (
      <p className="architecture-error" role="alert">
        Self-Attention shape을 구성할 수 없는 model config입니다.
      </p>
    );
  }
  return (
    <section
      className="architecture-attention-screen"
      aria-labelledby="architecture-title"
    >
      <nav
        className="architecture-breadcrumb"
        aria-label="Architecture navigation"
      >
        <ol>
          <li>
            <button
              type="button"
              data-testid="architecture-breadcrumb-gpt"
              onClick={props.onNavigateRoot}
            >
              GPT
            </button>
          </li>
          <li>
            <span aria-hidden="true">›</span>
            <button
              type="button"
              data-testid="architecture-breadcrumb-block"
              onClick={props.onBack}
            >
              Transformer Block × {props.layerCount}
            </button>
          </li>
          <li className="architecture-breadcrumb-current">
            <span aria-hidden="true">›</span>
            <span
              data-testid="architecture-breadcrumb-attention"
              aria-current="page"
            >
              Self-Attention
            </span>
          </li>
        </ol>
      </nav>
      <div className="architecture-intro">
        <div>
          <h2 id="architecture-title" tabIndex={-1}>
            Self-Attention
          </h2>
          <p>
            combined QKV projection부터 c_proj output까지 causal attention의
            실제 연산 순서입니다.
          </p>
        </div>
        <button
          type="button"
          className="architecture-back-button"
          data-testid="architecture-back-block"
          onClick={props.onBack}
        >
          ← Transformer Block
        </button>
      </div>
      <section
        className="architecture-detail architecture-attention-detail"
        data-testid="attention-detail"
        data-selected-layer={props.selectedLayer}
        data-selected-head={props.selectedHead}
        aria-labelledby="architecture-title"
      >
        <div className="architecture-detail-toolbar architecture-attention-toolbar">
          <div>
            <p className="architecture-detail-kicker">
              Causal Multi-Head Self-Attention
            </p>
            <p>
              하나의 combined QKV projection에서 head별 score와 value output을
              계산합니다.
            </p>
          </div>
          <div className="architecture-attention-selectors">
            <Selector
              label="Layer"
              count={props.layerCount}
              selected={props.selectedLayer}
              onSelect={props.onSelectLayer}
            />
            <Selector
              label="Head"
              count={props.headCount}
              selected={props.selectedHead}
              onSelect={props.onSelectHead}
            />
          </div>
        </div>
        <div className="architecture-visual-grid architecture-attention-grid">
          <AttentionDiagram
            selectedNodeId={props.selectedNodeId}
            onSelectNode={props.onSelectNode}
          />
          <AttentionAnnotation
            shapes={shapes}
            selectedLayer={props.selectedLayer}
            selectedHead={props.selectedHead}
            selectedNodeId={props.selectedNodeId}
          />
        </div>
      </section>
    </section>
  );
}
