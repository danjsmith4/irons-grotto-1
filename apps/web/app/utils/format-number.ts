/**
 * Formats a number with comma separators for better readability
 * @param num - The number to format
 * @param options - Optional formatting options
 * @returns Formatted string with commas
 */
export function formatNumber(
  num: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat('en-US', options).format(num);
}

/**
 * Formats a number in millions with comma separators and specified decimal places
 * @param num - The number to format (will be divided by 1,000,000)
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted string like "1,234.56M"
 */
export function formatXpInMillions(num: number, decimals = 2): string {
  const millions = num / 1_000_000;
  return `${formatNumber(millions, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}M`;
}
