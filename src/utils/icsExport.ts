import { ChecklistItem, TimelineMilestone } from '../types';
import { addCalendarDays } from './dateRules';

export interface CalendarEventInput {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  explanation: string;
  extraNotes?: string;
  isRealDeadline?: boolean;
}

function formatIcsDateValue(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function milestoneToCalendarInput(m: TimelineMilestone): CalendarEventInput {
  return {
    id: m.id,
    title: m.title,
    dateStr: m.dateStr,
    explanation: m.explanation,
    extraNotes: m.realDeadlineReason
      ? `Why this is your Real Deadline: ${m.realDeadlineReason}`
      : undefined,
    isRealDeadline: m.isRealDeadline,
  };
}

export function checklistItemToCalendarInput(item: ChecklistItem): CalendarEventInput {
  return {
    id: item.stepKey,
    title: item.title,
    dateStr: item.dueDateStr,
    explanation: item.instruction,
    extraNotes: `Why this matters: ${item.whyThisMatters}\nRule: ${item.ruleCitation}`,
    isRealDeadline: item.isRealDeadline,
  };
}

/**
 * Generates an RFC 5545 compliant .ics calendar string where each event includes:
 * - Milestone / step name (SUMMARY)
 * - Plain-English explanation text (DESCRIPTION)
 * - Reminder 14 days before the date (TRIGGER:-P14D)
 * - Reminder 3 days before the date (TRIGGER:-P3D)
 */
export function generateEventsIcsContent(
  events: CalendarEventInput[],
  studentName?: string
): string {
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//F-1 Compass//OPT and STEM OPT Deadline Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:F-1 Compass Immigration Deadlines',
  ];

  for (const ev of events) {
    if (!ev.dateStr) continue;
    const dtStart = formatIcsDateValue(ev.dateStr);
    const dtEnd = formatIcsDateValue(addCalendarDays(ev.dateStr, 1));
    const summaryPrefix = ev.isRealDeadline ? '[REAL DEADLINE] ' : '[F-1 Compass] ';
    const summary = `${summaryPrefix}${ev.title}`;
    const descParts = [
      ev.explanation,
      ev.extraNotes || '',
      studentName ? `Prepared for: ${studentName}` : '',
      'Reminders configured: 14 days before and 3 days before.',
      'Disclaimer: This tool is for planning only and is not legal advice. Rules can change. Always confirm dates with your school DSO and official USCIS guidance.',
    ].filter(Boolean);

    lines.push(
      'BEGIN:VEVENT',
      `UID:f1-compass-${ev.id}-${dtStart}@local`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(descParts.join('\n\n'))}`,
      'BEGIN:VALARM',
      'TRIGGER:-P14D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder (14 days away): ${escapeIcsText(ev.title)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P3D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Urgent Reminder (3 days away): ${escapeIcsText(ev.title)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function triggerIcsDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds a direct Google Calendar event template URL for an individual milestone or checklist item.
 */
export function buildGoogleCalendarUrl(
  event: CalendarEventInput,
  studentName?: string
): string {
  const dtStart = formatIcsDateValue(event.dateStr);
  const dtEnd = formatIcsDateValue(addCalendarDays(event.dateStr, 1));
  const summaryPrefix = event.isRealDeadline ? '[REAL DEADLINE] ' : '[F-1 Compass] ';
  const title = `${summaryPrefix}${event.title}`;

  const detailsParts = [
    event.explanation,
    event.extraNotes || '',
    'Recommended Calendar Reminders: 14 days before and 3 days before this date.',
    studentName ? `Student: ${studentName}` : '',
    'Disclaimer: This tool is for planning only and is not legal advice. Always confirm dates with your school DSO and official USCIS guidance.',
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: detailsParts.join('\n\n'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadMilestoneIcs(
  milestone: TimelineMilestone,
  studentName?: string
): void {
  const content = generateEventsIcsContent(
    [milestoneToCalendarInput(milestone)],
    studentName
  );
  triggerIcsDownload(content, `f1-compass-${milestone.id}-${milestone.dateStr}.ics`);
}

export function downloadUpcomingMilestonesIcs(
  milestones: TimelineMilestone[],
  studentName?: string
): void {
  if (milestones.length === 0) return;
  const upcoming = milestones.filter((m) => m.daysFromToday >= 0);
  const targetList = upcoming.length > 0 ? upcoming : milestones;
  const content = generateEventsIcsContent(
    targetList.map(milestoneToCalendarInput),
    studentName
  );
  triggerIcsDownload(content, 'f1-compass-upcoming-deadlines.ics');
}

export function downloadChecklistItemIcs(
  item: ChecklistItem,
  studentName?: string
): void {
  const content = generateEventsIcsContent(
    [checklistItemToCalendarInput(item)],
    studentName
  );
  triggerIcsDownload(content, `f1-compass-${item.stepKey}-${item.dueDateStr}.ics`);
}

export function downloadUpcomingChecklistIcs(
  items: ChecklistItem[],
  studentName?: string
): void {
  if (items.length === 0) return;
  const upcoming = items.filter((i) => i.daysFromToday >= 0);
  const targetList = upcoming.length > 0 ? upcoming : items;
  const content = generateEventsIcsContent(
    targetList.map(checklistItemToCalendarInput),
    studentName
  );
  triggerIcsDownload(content, 'f1-compass-upcoming-checklist.ics');
}
