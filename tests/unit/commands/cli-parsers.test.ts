import { describe, expect, it } from 'vitest';
import { StationError } from '../../../src/core/errors.js';
import {
  parseCsv,
  parseDependencyType,
  parseIssueFilters,
  parseIssueStatus,
  parsePriority
} from '../../../src/core/cli-parsers.js';

describe('cli parser helpers', () => {
  describe('parseCsv', () => {
    it('returns undefined for missing values and trims csv entries', () => {
      expect(parseCsv(undefined)).toBeUndefined();
      expect(parseCsv('')).toBeUndefined();
      expect(parseCsv(' alpha, beta ,, gamma ')).toEqual(['alpha', 'beta', 'gamma']);
    });
  });

  describe('parseIssueStatus', () => {
    it.each(['open', 'in_progress', 'closed'])('accepts valid status %s', (value) => {
      expect(parseIssueStatus(value)).toBe(value);
    });

    it('throws INVALID_STATUS for unknown values with allowed details', () => {
      expect(() => parseIssueStatus('blocked')).toThrowError(StationError);

      try {
        parseIssueStatus('blocked');
      } catch (error) {
        const err = error as StationError;
        expect(err.code).toBe('INVALID_STATUS');
        expect(err.details).toEqual({ allowed: ['open', 'in_progress', 'closed'] });
      }
    });
  });

  describe('parsePriority', () => {
    it.each([
      ['0', 0],
      ['1', 1],
      ['2', 2],
      ['3', 3],
      ['4', 4]
    ])('accepts valid priority %s', (value, expected) => {
      expect(parsePriority(value)).toBe(expected);
    });

    it('returns undefined for missing values', () => {
      expect(parsePriority(undefined)).toBeUndefined();
    });

    it.each(['-1', '5', '2.5', 'abc'])('throws INVALID_PRIORITY for invalid priority %s', (value) => {
      expect(() => parsePriority(value)).toThrowError(StationError);

      try {
        parsePriority(value);
      } catch (error) {
        const err = error as StationError;
        expect(err.code).toBe('INVALID_PRIORITY');
        expect(err.details).toEqual({ value });
      }
    });
  });

  describe('parseDependencyType', () => {
    it.each(['blocks', 'related', 'discovered_from', 'child'])('accepts dependency type %s', (value) => {
      expect(parseDependencyType(value)).toBe(value);
    });

    it('defaults to blocks when omitted', () => {
      expect(parseDependencyType(undefined)).toBe('blocks');
    });

    it('throws INVALID_DEPENDENCY_TYPE for invalid values', () => {
      expect(() => parseDependencyType('invalid')).toThrowError(StationError);

      try {
        parseDependencyType('invalid');
      } catch (error) {
        const err = error as StationError;
        expect(err.code).toBe('INVALID_DEPENDENCY_TYPE');
        expect(err.details).toEqual({ allowed: ['blocks', 'related', 'discovered_from', 'child'] });
      }
    });
  });

  describe('parseIssueFilters', () => {
    it('maps csv values to typed filter fields', () => {
      expect(
        parseIssueFilters({
          status: 'open,closed',
          priority: '0,4',
          type: 'task,bug',
          ids: 'station-1,station-2',
          labelsAny: 'ui,backend',
          labelsAll: 'urgent,p1',
          query: 'release'
        })
      ).toEqual({
        ids: ['station-1', 'station-2'],
        statuses: ['open', 'closed'],
        priorities: [0, 4],
        types: ['task', 'bug'],
        labelsAny: ['ui', 'backend'],
        labelsAll: ['urgent', 'p1'],
        query: 'release'
      });
    });

    it('throws with stable error codes for invalid status/priority in filters', () => {
      expect(() => parseIssueFilters({ status: 'open,blocked' })).toThrowError(StationError);
      expect(() => parseIssueFilters({ priority: '2,high' })).toThrowError(StationError);

      try {
        parseIssueFilters({ status: 'open,blocked' });
      } catch (error) {
        const err = error as StationError;
        expect(err.code).toBe('INVALID_STATUS');
      }

      try {
        parseIssueFilters({ priority: '2,high' });
      } catch (error) {
        const err = error as StationError;
        expect(err.code).toBe('INVALID_PRIORITY');
      }
    });
  });
});
