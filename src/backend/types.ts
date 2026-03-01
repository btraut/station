import type { StationPaths } from '../core/paths.js';
import type { StationRepository } from '../db/repository.js';

export type BackendName = 'sqlite' | 'linear' | 'asana';

export type BackendSession = {
  readonly backend: BackendName;
  readonly repository: StationRepository;
  close(): void;
};

export interface StationBackendAdapter {
  readonly name: BackendName;
  readonly supported: boolean;
  open(paths: StationPaths): BackendSession;
}
