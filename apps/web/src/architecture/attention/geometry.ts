export const ATTENTION_WIDTH = 1000;
export const ATTENTION_HEIGHT = 1582;

export const geometry = {
  input: { x: 310, y: 24, width: 320, height: 56 },
  qkv: { x: 290, y: 120, width: 360, height: 72 },
  query: { x: 70, y: 260, width: 220, height: 68 },
  key: { x: 360, y: 260, width: 220, height: 68 },
  value: { x: 650, y: 260, width: 220, height: 68 },
  querySplit: { x: 70, y: 380, width: 220, height: 72 },
  keySplit: { x: 360, y: 380, width: 220, height: 72 },
  valueSplit: { x: 650, y: 380, width: 220, height: 72 },
  scores: { x: 210, y: 520, width: 300, height: 72 },
  scale: { x: 240, y: 660, width: 240, height: 64 },
  mask: { x: 210, y: 792, width: 300, height: 72 },
  softmax: { x: 210, y: 928, width: 300, height: 72 },
  aggregation: { x: 320, y: 1064, width: 300, height: 72 },
  headOutputs: { x: 320, y: 1180, width: 300, height: 58 },
  merge: { x: 320, y: 1258, width: 300, height: 72 },
  projection: { x: 320, y: 1394, width: 300, height: 72 },
  output: { x: 320, y: 1500, width: 300, height: 58 },
};
