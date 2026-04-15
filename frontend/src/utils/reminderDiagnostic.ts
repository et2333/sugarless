/**
 * Frontend utility functions for diagnosing reminder issues
 * No backend API support required
 */

export interface ReminderDiagnosticResult {
  isActive: boolean;
  scheduleTime: string;
  currentTime: string;
  timeMatches: boolean;
  scheduleType: string;
  daysOfWeek: number[];
  currentDayOfWeek: number;
  isDayIncluded: boolean;
  startDate: Date;
  endDate: Date | null;
  isInDateRange: boolean;
  shouldTrigger: boolean;
  suggestion: string;
}

export function diagnoseReminder(reminder: any): ReminderDiagnosticResult {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Convert to 1-7 (Monday to Sunday)
  const today = now.toISOString().split('T')[0];
  
  // Parse daysOfWeek
  let daysOfWeek: number[] = [];
  try {
    if (typeof reminder.daysOfWeek === 'string') {
      daysOfWeek = JSON.parse(reminder.daysOfWeek);
    } else if (Array.isArray(reminder.daysOfWeek)) {
      daysOfWeek = reminder.daysOfWeek;
    }
  } catch (e) {
    console.error('Failed to parse daysOfWeek:', e);
    daysOfWeek = [];
  }
  
  // Check various conditions
  const isActive = reminder.isActive ?? true;
  const scheduleTime = reminder.scheduleTime || reminder.time || '00:00';
  const timeMatches = scheduleTime === currentTime;
  const scheduleType = reminder.scheduleType || 'daily';
  const startDate = new Date(reminder.startDate || now);
  const endDate = reminder.endDate ? new Date(reminder.endDate) : null;
  const isInDateRange = startDate <= now && (!endDate || endDate >= now);
  
  // Check if day of week matches
  let isDayIncluded = false;
  if (scheduleType === 'daily') {
    isDayIncluded = daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek);
  } else if (scheduleType === 'weekly') {
    isDayIncluded = daysOfWeek.includes(dayOfWeek);
  } else if (scheduleType === 'once') {
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    isDayIncluded = startDateStr === today;
  }
  
  // Determine if should trigger
  const shouldTrigger = isActive && timeMatches && isInDateRange && isDayIncluded;
  
  // Generate suggestion
  let suggestion = '';
  if (!isActive) {
    suggestion = '❌ Reminder is not active, please enable it first';
  } else if (!timeMatches) {
    suggestion = `⏰ Current time ${currentTime} does not match reminder time ${scheduleTime}`;
  } else if (!isInDateRange) {
    suggestion = '📅 Current date is not within the reminder\'s valid date range';
  } else if (!isDayIncluded) {
    if (scheduleType === 'once') {
      suggestion = `📅 This is a one-time reminder, start date is ${startDate.toLocaleDateString()}, not today`;
    } else {
      suggestion = `📅 Today (Day ${dayOfWeek}) is not in the reminder's repeat days. Configured days: ${daysOfWeek.join(', ')}`;
    }
  } else {
    suggestion = '✅ Reminder configuration is normal, should be able to trigger';
  }
  
  return {
    isActive,
    scheduleTime,
    currentTime,
    timeMatches,
    scheduleType,
    daysOfWeek,
    currentDayOfWeek: dayOfWeek,
    isDayIncluded,
    startDate,
    endDate,
    isInDateRange,
    shouldTrigger,
    suggestion
  };
}

/**
 * Print diagnostic information in browser console
 */
export function printDiagnostic(reminder: any) {
  const result = diagnoseReminder(reminder);
  
  console.group('🔍 Reminder Diagnostic Results');
  console.log('Reminder ID:', reminder.id);
  console.log('Reminder Title:', reminder.title);
  console.log('---');
  console.log('✓ Active Status:', result.isActive ? '✓ Yes' : '✗ No');
  console.log('✓ Time Match:', result.timeMatches ? '✓ Yes' : '✗ No', `(Scheduled: ${result.scheduleTime}, Current: ${result.currentTime})`);
  console.log('✓ Date Range:', result.isInDateRange ? '✓ Yes' : '✗ No');
  console.log('✓ Day Match:', result.isDayIncluded ? '✓ Yes' : '✗ No', `(Configured: [${result.daysOfWeek.join(', ')}], Today: ${result.currentDayOfWeek})`);
  console.log('---');
  console.log('🎯 Should Trigger:', result.shouldTrigger ? '✓ Yes' : '✗ No');
  console.log('💡 Suggestion:', result.suggestion);
  console.groupEnd();
  
  return result;
}
