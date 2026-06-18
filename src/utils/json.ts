export function sanitizeJsonLikeResponse(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) return unwrapEnvelope(data);

  if (typeof data !== 'string') {
    throw new Error(`响应格式不支持: ${typeof data}`);
  }

  for (let index = 0; index < data.length; index += 1) {
    const char = data[index];
    if (char !== '{' && char !== '[') continue;

    const endIndex = findJsonEnd(data, index);
    if (endIndex < 0) continue;

    try {
      return unwrapEnvelope(JSON.parse(data.slice(index, endIndex + 1)) as unknown);
    } catch {
      continue;
    }
  }

  throw new Error(`响应中未找到 JSON: ${data.slice(0, 300)}`);
}

function unwrapEnvelope(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const record = data as Record<string, unknown>;
  const payload = record.data;
  if (typeof payload === 'string' && payload.trim().startsWith('{')) {
    try {
      return sanitizeJsonLikeResponse(payload);
    } catch {
      return data;
    }
  }
  if (typeof payload === 'string' && payload.trim().startsWith('[')) {
    try {
      return sanitizeJsonLikeResponse(payload);
    } catch {
      return data;
    }
  }
  return data;
}

function findJsonEnd(text: string, startIndex: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push('}');
      continue;
    }

    if (char === '[') {
      stack.push(']');
      continue;
    }

    if (char !== '}' && char !== ']') continue;
    if (stack.pop() !== char) return -1;
    if (stack.length === 0) return index;
  }

  return -1;
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`期望对象响应，实际为: ${typeof value}`);
}
