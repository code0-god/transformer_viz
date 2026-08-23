type LineProps = {
  readonly name: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

function FlowLine({ name, x1, y1, x2, y2 }: LineProps) {
  return (
    <line
      className="architecture-attention-flow"
      data-connector={name}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
    />
  );
}

function FlowPath({ name, d }: { readonly name: string; readonly d: string }) {
  return (
    <path className="architecture-attention-flow" data-connector={name} d={d} />
  );
}

export function AttentionConnectors() {
  return (
    <>
      <FlowLine name="input-to-qkv" x1={470} y1={80} x2={470} y2={120} />
      <FlowPath name="qkv-to-query" d="M 470 192 V 225 H 180 V 260" />
      <FlowPath name="qkv-to-key" d="M 470 192 V 260" />
      <FlowPath name="qkv-to-value" d="M 470 192 V 225 H 760 V 260" />
      <FlowLine name="query-to-heads" x1={180} y1={328} x2={180} y2={380} />
      <FlowLine name="key-to-heads" x1={470} y1={328} x2={470} y2={380} />
      <FlowLine name="value-to-heads" x1={760} y1={328} x2={760} y2={380} />
      <FlowPath name="query-heads-to-scores" d="M 180 452 V 482 H 300 V 520" />
      <FlowPath name="key-heads-to-scores" d="M 470 452 V 482 H 420 V 520" />
      <FlowLine name="scores-to-scale" x1={360} y1={592} x2={360} y2={640} />
      <FlowLine name="scale-to-mask" x1={360} y1={704} x2={360} y2={750} />
      <FlowLine name="mask-to-softmax" x1={360} y1={822} x2={360} y2={870} />
      <FlowPath
        name="softmax-to-value-aggregation"
        d="M 360 942 V 980 H 470 V 1010"
      />
      <FlowPath name="value-heads-to-aggregation" d="M 760 452 V 1046 H 620" />
      <text className="architecture-attention-connector-label" x={776} y={742}>
        V_h [T, D]
      </text>
      <FlowLine
        name="aggregation-to-head-outputs"
        x1={470}
        y1={1082}
        x2={470}
        y2={1130}
      />
      <FlowLine
        name="head-outputs-to-merge"
        x1={470}
        y1={1188}
        x2={470}
        y2={1235}
      />
      <FlowLine
        name="merge-to-output-projection"
        x1={470}
        y1={1307}
        x2={470}
        y2={1355}
      />
      <FlowLine
        name="output-projection-to-attention-output"
        x1={470}
        y1={1427}
        x2={470}
        y2={1470}
      />
    </>
  );
}
