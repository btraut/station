import { describe, expect, it, vi } from 'vitest';
import { StationError, isStationError } from '../../../src/core/errors.js';
import { failure, printJson, success } from '../../../src/core/output.js';

describe('core error and output contracts', () => {
  it('creates StationError values with code/details/exitCode', () => {
    const err = new StationError('bad input', {
      code: 'INVALID_INPUT',
      details: { field: 'status' },
      exitCode: 9
    });

    expect(err.name).toBe('StationError');
    expect(err.message).toBe('bad input');
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.details).toEqual({ field: 'status' });
    expect(err.exitCode).toBe(9);
    expect(isStationError(err)).toBe(true);
    expect(isStationError(new Error('nope'))).toBe(false);
  });

  it('returns stable success and failure envelope shapes', () => {
    expect(success({ id: 'station-1' })).toEqual({
      ok: true,
      data: { id: 'station-1' }
    });

    expect(failure('INVALID_STATUS', 'Invalid status', { allowed: ['open'] })).toEqual({
      ok: false,
      error: {
        code: 'INVALID_STATUS',
        message: 'Invalid status',
        details: { allowed: ['open'] }
      }
    });
  });

  it('prints pretty JSON plus trailing newline', () => {
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    try {
      printJson({ ok: true, value: 1 });
      expect(write).toHaveBeenCalledWith('{\n  "ok": true,\n  "value": 1\n}\n');
    } finally {
      write.mockRestore();
    }
  });
});
