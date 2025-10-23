/**
 * Timezone Utilities
 * 
 * U.S. Construction Industry Standard: America/New_York (Eastern Time)
 * 
 * All dates in the app should be displayed in ET, regardless of user's local timezone.
 * This ensures consistency across construction sites, especially for:
 * - Delivery schedules
 * - Order timestamps
 * - Project deadlines
 * - Activity logs
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { toZonedTime, format as formatTZ } from 'date-fns-tz'

const CONSTRUCTION_TIMEZONE = 'America/New_York'

/**
 * Formats a date in Eastern Time
 * 
 * @param date - Date string, Date object, or timestamp
 * @param formatString - date-fns format string (default: 'MMM dd, yyyy h:mm a')
 * @returns Formatted date string in ET
 * 
 * @example
 * formatInNYTime('2025-10-23T14:30:00Z', 'MMM dd, yyyy')
 * // => "Oct 23, 2025" (Eastern Time)
 * 
 * formatInNYTime(new Date(), 'h:mm a')
 * // => "10:30 AM" (Eastern Time)
 */
export function formatInNYTime(
  date: string | Date | number,
  formatString: string = 'MMM dd, yyyy h:mm a'
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    
    // Convert to Eastern Time zone
    const zonedDate = toZonedTime(dateObj, CONSTRUCTION_TIMEZONE)
    
    // Format with timezone-aware formatter
    return formatTZ(zonedDate, formatString, { timeZone: CONSTRUCTION_TIMEZONE })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

/**
 * Formats a date for short display (no time)
 * 
 * @example
 * formatDateShort('2025-10-23T14:30:00Z')
 * // => "Oct 23, 2025"
 */
export function formatDateShort(date: string | Date | number): string {
  return formatInNYTime(date, 'MMM dd, yyyy')
}

/**
 * Formats a date with time
 * 
 * @example
 * formatDateTime('2025-10-23T14:30:00Z')
 * // => "Oct 23, 2025 2:30 PM"
 */
export function formatDateTime(date: string | Date | number): string {
  return formatInNYTime(date, 'MMM dd, yyyy h:mm a')
}

/**
 * Formats a date for input fields (YYYY-MM-DD)
 * 
 * @example
 * formatDateInput(new Date())
 * // => "2025-10-23"
 */
export function formatDateInput(date: string | Date | number): string {
  return formatInNYTime(date, 'yyyy-MM-dd')
}

/**
 * Formats time only (no date)
 * 
 * @example
 * formatTimeOnly('2025-10-23T14:30:00Z')
 * // => "2:30 PM"
 */
export function formatTimeOnly(date: string | Date | number): string {
  return formatInNYTime(date, 'h:mm a')
}

/**
 * Formats relative time ("2 hours ago", "in 3 days")
 * 
 * @example
 * formatRelativeTime('2025-10-23T12:00:00Z')
 * // => "2 hours ago"
 */
export function formatRelativeTime(date: string | Date | number): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return 'Unknown'
  }
}

/**
 * Formats date for reports/exports (ISO-style but readable)
 * 
 * @example
 * formatReportDate('2025-10-23T14:30:00Z')
 * // => "2025-10-23 14:30 ET"
 */
export function formatReportDate(date: string | Date | number): string {
  return formatInNYTime(date, 'yyyy-MM-dd HH:mm') + ' ET'
}

/**
 * Gets current time in Eastern Time
 * 
 * @returns Current date/time as Date object in ET
 */
export function getCurrentNYTime(): Date {
  return toZonedTime(new Date(), CONSTRUCTION_TIMEZONE)
}

/**
 * Converts a date to ET and returns ISO string
 * Useful for API requests that need ET timestamps
 * 
 * @example
 * toNYTimeISO(new Date())
 * // => "2025-10-23T14:30:00-04:00"
 */
export function toNYTimeISO(date: string | Date | number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
  const zonedDate = toZonedTime(dateObj, CONSTRUCTION_TIMEZONE)
  return zonedDate.toISOString()
}

/**
 * Checks if a date is today (in Eastern Time)
 * 
 * @example
 * isToday('2025-10-23T14:30:00Z')
 * // => true (if today is Oct 23, 2025 ET)
 */
export function isToday(date: string | Date | number): boolean {
  const dateStr = formatDateInput(date)
  const todayStr = formatDateInput(getCurrentNYTime())
  return dateStr === todayStr
}

/**
 * Formats age in days from a date
 * 
 * @example
 * getAgeDays('2025-10-15T00:00:00Z')
 * // => 8 (if today is Oct 23, 2025)
 */
export function getAgeDays(date: string | Date | number): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date)
    const now = getCurrentNYTime()
    const diffMs = now.getTime() - dateObj.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  } catch (error) {
    console.error('Error calculating age:', error)
    return 0
  }
}

/**
 * Formats business hours notice
 * Shows if outside typical construction hours (7 AM - 6 PM ET)
 */
export function getBusinessHoursNotice(): string | null {
  const now = getCurrentNYTime()
  const hour = now.getHours()
  
  if (hour < 7) {
    return 'Before business hours (7 AM - 6 PM ET)'
  } else if (hour >= 18) {
    return 'After business hours (7 AM - 6 PM ET)'
  }
  
  return null
}

/**
 * Export timezone constant for reference
 */
export const TIMEZONE = CONSTRUCTION_TIMEZONE
export const TIMEZONE_ABBR = 'ET' // Eastern Time (handles both EST and EDT automatically)
