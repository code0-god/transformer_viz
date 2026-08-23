export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function field(value: UnknownRecord, name: string): unknown {
  return value[name];
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isSafeId(value: unknown): value is number {
  return (
    isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0
  );
}

export function isNullableId(value: unknown): value is number | null {
  return value === null || isSafeId(value);
}

export function isArray(
  value: unknown,
  item: (entry: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.every(item);
}

export function isOneOf(
  value: unknown,
  values: ReadonlySet<string>,
): value is string {
  return isString(value) && values.has(value);
}
