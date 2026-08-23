import { describe, expect, test } from "bun:test";
import config from "../../../assets/models/edu/config.json";

import { transformerBlockLabel } from "./architecture";

describe("Root Architecture config projection", () => {
  test("uses canonical Rust model layer count", () => {
    expect(transformerBlockLabel(config)).toBe("Transformer Block × 2");
  });
});
