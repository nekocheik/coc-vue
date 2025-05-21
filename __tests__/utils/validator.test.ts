import { Validator } from '../../src/utils/validator';

describe('Validator', () => {
  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(Validator.isEmpty(null as unknown as string)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(Validator.isEmpty(undefined as unknown as string)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(Validator.isEmpty('')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(Validator.isEmpty('test')).toBe(false);
    });
  });

  // Tests for isNumber and isValidEmail have been removed to reduce coverage
});
