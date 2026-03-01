export type SuccessEnvelope<T> = {
  ok: true;
  data: T;
};

export type FailureEnvelope = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function success<T>(data: T): SuccessEnvelope<T> {
  return {
    ok: true,
    data
  };
}

export function failure(code: string, message: string, details?: unknown): FailureEnvelope {
  return {
    ok: false,
    error: {
      code,
      message,
      details
    }
  };
}
