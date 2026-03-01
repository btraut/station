export class StationError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly exitCode: number;

  constructor(message: string, options: { code: string; details?: unknown; exitCode?: number }) {
    super(message);
    this.name = 'StationError';
    this.code = options.code;
    this.details = options.details;
    this.exitCode = options.exitCode ?? 1;
  }
}

export function isStationError(value: unknown): value is StationError {
  return value instanceof StationError;
}
