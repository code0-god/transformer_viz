import type { ReactElement, ReactNode } from "react";

import { transformerBlockLabel } from "./architecture";
import type { GptConfig } from "./generated/GptConfig";

interface AppProperties {
  readonly config: GptConfig;
}

interface NodeProperties {
  readonly children: ReactNode;
  readonly className: string;
}

function ArchitectureNode({
  children,
  className,
}: NodeProperties): ReactElement {
  return <div className={`node ${className}`}>{children}</div>;
}

function Connector(): ReactElement {
  return <span aria-hidden="true" className="connector" />;
}

export function App({ config }: AppProperties): ReactElement {
  return (
    <main className="spike-shell">
      <header>
        <p className="eyebrow">Renderer feasibility spike</p>
        <h1>GPT Root Architecture</h1>
        <p>
          Rust canonical config · {config.n_layer} layers · {config.n_head}{" "}
          heads · d_model {config.n_embd}
        </p>
      </header>

      <section
        className="architecture"
        aria-label="Static GPT Root Architecture"
      >
        <ArchitectureNode className="input">Input Context</ArchitectureNode>
        <Connector />
        <div className="embedding-fork">
          <ArchitectureNode className="embedding">
            Token Embedding
          </ArchitectureNode>
          <span aria-hidden="true" className="plus">
            +
          </span>
          <ArchitectureNode className="embedding">
            Position Embedding
          </ArchitectureNode>
        </div>
        <Connector />
        <ArchitectureNode className="hidden">Hidden State x₀</ArchitectureNode>
        <Connector />
        <article className="block">
          <h2>{transformerBlockLabel(config)}</h2>
          <ArchitectureNode className="normalization">
            LayerNorm 1
          </ArchitectureNode>
          <Connector />
          <ArchitectureNode className="attention">
            Causal Multi-Head Self-Attention
          </ArchitectureNode>
          <Connector />
          <ArchitectureNode className="residual">Residual Add</ArchitectureNode>
          <Connector />
          <ArchitectureNode className="normalization">
            LayerNorm 2
          </ArchitectureNode>
          <Connector />
          <ArchitectureNode className="attention">MLP</ArchitectureNode>
          <Connector />
          <ArchitectureNode className="residual">Residual Add</ArchitectureNode>
        </article>
        <Connector />
        <ArchitectureNode className="normalization">
          Final LayerNorm
        </ArchitectureNode>
        <Connector />
        <ArchitectureNode className="projection">LM Head</ArchitectureNode>
        <Connector />
        <ArchitectureNode className="sampling">
          Token Selection
        </ArchitectureNode>
        <Connector />
        <ArchitectureNode className="generated">
          Generated Token
        </ArchitectureNode>
        <Connector />
        <ArchitectureNode className="context">
          Append to Context
        </ArchitectureNode>
      </section>
    </main>
  );
}
