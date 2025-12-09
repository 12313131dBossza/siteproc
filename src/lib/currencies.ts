// Currency configuration for international support
// This file contains all supported currencies with their symbols and formatting

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  flag: string
  decimals: number
  symbolPosition: 'before' | 'after'
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  // North America
  USD: { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸', decimals: 2, symbolPosition: 'before' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', decimals: 2, symbolPosition: 'before' },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', decimals: 2, symbolPosition: 'before' },

  // Europe
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2, symbolPosition: 'before' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2, symbolPosition: 'before' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', decimals: 2, symbolPosition: 'before' },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', decimals: 2, symbolPosition: 'after' },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', decimals: 2, symbolPosition: 'after' },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', decimals: 2, symbolPosition: 'after' },
  PLN: { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', decimals: 2, symbolPosition: 'after' },
  CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', decimals: 2, symbolPosition: 'after' },
  HUF: { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', decimals: 0, symbolPosition: 'after' },
  RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', decimals: 2, symbolPosition: 'after' },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', decimals: 2, symbolPosition: 'before' },

  // Asia Pacific
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', decimals: 0, symbolPosition: 'before' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', decimals: 2, symbolPosition: 'before' },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', decimals: 2, symbolPosition: 'before' },
  TWD: { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', decimals: 0, symbolPosition: 'before' },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', decimals: 0, symbolPosition: 'before' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', decimals: 2, symbolPosition: 'before' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', decimals: 2, symbolPosition: 'before' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', decimals: 2, symbolPosition: 'before' },

  // Southeast Asia
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', decimals: 2, symbolPosition: 'before' },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', decimals: 2, symbolPosition: 'before' },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', decimals: 2, symbolPosition: 'before' },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', decimals: 0, symbolPosition: 'before' },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', decimals: 2, symbolPosition: 'before' },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', decimals: 0, symbolPosition: 'after' },
  MMK: { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲', decimals: 0, symbolPosition: 'before' },
  KHR: { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', flag: '🇰🇭', decimals: 0, symbolPosition: 'after' },
  LAK: { code: 'LAK', name: 'Lao Kip', symbol: '₭', flag: '🇱🇦', decimals: 0, symbolPosition: 'before' },
  BND: { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', flag: '🇧🇳', decimals: 2, symbolPosition: 'before' },

  // South Asia
  PKR: { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰', decimals: 2, symbolPosition: 'before' },
  BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩', decimals: 2, symbolPosition: 'before' },
  LKR: { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰', decimals: 2, symbolPosition: 'before' },
  NPR: { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵', decimals: 2, symbolPosition: 'before' },

  // Middle East
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', decimals: 2, symbolPosition: 'before' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦', decimals: 2, symbolPosition: 'before' },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', flag: '🇶🇦', decimals: 2, symbolPosition: 'before' },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼', decimals: 3, symbolPosition: 'before' },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭', decimals: 3, symbolPosition: 'before' },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: '﷼', flag: '🇴🇲', decimals: 3, symbolPosition: 'before' },
  ILS: { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱', decimals: 2, symbolPosition: 'before' },
  JOD: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', flag: '🇯🇴', decimals: 3, symbolPosition: 'before' },
  LBP: { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', flag: '🇱🇧', decimals: 2, symbolPosition: 'before' },
  EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬', decimals: 2, symbolPosition: 'before' },

  // Africa
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', decimals: 2, symbolPosition: 'before' },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', decimals: 2, symbolPosition: 'before' },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', decimals: 2, symbolPosition: 'before' },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', decimals: 2, symbolPosition: 'before' },
  MAD: { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦', decimals: 2, symbolPosition: 'after' },

  // South America
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', decimals: 2, symbolPosition: 'before' },
  ARS: { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷', decimals: 2, symbolPosition: 'before' },
  CLP: { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱', decimals: 0, symbolPosition: 'before' },
  COP: { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴', decimals: 0, symbolPosition: 'before' },
  PEN: { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪', decimals: 2, symbolPosition: 'before' },
}

// Get currency info by code
export function getCurrencyInfo(code: string): CurrencyInfo {
  return CURRENCIES[code] || CURRENCIES.USD
}

// Format amount with currency
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const currency = getCurrencyInfo(currencyCode)
  
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount)
  
  if (currency.symbolPosition === 'before') {
    return `${currency.symbol}${formattedNumber}`
  } else {
    return `${formattedNumber} ${currency.symbol}`
  }
}

// Get just the currency symbol
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  return getCurrencyInfo(currencyCode).symbol
}

// Get currency options for Select dropdown
export function getCurrencyOptions(): { value: string; label: string }[] {
  return Object.values(CURRENCIES).map(c => ({
    value: c.code,
    label: `${c.flag} ${c.code} - ${c.name}`
  }))
}

// Export as array for easy iteration
export const CURRENCY_LIST = Object.values(CURRENCIES)
