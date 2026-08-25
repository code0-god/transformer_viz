import { ArchitectureCanvasFormula } from "../ArchitectureNode";
import { geometry } from "./geometry";

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

function centerX(bounds: Readonly<{ x: number; width: number }>): number {
  return bounds.x + bounds.width / 2;
}

function centerY(bounds: Readonly<{ y: number; height: number }>): number {
  return bounds.y + bounds.height / 2;
}

function bottom(bounds: Readonly<{ y: number; height: number }>): number {
  return bounds.y + bounds.height;
}

export function AttentionConnectors() {
  const qkvBranchY = (bottom(geometry.qkv) + geometry.query.y) / 2;
  const scoreBranchY = (bottom(geometry.querySplit) + geometry.scores.y) / 2;
  const aggregationBranchY =
    (bottom(geometry.softmax) + geometry.aggregation.y) / 2;
  return (
    <>
      <FlowLine
        name="input-to-qkv"
        x1={centerX(geometry.input)}
        y1={bottom(geometry.input)}
        x2={centerX(geometry.qkv)}
        y2={geometry.qkv.y}
      />
      <FlowPath
        name="qkv-to-query"
        d={`M ${centerX(geometry.qkv)} ${bottom(geometry.qkv)} V ${qkvBranchY} H ${centerX(geometry.query)} V ${geometry.query.y}`}
      />
      <FlowPath
        name="qkv-to-key"
        d={`M ${centerX(geometry.qkv)} ${bottom(geometry.qkv)} V ${geometry.key.y}`}
      />
      <FlowPath
        name="qkv-to-value"
        d={`M ${centerX(geometry.qkv)} ${bottom(geometry.qkv)} V ${qkvBranchY} H ${centerX(geometry.value)} V ${geometry.value.y}`}
      />
      <FlowLine
        name="query-to-heads"
        x1={centerX(geometry.query)}
        y1={bottom(geometry.query)}
        x2={centerX(geometry.querySplit)}
        y2={geometry.querySplit.y}
      />
      <FlowLine
        name="key-to-heads"
        x1={centerX(geometry.key)}
        y1={bottom(geometry.key)}
        x2={centerX(geometry.keySplit)}
        y2={geometry.keySplit.y}
      />
      <FlowLine
        name="value-to-heads"
        x1={centerX(geometry.value)}
        y1={bottom(geometry.value)}
        x2={centerX(geometry.valueSplit)}
        y2={geometry.valueSplit.y}
      />
      <FlowPath
        name="query-heads-to-scores"
        d={`M ${centerX(geometry.querySplit)} ${bottom(geometry.querySplit)} V ${scoreBranchY} H ${geometry.scores.x + 90} V ${geometry.scores.y}`}
      />
      <FlowPath
        name="key-heads-to-scores"
        d={`M ${centerX(geometry.keySplit)} ${bottom(geometry.keySplit)} V ${scoreBranchY} H ${geometry.scores.x + 210} V ${geometry.scores.y}`}
      />
      <FlowLine
        name="scores-to-scale"
        x1={centerX(geometry.scores)}
        y1={bottom(geometry.scores)}
        x2={centerX(geometry.scale)}
        y2={geometry.scale.y}
      />
      <FlowLine
        name="scale-to-mask"
        x1={centerX(geometry.scale)}
        y1={bottom(geometry.scale)}
        x2={centerX(geometry.mask)}
        y2={geometry.mask.y}
      />
      <FlowLine
        name="mask-to-softmax"
        x1={centerX(geometry.mask)}
        y1={bottom(geometry.mask)}
        x2={centerX(geometry.softmax)}
        y2={geometry.softmax.y}
      />
      <FlowPath
        name="softmax-to-value-aggregation"
        d={`M ${centerX(geometry.softmax)} ${bottom(geometry.softmax)} V ${aggregationBranchY} H ${centerX(geometry.aggregation)} V ${geometry.aggregation.y}`}
      />
      <FlowPath
        name="value-heads-to-aggregation"
        d={`M ${centerX(geometry.valueSplit)} ${bottom(geometry.valueSplit)} V ${centerY(geometry.aggregation)} H ${geometry.aggregation.x + geometry.aggregation.width}`}
      />
      <ArchitectureCanvasFormula
        className="architecture-attention-connector-formula"
        formulaId="attention-value-edge"
        x={centerX(geometry.valueSplit)}
        y={
          (bottom(geometry.valueSplit) + centerY(geometry.aggregation)) / 2 - 14
        }
        width={150}
        height={28}
      />
      <FlowLine
        name="aggregation-to-head-outputs"
        x1={centerX(geometry.aggregation)}
        y1={bottom(geometry.aggregation)}
        x2={centerX(geometry.headOutputs)}
        y2={geometry.headOutputs.y}
      />
      <FlowLine
        name="head-outputs-to-merge"
        x1={centerX(geometry.headOutputs)}
        y1={bottom(geometry.headOutputs)}
        x2={centerX(geometry.merge)}
        y2={geometry.merge.y}
      />
      <FlowLine
        name="merge-to-output-projection"
        x1={centerX(geometry.merge)}
        y1={bottom(geometry.merge)}
        x2={centerX(geometry.projection)}
        y2={geometry.projection.y}
      />
      <FlowLine
        name="output-projection-to-attention-output"
        x1={centerX(geometry.projection)}
        y1={bottom(geometry.projection)}
        x2={centerX(geometry.output)}
        y2={geometry.output.y}
      />
    </>
  );
}
