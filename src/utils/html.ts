export function containsHtmlMarkup(value: unknown): value is string {
  return typeof value === 'string' && /<\/?[a-z][^>]*>/i.test(value);
}
