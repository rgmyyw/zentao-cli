export function sanitizeJsonLikeResponse(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) return data;

  if (typeof data !== 'string') {
    throw new Error(`响应格式不支持: ${typeof data}`);
  }

  const objectIndex = data.indexOf('{');
  const arrayIndex = data.indexOf('[');

  let startIndex = -1;
  if (objectIndex >= 0 && arrayIndex >= 0) startIndex = Math.min(objectIndex, arrayIndex);
  else if (objectIndex >= 0) startIndex = objectIndex;
  else startIndex = arrayIndex;

  if (startIndex < 0) {
    throw new Error(`响应中未找到 JSON: ${data.slice(0, 300)}`);
  }

  return JSON.parse(data.slice(startIndex).trim()) as unknown;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`期望对象响应，实际为: ${typeof value}`);
}
