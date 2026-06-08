/**
 * 将对象转为 application/x-www-form-urlencoded 字符串。
 * 数组值使用 key[]=value 重复键格式（PHP $_POST 标准）。
 */
export function toFormUrlEncoded(data: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(`${key}[]`, String(item));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}
