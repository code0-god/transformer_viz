import {
  isCandidate,
  isGenerationConfig,
  isModel,
  isSnapshot,
  isStep,
} from "./protocolValueGuards";

const stats = { min: 0, max: 0, mean: 0, std: 0, l2_norm: 0 };
const token = {
  id: 1,
  display: "token",
  piece: [1],
  byte_start: 0,
  byte_end: 1,
  kind: "byte",
};
const candidate = {
  token_id: 1,
  display: "token",
  logit: 2,
  probability: 0.75,
};
const generationConfig = {
  max_new_tokens: 24,
  temperature: 1,
  top_k: 20,
  mode: "sample",
  seed: 42,
};
const step = {
  index: 0,
  context_token_ids: [1],
  generated_token: token,
  selected_logit: 2,
  selected_probability: 0.75,
  candidates: [candidate],
  random: 0.5,
  selected_interval: { start: 0.25, end: 1 },
  forward_ms: 1,
  sampling_ms: 0.25,
  total_ms: 1.25,
};
const model = {
  name: "edu",
  corpus: "fixture",
  nanogpt_commit: "abc",
  parameter_count: 42,
  config: {
    block_size: 24,
    vocab_size: 259,
    n_layer: 2,
    n_head: 4,
    n_embd: 64,
    bias: true,
  },
};
const snapshot = {
  id: "tensor",
  label: "tensor",
  shape: [2, 2],
  values: [0, 1, 2, 3],
  stats,
};

describe("protocol value guards", () => {
  test("accepts values constructible by the Rust protocol", () => {
    expect(isGenerationConfig(generationConfig)).toBe(true);
    expect(isCandidate({ ...candidate, probability: 0 })).toBe(true);
    expect(isCandidate({ ...candidate, probability: 1 })).toBe(true);
    expect(
      isStep({
        ...step,
        selected_probability: 0,
        random: 0,
        selected_interval: { start: 0, end: 1 },
        forward_ms: 0,
        sampling_ms: 0,
        total_ms: 0,
      }),
    ).toBe(true);
    expect(isModel(model)).toBe(true);
    expect(isSnapshot(snapshot)).toBe(true);
    expect(isSnapshot({ ...snapshot, shape: [], values: [0] })).toBe(true);
  });

  test.each([
    ["zero Top-K", { ...generationConfig, top_k: 0 }],
    ["zero temperature", { ...generationConfig, temperature: 0 }],
    ["negative temperature", { ...generationConfig, temperature: -0.1 }],
    [
      "infinite temperature",
      { ...generationConfig, temperature: Number.POSITIVE_INFINITY },
    ],
    ["NaN temperature", { ...generationConfig, temperature: Number.NaN }],
  ])("rejects generation config with %s", (_name, value: unknown) => {
    expect(isGenerationConfig(value)).toBe(false);
  });

  test.each([-0.01, 1.01])(
    "rejects candidate probability %s",
    (probability) => {
      expect(isCandidate({ ...candidate, probability })).toBe(false);
    },
  );

  test.each([-0.01, 1.01])(
    "rejects selected probability %s",
    (selected_probability) => {
      expect(isStep({ ...step, selected_probability })).toBe(false);
    },
  );

  test.each([
    ["negative start", { start: -0.1, end: 0.5 }],
    ["end above one", { start: 0.5, end: 1.1 }],
    ["empty", { start: 0.5, end: 0.5 }],
    ["reversed", { start: 0.75, end: 0.25 }],
  ])("rejects %s sampling interval", (_name, selected_interval) => {
    expect(isStep({ ...step, selected_interval })).toBe(false);
  });

  test.each(["forward_ms", "sampling_ms", "total_ms"] as const)(
    "rejects negative %s",
    (field) => {
      expect(isStep({ ...step, [field]: -0.01 })).toBe(false);
    },
  );

  test.each([
    "block_size",
    "vocab_size",
    "n_layer",
    "n_head",
    "n_embd",
  ] as const)("rejects zero model config %s", (field) => {
    expect(isModel({ ...model, config: { ...model.config, [field]: 0 } })).toBe(
      false,
    );
  });

  test("rejects an embedding width not divisible by the head count", () => {
    expect(isModel({ ...model, config: { ...model.config, n_embd: 63 } })).toBe(
      false,
    );
  });

  test.each([
    ["too few", { ...snapshot, values: [0, 1, 2] }],
    ["too many", { ...snapshot, values: [0, 1, 2, 3, 4] }],
    ["empty zero-sized", { ...snapshot, shape: [0], values: [] }],
  ])("rejects %s tensor values", (_name, value: unknown) => {
    expect(isSnapshot(value)).toBe(false);
  });
});
