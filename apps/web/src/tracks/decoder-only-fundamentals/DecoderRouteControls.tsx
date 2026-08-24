import type { ReactElement } from "react";

import { repeatedBlockLabel } from "../../domain/notation";
import type { ArchitectureRenderContext } from "../types";

type DecoderRouteControlsProps = {
  readonly context: ArchitectureRenderContext;
  readonly navigateRoot: () => void;
  readonly navigateBlock: () => void;
  readonly selectLayer: (layer: number) => void;
  readonly selectHead: (head: number) => void;
};

function indexes(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => index);
}

function Selector({
  label,
  count,
  selected,
  onSelect,
}: Readonly<{
  label: "Layer" | "Head";
  count: number;
  selected: number;
  onSelect: (index: number) => void;
}>): ReactElement {
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

export function DecoderRouteControls({
  context,
  navigateRoot,
  navigateBlock,
  selectLayer,
  selectHead,
}: DecoderRouteControlsProps): ReactElement {
  const blockLabel = repeatedBlockLabel(context.model.config.n_layer);
  const selectors = (
    <div className="architecture-attention-selectors">
      <Selector
        label="Layer"
        count={context.model.config.n_layer}
        selected={context.state.selectedLayer}
        onSelect={selectLayer}
      />
      {context.state.view !== "self-attention" ? null : (
        <Selector
          label="Head"
          count={context.model.config.n_head}
          selected={context.state.selectedHead}
          onSelect={selectHead}
        />
      )}
    </div>
  );

  switch (context.state.view) {
    case "root":
      return (
        <nav
          className="architecture-breadcrumb"
          aria-label="Architecture navigation"
        >
          <ol>
            <li>
              <span
                data-testid="architecture-breadcrumb-gpt"
                aria-current="page"
              >
                GPT
              </span>
            </li>
          </ol>
        </nav>
      );
    case "transformer-block":
      return (
        <div className="learning-route-actions">
          <nav
            className="architecture-breadcrumb"
            aria-label="Architecture navigation"
          >
            <ol>
              <li>
                <button
                  type="button"
                  data-testid="architecture-breadcrumb-gpt"
                  onClick={navigateRoot}
                >
                  GPT
                </button>
              </li>
              <li>
                <span aria-hidden="true">›</span>
                <span
                  data-testid="architecture-breadcrumb-block"
                  aria-current="page"
                >
                  {blockLabel}
                </span>
              </li>
            </ol>
          </nav>
          <button
            type="button"
            className="architecture-back-button"
            data-testid="architecture-back-root"
            onClick={navigateRoot}
          >
            ← 전체 구조
          </button>
          {selectors}
        </div>
      );
    case "self-attention":
      return (
        <div className="learning-route-actions">
          <nav
            className="architecture-breadcrumb"
            aria-label="Architecture navigation"
          >
            <ol>
              <li>
                <button
                  type="button"
                  data-testid="architecture-breadcrumb-gpt"
                  onClick={navigateRoot}
                >
                  GPT
                </button>
              </li>
              <li>
                <span aria-hidden="true">›</span>
                <button
                  type="button"
                  data-testid="architecture-breadcrumb-block"
                  onClick={navigateBlock}
                >
                  {blockLabel}
                </button>
              </li>
              <li>
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
          <button
            type="button"
            className="architecture-back-button"
            data-testid="architecture-back-block"
            onClick={navigateBlock}
          >
            ← Transformer Block
          </button>
          {selectors}
        </div>
      );
  }
}
