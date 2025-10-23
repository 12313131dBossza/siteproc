/**
 * Date Formatting Utilities (Timezone-Aware)
 * 
 * Re-exports date-fns functions with timezone awareness for Eastern Time (America/New_York).
 * Import from this file instead of 'date-fns' directly to ensure consistent timezone handling.
 * 
 * @example
 * // Before:
 * import { format } from 'date-fns'
 * format(new Date(), 'MMM dd, yyyy')
 * 
 * // After:
 * import { format } from '@/lib/date-format'
 * format(new Date(), 'MMM dd, yyyy') // Automatically in ET
 */

import { format as dateFnsFormat, parseISO, formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns'
import { toZonedTime, format as formatTZ } from 'date-fns-tz'

const TIMEZONE = 'America/New_York'

/**
 * Format a date in Eastern Time
 * Drop-in replacement for date-fns format() that handles timezone conversion
 * 
 * @param date - Date string, Date object, or timestamp
 * @param formatStr - date-fns format string
 * @returns Formatted date string in ET
 */
export function format(
  date: string | Date | number,
  formatStr: string
): string {
  try {
    // Handle null/undefined
    if (!date) return 'N/A'
    
    // Parse string dates
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    
    // Convert to Eastern Time
    const zonedDate = toZonedTime(dateObj, TIMEZONE)
    
    // Format with timezone awareness
    return formatTZ(zonedDate, formatStr, { timeZone: TIMEZONE })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * Compatible with date-fns formatDistanceToNow
 */
export function formatDistanceToNow(
  date: string | Date | number,
  options?: { addSuffix?: boolean }
): string {
  try {
    if (!date) return 'Unknown'
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    return dateFnsFormatDistanceToNow(dateObj, options)
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Unknown'
  }
}

/**
 * Helper: Format date for display (short format)
 */
export function formatDateShort(date: string | Date | number): string {
  return format(date, 'MMM dd, yyyy')
}

/**
 * Helper: Format date with time
 */
export function formatDateTime(date: string | Date | number): string {
  return format(date, 'MMM dd, yyyy h:mm a')
}

/**
 * Helper: Format for input fields (YYYY-MM-DD)
 */
export function formatDateInput(date: string | Date | number): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Helper: Format time only
 */
export function formatTimeOnly(date: string | Date | number): string {
  return format(date, 'h:mm a')
}

// Re-export other date-fns functions that don't need timezone handling
export { parseISO, addDays, subDays, startOfMonth, endOfMonth, isAfter, isBefore, isToday } from 'date-fns'
