import {
  ADD_RADIUS,
  ADD1_Y,
  ADD2_Y,
  ATTENTION_HEIGHT,
  ATTENTION_Y,
  CENTER_X,
  FIRST_JUNCTION_Y,
  INPUT_HEIGHT,
  INPUT_Y,
  LN_HEIGHT,
  LN1_Y,
  LN2_Y,
  MLP_HEIGHT,
  MLP_Y,
  OUTPUT_Y,
  RESIDUAL_STATE_Y,
  SECOND_JUNCTION_Y,
  STATE_HEIGHT,
} from "./blockGeometry";

interface VerticalConnectorProps {
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

function VerticalConnector({ name, from, to }: VerticalConnectorProps) {
  return (
    <line
      className="architecture-detail-flow"
      data-connector={name}
      x1={CENTER_X}
      y1={from}
      x2={CENTER_X}
      y2={to}
    />
  );
}

export function BlockConnectors() {
  return (
    <>
      <VerticalConnector
        name="input-to-ln1"
        from={INPUT_Y + INPUT_HEIGHT}
        to={LN1_Y}
      />
      <VerticalConnector
        name="ln1-to-attention"
        from={LN1_Y + LN_HEIGHT}
        to={ATTENTION_Y}
      />
      <VerticalConnector
        name="attention-to-add1"
        from={ATTENTION_Y + ATTENTION_HEIGHT}
        to={ADD1_Y - ADD_RADIUS}
      />
      <path
        className="architecture-detail-residual"
        data-connector="input-to-residual1"
        d="M 390 108 H 700 V 382 H 412"
      />
      <VerticalConnector
        name="add1-to-x-prime"
        from={ADD1_Y + ADD_RADIUS}
        to={RESIDUAL_STATE_Y}
      />
      <VerticalConnector
        name="x-prime-to-ln2"
        from={RESIDUAL_STATE_Y + STATE_HEIGHT}
        to={LN2_Y}
      />
      <VerticalConnector
        name="ln2-to-mlp"
        from={LN2_Y + LN_HEIGHT}
        to={MLP_Y}
      />
      <VerticalConnector
        name="mlp-to-add2"
        from={MLP_Y + MLP_HEIGHT}
        to={ADD2_Y - ADD_RADIUS}
      />
      <path
        className="architecture-detail-residual"
        data-connector="x-prime-to-residual2"
        d="M 390 518 H 700 V 790 H 412"
      />
      <VerticalConnector
        name="add2-to-output"
        from={ADD2_Y + ADD_RADIUS}
        to={OUTPUT_Y}
      />
    </>
  );
}

export function ResidualJunctions() {
  return (
    <>
      <circle
        className="architecture-residual-junction"
        data-junction="block-input-junction"
        cx={CENTER_X}
        cy={FIRST_JUNCTION_Y}
        r="5"
      />
      <circle
        className="architecture-residual-junction"
        data-junction="x-prime-junction"
        cx={CENTER_X}
        cy={SECOND_JUNCTION_Y}
        r="5"
      />
    </>
  );
}
