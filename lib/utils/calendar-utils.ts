import { addDays, addWeeks, addMonths, parseISO, format, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { CalendarEvent, RecurrencePattern } from '@/types';

/**
 * Generate array of ISO date strings for recurring events
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @param pattern - Recurrence pattern (daily, weekly, monthly)
 * @param maxOccurrences - Maximum number of occurrences (default: 365)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateRecurringDates(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern,
  maxOccurrences: number = 365
): string[] {
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let currentDate = start;
  let count = 0;

  while (currentDate <= end && count < maxOccurrences) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    count++;

    switch (pattern) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      default:
        // If pattern is not recognized, break the loop
        return dates;
    }
  }

  return dates;
}

/**
 * Calculate total occurrences for a recurring event
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @param pattern - Recurrence pattern
 * @returns Total number of occurrences
 */
export function calculateOccurrences(
  startDate: string,
  endDate: string,
  pattern: RecurrencePattern
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let occurrences = 0;

  switch (pattern) {
    case 'daily':
      occurrences = differenceInDays(end, start);
      break;
    case 'weekly':
      occurrences = differenceInWeeks(end, start);
      break;
    case 'monthly':
      occurrences = differenceInMonths(end, start);
      break;
    default:
      return 0;
  }

  // Include the start date
  return occurrences + 1;
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns true if valid or empty, false otherwise
 */
export function isValidUrl(url: string): boolean {
  // Empty or null URLs are valid (optional field)
  if (!url || url.trim() === '') {
    return true;
  }

  try {
    const urlObject = new URL(url);
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format calendar event for display in calendar component
 * @param event - Calendar event object
 * @returns Formatted event object with Date objects
 */
export function formatEventForCalendar(event: CalendarEvent) {
  const eventDate = parseISO(event.event_date);

  // If event_time exists, parse and set the time
  if (event.event_time) {
    const [hours, minutes] = event.event_time.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);
  }

  return {
    id: event.id,
    title: event.title,
    start: eventDate,
    end: eventDate, // Same as start for single events
    allDay: !event.event_time,
    resource: event,
  };
}

/**
 * Validate recurring date range
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @param maxDurationDays - Maximum duration in days (default: 365)
 * @returns Validation result object
 */
export function validateRecurringDateRange(
  startDate: string,
  endDate: string,
  maxDurationDays: number = 365
): { valid: boolean; error?: string } {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Check if end date is after start date
    if (end <= start) {
      return {
        valid: false,
        error: 'End date must be after start date',
      };
    }

    // Check if duration exceeds maximum
    const duration = differenceInDays(end, start);
    if (duration > maxDurationDays) {
      return {
        valid: false,
        error: `Date range cannot exceed ${maxDurationDays} days`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid date format',
    };
  }
}
