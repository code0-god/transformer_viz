const decoder = new TextDecoder();

export function decodeTokenPieces(
  pieces: readonly (readonly number[])[],
): string {
  return decoder.decode(Uint8Array.from(pieces.flat()));
}
