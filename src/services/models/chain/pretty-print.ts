import BigNum from 'bn.js';

type PrettyPrintable = string|number|BigNum|Function;

/**
 * Base class that allows for printing objects in a prettified manner.
 */
export class PrettyPrint {
  [key: string]: PrettyPrintable;

  /**
   * Returns the object as a pretty JSON string.
   * Converts BigNums to decimal strings.
   * @returns the JSON string.
   */
  prettify(): string {
    const parsed: {[key: string]: string|number} = {};
    Object.keys(this).forEach((key) => {
      const value = this[key];
      if (BigNum.isBN(value)) {
        parsed[key] = value.toString(10);
      } else if (!(value instanceof Function)) {
        parsed[key] = value;
      }
    });
    return JSON.stringify(parsed, null, 2);
  }
}
