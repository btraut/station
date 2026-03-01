import { StationError } from '../core/errors.js';
import { asanaBackendAdapter, linearBackendAdapter } from './stubs.js';
import { sqliteBackendAdapter } from './sqlite.js';
import type { BackendName, StationBackendAdapter } from './types.js';

const adapters = new Map<BackendName, StationBackendAdapter>([
  ['sqlite', sqliteBackendAdapter],
  ['linear', linearBackendAdapter],
  ['asana', asanaBackendAdapter]
]);

export function getBackendAdapter(name: string): StationBackendAdapter {
  const adapter = adapters.get(name as BackendName);
  if (!adapter) {
    throw new StationError(`Unknown backend: ${name}`, {
      code: 'UNKNOWN_BACKEND',
      details: { allowed: Array.from(adapters.keys()) }
    });
  }

  return adapter;
}

export function listBackendAdapters(): StationBackendAdapter[] {
  return Array.from(adapters.values());
}
