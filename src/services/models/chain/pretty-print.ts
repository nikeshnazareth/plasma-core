import BigNum from 'bn.js';

/**
 * Base class that allows for printing objects in a prettified manner.
 */
export class PrettyPrint {
  /**
   * Returns the object as a pretty JSON string.
   * Converts BigNums to decimal strings.
   * @returns the JSON string.
   */
  prettify(): string {
    const parsed: { [key: string]: any } = {};
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (BigNum.isBN(value)) {
        parsed[key] = value.toString(10);
      } else {
        parsed[key] = value;
      }
    });
    return JSON.stringify(parsed, null, 2);
  }
}
