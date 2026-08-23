import type { ArchitectureNodeId } from "../catalog";

export const BLOCK_WIDTH = 900;
export const BLOCK_HEIGHT = 930;
export const CENTER_X = 390;
export const RAIL_X = 700;
export const MODULE_X = 225;
export const MODULE_WIDTH = 330;
export const STATE_HEIGHT = 48;
export const INPUT_Y = 24;
export const INPUT_HEIGHT = 56;
export const FIRST_JUNCTION_Y = 108;
export const LN1_Y = 146;
export const LN_HEIGHT = 56;
export const ATTENTION_Y = 250;
export const ATTENTION_HEIGHT = 80;
export const ADD1_Y = 382;
export const ADD_RADIUS = 22;
export const RESIDUAL_STATE_Y = 438;
export const SECOND_JUNCTION_Y = 518;
export const LN2_Y = 560;
export const MLP_Y = 664;
export const MLP_HEIGHT = 72;
export const ADD2_Y = 790;
export const OUTPUT_Y = 850;

export const BLOCK_OPERATION_IDS = [
  "layer-norm-1",
  "self-attention",
  "residual-1",
  "layer-norm-2",
  "mlp",
  "residual-2",
] satisfies readonly ArchitectureNodeId[];
