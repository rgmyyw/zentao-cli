let requestCount = 0;
let lastRequestDurationMs = 0;

export function recordRequestStarted(): void {
  requestCount += 1;
}

export function recordRequestFinished(durationMs: number): void {
  lastRequestDurationMs = durationMs;
}

export function getRequestCount(): number {
  return requestCount;
}

export function getLastRequestDurationMs(): number {
  return lastRequestDurationMs;
}

export function resetRequestMetrics(): void {
  requestCount = 0;
  lastRequestDurationMs = 0;
}
