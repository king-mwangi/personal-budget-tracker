/**
 * Globally formats currency strings based on the selected currency locale/code.
 * Supports Ksh (Kenyan Shilling), USD, and EUR consistently across all platforms.
 */

export interface FormatCurrencyOptions extends Intl.NumberFormatOptions {
  /**
   * If true, forces negative sign before the currency symbol (e.g., -$100.00).
   * If false, places negative sign at the very front (e.g., -$100.00 is identical, but helps with custom spacing).
   */
  keepSign?: boolean;
}

/**
 * Returns the neat display symbol for a given currency code.
 */
export function getCurrencySymbol(currency: string): string {
  const clean = currency.trim();
  switch (clean) {
    case 'Ksh':
    case 'KES':
    case 'Ksh ':
      return 'Ksh ';
    case 'EUR':
    case '€':
      return '€';
    case 'USD':
    case '$':
    default:
      return '$';
  }
}

/**
 * Formats a numeric value consistently according to the selected currency.
 * Guarantees a unified display across different browsers/operating systems.
 * 
 * @param amount The numeric value to format
 * @param currency The currency configuration (e.g., 'Ksh', 'USD', 'EUR', or symbols)
 * @param options Fallback formatting options for decimal precision
 */
export function formatCurrency(
  amount: number,
  currency: string = 'Ksh',
  options: FormatCurrencyOptions = {}
): string {
  const symbol = getCurrencySymbol(currency);
  const isNegative = amount < 0;
  const absoluteValue = Math.abs(amount);

  // Default to 2 decimal places if active, but allow overriding
  const formatOpts: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  };

  try {
    // We format the numeric value with 'en-US' locale (which utilizes comma-based thousands separators and period decimals)
    // to keep digital ledger presentation extremely clean, standard, and highly readable.
    const formatter = new Intl.NumberFormat('en-US', formatOpts);
    const formattedNumber = formatter.format(absoluteValue);
    
    // Consistent structure: negative sign appears first, followed by currency symbol and the formatted number.
    const sign = isNegative ? '-' : '';
    return `${sign}${symbol}${formattedNumber}`;
  } catch (error) {
    // Safe standard fallback
    const fixedValue = absoluteValue.toFixed(
      options.maximumFractionDigits !== undefined ? options.maximumFractionDigits : 2
    );
    const sign = isNegative ? '-' : '';
    return `${sign}${symbol}${fixedValue}`;
  }
}
