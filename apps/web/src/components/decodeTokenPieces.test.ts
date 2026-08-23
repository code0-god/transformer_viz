import { decodeTokenPieces } from "./decodeTokenPieces";

test("decodes concatenated token bytes across UTF-8 boundaries", () => {
  expect(
    decodeTokenPieces([[0xe2], [0x82], [0xac], [], [0x20], [0x63, 0x61]]),
  ).toBe("€ ca");
});
