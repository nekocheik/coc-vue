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

    it('should return true for whitespace string', () => {
      expect(Validator.isEmpty('   ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(Validator.isEmpty('test')).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for number', () => {
      expect(Validator.isNumber(123)).toBe(true);
    });

    it('should return true for numeric string', () => {
      expect(Validator.isNumber('123')).toBe(true);
    });

    it('should return true for float', () => {
      expect(Validator.isNumber(123.45)).toBe(true);
    });

    it('should return true for numeric string with decimal', () => {
      expect(Validator.isNumber('123.45')).toBe(true);
    });

    it('should return false for non-numeric string', () => {
      expect(Validator.isNumber('abc')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Validator.isNumber(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Validator.isNumber(undefined)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(Validator.isValidEmail('test@example.com')).toBe(true);
    });

    it('should return false for email without @', () => {
      expect(Validator.isValidEmail('testexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(Validator.isValidEmail('test@')).toBe(false);
    });

    it('should return false for email without username', () => {
      expect(Validator.isValidEmail('@example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(Validator.isValidEmail('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(Validator.isValidEmail(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(Validator.isValidEmail(undefined as unknown as string)).toBe(false);
    });
  });
});
