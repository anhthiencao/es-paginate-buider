import { AttributeDtoEs } from './es.types';

/**
 * Check if a string contains any special characters.
 * @param str - The string to check.
 * @returns {boolean} true if the string contains special characters, false otherwise.
 *
 * @example
 * // Example usage:
 * const str = 'example@123';
 * const hasSpecialChars = checkSpecialCharacters(str);
 * // Returns: true
 */
export function checkSpecialCharacters(str: string): boolean {
  const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
  return specialChars.test(str);
}

/**
 * Remove accents from a string.
 * @param str - The string to remove accents from.
 * @returns The string without accents.
 *
 * @example
 * // Example usage:
 * const str = 'éxàmple';
 * const cleanedStr = removeAccent(str);
 * // Returns: example
 */
export function removeAccent(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00d0/g, 'D') // Handling the specific case of Đ/d
    .replace(/\u00f0/g, 'd')
    .trim();
}
