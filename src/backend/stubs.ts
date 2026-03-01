import { StationError } from '../core/errors.js';
import type { StationBackendAdapter } from './types.js';

function unsupported(name: 'linear' | 'asana'): StationBackendAdapter {
  return {
    name,
    supported: false,
    open() {
      throw new StationError(`${name} backend is not implemented in Station v1`, {
        code: 'BACKEND_NOT_IMPLEMENTED',
        details: { backend: name }
      });
    }
  };
}

export const linearBackendAdapter = unsupported('linear');
export const asanaBackendAdapter = unsupported('asana');
