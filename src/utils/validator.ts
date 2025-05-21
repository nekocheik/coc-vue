/**
 * Simple validator utility functions
 */
export class Validator {
  /**
   * Checks if a string is empty
   * @param value String to check
   * @returns True if the string is empty or only whitespace
   */
  static isEmpty(value: string): boolean {
    return value === null || value === undefined || value.trim() === '';
  }

  /**
   * Checks if a value is a valid number
   * @param value Value to check
   * @returns True if the value is a valid number
   */
  static isNumber(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  /**
   * Validates an email address format
   * @param email Email to validate
   * @returns True if the email format is valid
   */
  static isValidEmail(email: string): boolean {
    if (this.isEmpty(email)) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
