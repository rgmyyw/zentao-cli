/**
 * 表单编码入参类型，统一入口，避免调用方频繁 `as unknown as Record<string, unknown>`。
 * 值为 unknown，由 toFormUrlEncoded 内部按基本类型 / 数组 / 对象数组安全序列化。
 */
export type FormEncodable = Record<string, unknown>;

/**
 * 将对象转为 application/x-www-form-urlencoded 字符串。
 * - 基本类型值：`key=value`。
 * - 基本类型数组：`key[]=v1&key[]=v2`（PHP $_POST 标准）。
 * - 对象数组：展开为 `key[0][field]=...&key[1][field]=...`，避免 `[object Object]`（P0：批量任务 payload 双重包装修复）。
 */
export function toFormUrlEncoded(data: FormEncodable): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    appendFormValue(params, key, value);
  }
  return params.toString();
}

function appendFormValue(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item === undefined || item === null) return;
      if (typeof item === 'object' && !Array.isArray(item)) {
        for (const [field, fieldValue] of Object.entries(item as Record<string, unknown>)) {
          if (fieldValue === undefined || fieldValue === null) continue;
          params.append(`${key}[${index}][${field}]`, String(fieldValue));
        }
      } else {
        params.append(`${key}[]`, String(item));
      }
    });
    return;
  }

  params.append(key, String(value));
}
