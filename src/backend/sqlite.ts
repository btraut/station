import { openDatabase } from '../db/database.js';
import { StationRepository } from '../db/repository.js';
import type { StationBackendAdapter } from './types.js';

export const sqliteBackendAdapter: StationBackendAdapter = {
  name: 'sqlite',
  supported: true,
  open(paths) {
    const db = openDatabase(paths.dbPath);
    return {
      backend: 'sqlite',
      repository: new StationRepository(db),
      close() {
        db.close();
      }
    };
  }
};
