import {
  StudentProfile,
  TimelineMilestone,
  MilestoneStatus,
  ValidationIssue,
  RealDeadlineSummary,
  UnemploymentSummary,
  FilingWindowClosedAlert,
} from '../types';

/**
 * Parses a YYYY-MM-DD string into a local Date anchored at 12:00:00 PM
 * to eliminate UTC midnight off-by-one shifts and DST transition bugs.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return null;
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/**
 * Formats a Date object back into YYYY-MM-DD local string.
 */
export function toDateInputString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date anchored at 12:00:00 PM local time.
 */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

/**
 * Adds a specified number of calendar days to a date string (YYYY-MM-DD)
 * and returns a new YYYY-MM-DD string.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const dt = parseLocalDate(dateStr);
  if (!dt) return '';
  const target = new Date(
    dt.getFullYear(),
    dt.getMonth(),
    dt.getDate() + days,
    12,
    0,
    0,
    0
  );
  return toDateInputString(target);
}

/**
 * Calculates calendar day difference: (targetDate - baseDate) in whole days.
 */
export function diffCalendarDays(targetDateStr: string, baseDateStr?: string): number {
  const target = parseLocalDate(targetDateStr);
  const base = baseDateStr ? parseLocalDate(baseDateStr) : getTodayLocal();
  if (!target || !base) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

/**
 * Formats a YYYY-MM-DD string into a readable date like "May 15, 2027".
 */
export function formatDisplayDate(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  if (!dt) return 'Invalid date';
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates the standard USCIS EAD end date from an EAD start date:
 * - Initial Post-Completion OPT (hasStemI20 = false): (Start Date + 1 calendar year) - 1 day
 * - 24-Month STEM OPT (hasStemI20 = true): (Start Date + 2 calendar years) - 1 day
 * Handles leap years (such as 2028) accurately in local calendar time.
 */
export function calculateSuggestedEadEndDate(
  startDateStr: string,
  hasStemI20 = false
): string {
  const dt = parseLocalDate(startDateStr);
  if (!dt) return '';
  const yearsToAdd = hasStemI20 ? 2 : 1;
  const target = new Date(
    dt.getFullYear() + yearsToAdd,
    dt.getMonth(),
    dt.getDate() - 1,
    12,
    0,
    0,
    0
  );
  return toDateInputString(target);
}

const MONTH_NAME_LOOKUP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Parses flexible user keyboard input into a validated YYYY-MM-DD string.
 * Supports:
 * - "YYYY-MM-DD" or "YYYY/MM/DD" (e.g. "2027-02-01")
 * - "MM/DD/YYYY" or "M/D/YYYY" or "MM-DD-YYYY" (e.g. "02/01/2027", "2/1/2027")
 * - "MMM D, YYYY" or "MMMM D, YYYY" (e.g. "Oct 9, 2026", "February 1 2027")
 * Requires a full 4-digit year (1990–2099) so partial typing never fires prematurely.
 */
export function parseFlexibleUserDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (y >= 1990 && y <= 2099) {
      const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return parseLocalDate(candidate) ? candidate : null;
    }
    return null;
  }

  // 2. MM/DD/YYYY or M/D/YYYY or MM-DD-YYYY
  const usMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (usMatch) {
    const m = Number(usMatch[1]);
    const d = Number(usMatch[2]);
    const y = Number(usMatch[3]);
    if (y >= 1990 && y <= 2099) {
      const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return parseLocalDate(candidate) ? candidate : null;
    }
    return null;
  }

  // 3. "Oct 9, 2026" or "October 9 2026"
  const namedMonthFirst = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMonthFirst) {
    const m = MONTH_NAME_LOOKUP[namedMonthFirst[1].toLowerCase()];
    const d = Number(namedMonthFirst[2]);
    const y = Number(namedMonthFirst[3]);
    if (m && y >= 1990 && y <= 2099) {
      const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return parseLocalDate(candidate) ? candidate : null;
    }
    return null;
  }

  // 4. "9 Oct 2026"
  const dayFirstNamed = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (dayFirstNamed) {
    const d = Number(dayFirstNamed[1]);
    const m = MONTH_NAME_LOOKUP[dayFirstNamed[2].toLowerCase()];
    const y = Number(dayFirstNamed[3]);
    if (m && y >= 1990 && y <= 2099) {
      const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return parseLocalDate(candidate) ? candidate : null;
    }
    return null;
  }

  return null;
}

/**
 * Formats countdown string ("in 42 days", "today", "passed 3 days ago").
 */
export function formatCountdown(daysFromToday: number): string {
  if (daysFromToday === 0) return 'today';
  if (daysFromToday === 1) return 'in 1 day';
  if (daysFromToday > 1) return `in ${daysFromToday} days`;
  if (daysFromToday === -1) return 'passed 1 day ago';
  return `passed ${Math.abs(daysFromToday)} days ago`;
}

/**
 * Determines semantic color status per specification:
 * - gray: passed (daysFromToday < 0)
 * - red: within 7 days (0 <= daysFromToday <= 7) OR is the Real Deadline
 * - amber: within 30 days (7 < daysFromToday <= 30)
 * - green: more than 30 days away (daysFromToday > 30)
 */
export function computeMilestoneStatus(
  daysFromToday: number,
  isRealDeadline: boolean
): { status: MilestoneStatus; statusLabel: string } {
  if (daysFromToday < 0) {
    return {
      status: 'gray',
      statusLabel: isRealDeadline ? 'Passed · Real Deadline' : 'Passed',
    };
  }
  if (isRealDeadline) {
    return {
      status: 'red',
      statusLabel: daysFromToday <= 7 ? 'Real Deadline · Urgent' : 'Real Deadline',
    };
  }
  if (daysFromToday <= 7) {
    return {
      status: 'red',
      statusLabel: daysFromToday === 0 ? 'Due Today · Within 7d' : 'Urgent · Within 7d',
    };
  }
  if (daysFromToday <= 30) {
    return {
      status: 'amber',
      statusLabel: 'Approaching · Within 30d',
    };
  }
  return {
    status: 'green',
    statusLabel: 'On Track · >30d Away',
  };
}

/**
 * Validates the student profile for invalid date combinations.
 */
export function validateProfile(profile: StudentProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!profile.programEndDate) {
    issues.push({
      field: 'programEndDate',
      severity: 'error',
      message: 'Program end date from your Form I-20 is required to calculate your OPT timeline.',
    });
    return issues;
  }

  const progEnd = parseLocalDate(profile.programEndDate);
  if (!progEnd) {
    issues.push({
      field: 'programEndDate',
      severity: 'error',
      message: 'Please enter a valid Program End Date.',
    });
    return issues;
  }

  const optOpenStr = addCalendarDays(profile.programEndDate, -90);
  const optCloseStr = addCalendarDays(profile.programEndDate, 60);
  const optCloseDaysFromToday = diffCalendarDays(optCloseStr);
  const hasActiveEad = Boolean(profile.eadStartDate && profile.eadEndDate);

  // Warn immediately on the setup form if the 60-day OPT filing window has already closed and no EAD is entered
  if (optCloseDaysFromToday < 0 && !hasActiveEad) {
    issues.push({
      field: 'programEndDate',
      severity: 'warning',
      message: `Your 60-day post-completion OPT filing window and grace period closed on ${formatDisplayDate(optCloseStr)} (${formatCountdown(optCloseDaysFromToday)}). Contact your school's DSO immediately to discuss your status.`,
    });
  }

  // Validate OPT I-20 issue date if provided
  if (profile.optI20IssueDate) {
    const optI20 = parseLocalDate(profile.optI20IssueDate);
    if (!optI20) {
      issues.push({
        field: 'optI20IssueDate',
        severity: 'error',
        message: 'OPT Recommendation I-20 date is not a valid calendar date.',
      });
    } else {
      const daysAfterClose = diffCalendarDays(profile.optI20IssueDate, optCloseStr);
      const daysBeforeOpen = diffCalendarDays(optOpenStr, profile.optI20IssueDate);
      if (daysAfterClose > 0) {
        issues.push({
          field: 'optI20IssueDate',
          severity: 'error',
          message: `OPT I-20 issue date (${formatDisplayDate(profile.optI20IssueDate)}) cannot be after your 60-day post-graduation filing window closes (${formatDisplayDate(optCloseStr)}).`,
        });
      } else if (daysBeforeOpen > 30) {
        issues.push({
          field: 'optI20IssueDate',
          severity: 'warning',
          message: `Note: Your OPT I-20 issue date is more than 30 days before the 90-day OPT filing window opens (${formatDisplayDate(optOpenStr)}). Confirm this date with your DSO.`,
        });
      }
    }
  }

  // Validate EAD Start and End dates if provided
  if (profile.eadStartDate && !profile.eadEndDate) {
    issues.push({
      field: 'eadEndDate',
      severity: 'warning',
      message: 'Enter your OPT EAD end date as well so F-1 Compass can calculate your STEM OPT or post-OPT grace window.',
    });
  }
  if (!profile.eadStartDate && profile.eadEndDate) {
    issues.push({
      field: 'eadStartDate',
      severity: 'warning',
      message: 'Enter your OPT EAD start date to track your unemployment counter accurately.',
    });
  }

  if (profile.eadStartDate && profile.eadEndDate) {
    const startDt = parseLocalDate(profile.eadStartDate);
    const endDt = parseLocalDate(profile.eadEndDate);
    if (!startDt || !endDt) {
      issues.push({
        field: 'eadEndDate',
        severity: 'error',
        message: 'Please enter valid OPT EAD start and end dates.',
      });
    } else {
      const diff = diffCalendarDays(profile.eadEndDate, profile.eadStartDate);
      if (diff <= 0) {
        issues.push({
          field: 'eadEndDate',
          severity: 'error',
          message: 'OPT EAD end date must be after the OPT EAD start date.',
        });
      }
      const diffFromProgEnd = diffCalendarDays(profile.eadStartDate, profile.programEndDate);
      if (diffFromProgEnd < 0) {
        issues.push({
          field: 'eadStartDate',
          severity: 'warning',
          message: `Post-completion OPT EAD start date (${formatDisplayDate(profile.eadStartDate)}) is earlier than your Program End Date (${formatDisplayDate(profile.programEndDate)}). Post-completion OPT must start after program completion.`,
        });
      } else if (diffFromProgEnd > 60) {
        issues.push({
          field: 'eadStartDate',
          severity: 'warning',
          message: `Requested OPT EAD start date is more than 60 days after your Program End Date (${formatDisplayDate(optCloseStr)}). Unless delayed by USCIS processing, requested start dates must fall within the 60-day grace period.`,
        });
      }
    }
  }

  // Validate STEM OPT I-20 date if provided (and student is not Non-STEM)
  if (profile.stemI20IssueDate && profile.stemStatus !== 'no') {
    const stemI20 = parseLocalDate(profile.stemI20IssueDate);
    if (!stemI20) {
      issues.push({
        field: 'stemI20IssueDate',
        severity: 'error',
        message: 'Please enter a valid STEM OPT I-20 issue date.',
      });
    } else if (!profile.eadEndDate) {
      issues.push({
        field: 'eadEndDate',
        severity: 'error',
        message: 'OPT EAD end date is required when a STEM OPT I-20 issue date is entered.',
      });
    } else {
      const afterEadEnd = diffCalendarDays(profile.stemI20IssueDate, profile.eadEndDate);
      if (afterEadEnd > 0) {
        issues.push({
          field: 'stemI20IssueDate',
          severity: 'error',
          message: `STEM OPT I-20 issue date (${formatDisplayDate(profile.stemI20IssueDate)}) cannot be after your current OPT EAD expires (${formatDisplayDate(profile.eadEndDate)}).`,
        });
      }
    }
  }

  return issues;
}

/**
 * Computes all timeline milestones, Real Deadlines, Closed Window alerts, and the most urgent Next Step
 * based on the 6 USCIS rules.
 */
export function calculateTimeline(profile: StudentProfile): {
  milestones: TimelineMilestone[];
  nextStep: TimelineMilestone | null;
  realDeadlines: RealDeadlineSummary[];
  filingWindowClosedAlert: FilingWindowClosedAlert | null;
} {
  if (!profile.programEndDate || !parseLocalDate(profile.programEndDate)) {
    return {
      milestones: [],
      nextStep: null,
      realDeadlines: [],
      filingWindowClosedAlert: null,
    };
  }

  const milestones: TimelineMilestone[] = [];
  const realDeadlines: RealDeadlineSummary[] = [];
  let filingWindowClosedAlert: FilingWindowClosedAlert | null = null;

  const hasActiveEad = Boolean(profile.eadStartDate && profile.eadEndDate);

  // Rule 1: Post-completion OPT filing window opens 90 days before program end date
  const optOpenStr = addCalendarDays(profile.programEndDate, -90);
  const optOpenDays = diffCalendarDays(optOpenStr);
  const optOpenStatus = computeMilestoneStatus(optOpenDays, false);

  milestones.push({
    id: 'opt-window-open',
    title: 'Post-Completion OPT Filing Window Opens',
    dateStr: optOpenStr,
    dateFormatted: formatDisplayDate(optOpenStr),
    daysFromToday: optOpenDays,
    countdownText: formatCountdown(optOpenDays),
    status: optOpenStatus.status,
    statusLabel: optOpenStatus.statusLabel,
    category: 'opt',
    explanation:
      'Earliest date USCIS will accept your Form I-765 for post-completion OPT (90 days before your program end date).',
    isRealDeadline: false,
    actionRequired: true,
  });

  // Program End Date milestone
  const progEndDays = diffCalendarDays(profile.programEndDate);
  const progEndStatus = computeMilestoneStatus(progEndDays, false);
  const graceStartStr = addCalendarDays(profile.programEndDate, 1);
  const graceEndStr = addCalendarDays(profile.programEndDate, 60);

  milestones.push({
    id: 'program-end-date',
    title: 'Program End Date & 60-Day Grace Period Begins',
    dateStr: profile.programEndDate,
    dateFormatted: formatDisplayDate(profile.programEndDate),
    daysFromToday: progEndDays,
    countdownText: formatCountdown(progEndDays),
    status: progEndStatus.status,
    statusLabel: progEndStatus.statusLabel,
    category: 'grace',
    explanation: `Your academic program ends and your 60-day grace period (${formatDisplayDate(graceStartStr)} to ${formatDisplayDate(graceEndStr)}) begins; your requested OPT start date must fall within this window.`,
    isRealDeadline: false,
    actionRequired: false,
  });

  // Rule 2 & Rule 3: Post-completion OPT filing window closes (60 days after program end)
  // vs. 30 days after OPT Recommendation I-20 issue date
  const opt60CloseStr = addCalendarDays(profile.programEndDate, 60);
  const opt60CloseDays = diffCalendarDays(opt60CloseStr);

  // Check if the 60-day post-graduation OPT filing window has already closed and the student has no EAD card (Scenario 3)
  if (opt60CloseDays < 0 && !hasActiveEad) {
    filingWindowClosedAlert = {
      isClosed: true,
      title: 'Post-Completion OPT Filing Window & 60-Day Grace Period Have Closed',
      closedDateFormatted: formatDisplayDate(opt60CloseStr),
      daysSinceClosed: Math.abs(opt60CloseDays),
      countdownText: formatCountdown(opt60CloseDays),
      explanation: `Your program end date (${formatDisplayDate(profile.programEndDate)}) was ${Math.abs(progEndDays)} days ago, and both your 60-day post-completion OPT filing window and your 60-day grace period closed on ${formatDisplayDate(opt60CloseStr)} (${formatCountdown(opt60CloseDays)}).`,
      recommendation:
        'USCIS does not accept Post-Completion OPT applications received more than 60 days after your program end date. Contact your school’s DSO immediately (and consult an immigration attorney if needed) to review your SEVIS record and available options.',
    };
  }

  if (profile.optI20IssueDate && parseLocalDate(profile.optI20IssueDate)) {
    const i20Plus30Str = addCalendarDays(profile.optI20IssueDate, 30);
    const i20Plus30Days = diffCalendarDays(i20Plus30Str);

    const diffBetween = diffCalendarDays(i20Plus30Str, opt60CloseStr);
    const isI20EarlierOrEqual = diffBetween <= 0;

    // Also check if the 30-day OPT I-20 clock expired while the 60-day window is still open
    if (i20Plus30Days < 0 && opt60CloseDays >= 0 && !hasActiveEad) {
      filingWindowClosedAlert = {
        isClosed: true,
        title: 'Your 30-Day OPT I-20 Endorsement Has Expired — Request a New I-20 Immediately',
        closedDateFormatted: formatDisplayDate(i20Plus30Str),
        daysSinceClosed: Math.abs(i20Plus30Days),
        countdownText: formatCountdown(i20Plus30Days),
        explanation: `More than 30 days have passed since your OPT I-20 was issued on ${formatDisplayDate(profile.optI20IssueDate)} (30-day deadline ${formatDisplayDate(i20Plus30Str)} ${formatCountdown(i20Plus30Days)}). Do not mail or submit an expired OPT I-20 to USCIS.`,
        recommendation: `Because your 60-day post-graduation window (${formatDisplayDate(opt60CloseStr)}) is still open for ${opt60CloseDays} more days, contact your DSO immediately to request a newly endorsed OPT I-20 before filing.`,
      };
    }

    if (isI20EarlierOrEqual) {
      const i20Status = computeMilestoneStatus(i20Plus30Days, true);
      const reasonText =
        diffBetween === 0
          ? `Both your 30-day DSO I-20 window and your 60-day post-graduation window end on ${formatDisplayDate(i20Plus30Str)}.`
          : `Your 30-day DSO I-20 deadline (${formatDisplayDate(i20Plus30Str)}) comes ${Math.abs(diffBetween)} days earlier than the 60-day post-graduation cutoff (${formatDisplayDate(opt60CloseStr)}). USCIS rejects applications received more than 30 days after the DSO recommendation date.`;

      milestones.push({
        id: 'opt-i20-30day-deadline',
        title: 'Real Deadline: USCIS Must Receive OPT Application (30-Day I-20 Rule)',
        dateStr: i20Plus30Str,
        dateFormatted: formatDisplayDate(i20Plus30Str),
        daysFromToday: i20Plus30Days,
        countdownText: formatCountdown(i20Plus30Days),
        status: i20Status.status,
        statusLabel: i20Status.statusLabel,
        category: 'opt',
        explanation: `USCIS must receive your OPT application within 30 days of your ${formatDisplayDate(profile.optI20IssueDate)} OPT I-20 issue date—this is your Real Deadline because it arrives earlier than your 60-day post-graduation limit.`,
        isRealDeadline: true,
        realDeadlineReason: reasonText,
        actionRequired: true,
      });

      const close60Status = computeMilestoneStatus(opt60CloseDays, false);
      milestones.push({
        id: 'opt-window-close-60',
        title: '60-Day Post-Graduation Window Ends & Grace Period Closes',
        dateStr: opt60CloseStr,
        dateFormatted: formatDisplayDate(opt60CloseStr),
        daysFromToday: opt60CloseDays,
        countdownText: formatCountdown(opt60CloseDays),
        status: close60Status.status,
        statusLabel: close60Status.statusLabel,
        category: 'grace',
        explanation:
          'Final day of your 60-day post-graduation grace period and latest possible requested OPT start date (superseded for OPT filing by your earlier 30-day I-20 deadline).',
        isRealDeadline: false,
        supersededByRealDeadline: true,
        actionRequired: false,
      });

      realDeadlines.push({
        type: 'opt',
        title: 'Post-Completion OPT Filing Real Deadline',
        realDateStr: i20Plus30Str,
        realDateFormatted: formatDisplayDate(i20Plus30Str),
        daysFromToday: i20Plus30Days,
        countdownText: formatCountdown(i20Plus30Days),
        winningRule: '30-Day OPT I-20 Recommendation Rule',
        otherRuleDateFormatted: formatDisplayDate(opt60CloseStr),
        explanation: reasonText,
      });
    } else {
      const close60Status = computeMilestoneStatus(opt60CloseDays, true);
      const reasonText = `Your 60-day post-graduation cutoff (${formatDisplayDate(opt60CloseStr)}) comes ${Math.abs(diffBetween)} days earlier than 30 days after your OPT I-20 issue date (${formatDisplayDate(i20Plus30Str)}). USCIS never accepts post-completion OPT applications after the 60th day following program completion.`;

      milestones.push({
        id: 'opt-window-close-60',
        title: 'Real Deadline: Post-Completion OPT Window & 60-Day Grace Period Closes',
        dateStr: opt60CloseStr,
        dateFormatted: formatDisplayDate(opt60CloseStr),
        daysFromToday: opt60CloseDays,
        countdownText: formatCountdown(opt60CloseDays),
        status: close60Status.status,
        statusLabel: close60Status.statusLabel,
        category: 'opt',
        explanation: `Final day USCIS can receive your OPT application and end of your 60-day grace period—this is your Real Deadline because it arrives earlier than 30 days from your ${formatDisplayDate(profile.optI20IssueDate)} I-20 issue date.`,
        isRealDeadline: true,
        realDeadlineReason: reasonText,
        actionRequired: true,
      });

      realDeadlines.push({
        type: 'opt',
        title: 'Post-Completion OPT Filing Real Deadline',
        realDateStr: opt60CloseStr,
        realDateFormatted: formatDisplayDate(opt60CloseStr),
        daysFromToday: opt60CloseDays,
        countdownText: formatCountdown(opt60CloseDays),
        winningRule: '60-Day Post-Graduation Filing Rule',
        otherRuleDateFormatted: formatDisplayDate(i20Plus30Str),
        explanation: reasonText,
      });
    }
  } else {
    const close60Status = computeMilestoneStatus(opt60CloseDays, true);
    const reasonText =
      'Because you have not entered an OPT Recommendation I-20 issue date yet, your outer statutory cutoff is 60 days after your program end date. Remember: once your DSO issues your OPT I-20, USCIS must receive your application within 30 days of that issue date or by this 60-day cutoff, whichever comes first.';

    milestones.push({
      id: 'opt-window-close-60',
      title: 'Real Deadline: Post-Completion OPT Filing Window & 60-Day Grace Period Closes',
      dateStr: opt60CloseStr,
      dateFormatted: formatDisplayDate(opt60CloseStr),
      daysFromToday: opt60CloseDays,
      countdownText: formatCountdown(opt60CloseDays),
      status: close60Status.status,
      statusLabel: close60Status.statusLabel,
      category: 'opt',
      explanation:
        'Latest possible date USCIS can receive your OPT application (60 days after program end date) and final day of your 60-day grace period and requested OPT start date window.',
      isRealDeadline: true,
      realDeadlineReason: reasonText,
      actionRequired: true,
    });

    realDeadlines.push({
      type: 'opt',
      title: 'Post-Completion OPT Outer Filing Deadline',
      realDateStr: opt60CloseStr,
      realDateFormatted: formatDisplayDate(opt60CloseStr),
      daysFromToday: opt60CloseDays,
      countdownText: formatCountdown(opt60CloseDays),
      winningRule: '60-Day Post-Graduation Rule (No I-20 Date Entered Yet)',
      otherRuleDateFormatted: 'Add OPT I-20 date to check 30-day limit',
      explanation: reasonText,
    });
  }

  // Optional EAD Start Date milestone
  if (profile.eadStartDate && parseLocalDate(profile.eadStartDate)) {
    const eadStartDays = diffCalendarDays(profile.eadStartDate);
    const eadStartStatus = computeMilestoneStatus(eadStartDays, false);
    milestones.push({
      id: 'opt-ead-start',
      title: 'OPT EAD Employment Authorization Starts',
      dateStr: profile.eadStartDate,
      dateFormatted: formatDisplayDate(profile.eadStartDate),
      daysFromToday: eadStartDays,
      countdownText: formatCountdown(eadStartDays),
      status: eadStartStatus.status,
      statusLabel: eadStartStatus.statusLabel,
      category: 'opt',
      explanation:
        'First day you are authorized to work on Post-Completion OPT and the date your 90-day unemployment clock starts running.',
      isRealDeadline: false,
      actionRequired: false,
    });
  }

  // Rule 5: If OPT EAD dates are entered, calculate EAD end and STEM OPT windows
  if (profile.eadEndDate && parseLocalDate(profile.eadEndDate)) {
    const eadEndDays = diffCalendarDays(profile.eadEndDate);
    const showStemWindow = profile.stemStatus === 'yes' || profile.stemStatus === 'unsure';
    const isConditionalStem = profile.stemStatus === 'unsure';

    if (showStemWindow) {
      const stemOpenStr = addCalendarDays(profile.eadEndDate, -90);
      const stemOpenDays = diffCalendarDays(stemOpenStr);
      const stemOpenStatus = computeMilestoneStatus(stemOpenDays, false);

      milestones.push({
        id: 'stem-window-open',
        title: isConditionalStem
          ? 'Conditional STEM OPT Filing Window Opens (If STEM-Eligible)'
          : '24-Month STEM OPT Filing Window Opens',
        dateStr: stemOpenStr,
        dateFormatted: formatDisplayDate(stemOpenStr),
        daysFromToday: stemOpenDays,
        countdownText: formatCountdown(stemOpenDays),
        status: stemOpenStatus.status,
        statusLabel: stemOpenStatus.statusLabel,
        category: 'stem',
        explanation:
          'Earliest date USCIS will accept your Form I-765 for the 24-month STEM OPT extension (90 days before your current OPT EAD expires).',
        isRealDeadline: false,
        isConditionalStem,
        actionRequired: true,
      });

      if (profile.stemI20IssueDate && parseLocalDate(profile.stemI20IssueDate)) {
        const stemI20Plus60Str = addCalendarDays(profile.stemI20IssueDate, 60);
        const stemI20Plus60Days = diffCalendarDays(stemI20Plus60Str);
        const stemDiff = diffCalendarDays(stemI20Plus60Str, profile.eadEndDate);
        const isStemI20Earlier = stemDiff < 0;

        if (isStemI20Earlier) {
          const stemI20Status = computeMilestoneStatus(stemI20Plus60Days, true);
          const stemReason = `Your 60-day STEM OPT I-20 deadline (${formatDisplayDate(stemI20Plus60Str)}) comes ${Math.abs(stemDiff)} days before your OPT EAD expires (${formatDisplayDate(profile.eadEndDate)}). USCIS must receive your STEM OPT application within 60 days of the DSO recommendation date.`;

          milestones.push({
            id: 'stem-i20-60day-deadline',
            title: 'Real Deadline: USCIS Must Receive STEM OPT Application (60-Day I-20 Rule)',
            dateStr: stemI20Plus60Str,
            dateFormatted: formatDisplayDate(stemI20Plus60Str),
            daysFromToday: stemI20Plus60Days,
            countdownText: formatCountdown(stemI20Plus60Days),
            status: stemI20Status.status,
            statusLabel: stemI20Status.statusLabel,
            category: 'stem',
            explanation: `USCIS must receive your STEM OPT extension within 60 days of your ${formatDisplayDate(profile.stemI20IssueDate)} STEM I-20 issue date—this is your Real Deadline because it falls earlier than your EAD expiration date.`,
            isRealDeadline: true,
            realDeadlineReason: stemReason,
            isConditionalStem,
            actionRequired: true,
          });

          const eadEndStatus = computeMilestoneStatus(eadEndDays, false);
          milestones.push({
            id: 'stem-ead-end-date',
            title: 'Post-Completion OPT EAD Expires (Outer STEM OPT Window Closes)',
            dateStr: profile.eadEndDate,
            dateFormatted: formatDisplayDate(profile.eadEndDate),
            daysFromToday: eadEndDays,
            countdownText: formatCountdown(eadEndDays),
            status: eadEndStatus.status,
            statusLabel: eadEndStatus.statusLabel,
            category: 'stem',
            explanation:
              'Final day of your initial 12-month Post-Completion OPT EAD card (superseded for STEM OPT filing by your earlier 60-day STEM I-20 deadline).',
            isRealDeadline: false,
            supersededByRealDeadline: true,
            isConditionalStem,
            actionRequired: false,
          });

          realDeadlines.push({
            type: 'stem',
            title: '24-Month STEM OPT Filing Real Deadline',
            realDateStr: stemI20Plus60Str,
            realDateFormatted: formatDisplayDate(stemI20Plus60Str),
            daysFromToday: stemI20Plus60Days,
            countdownText: formatCountdown(stemI20Plus60Days),
            winningRule: '60-Day STEM OPT I-20 Recommendation Rule',
            otherRuleDateFormatted: formatDisplayDate(profile.eadEndDate),
            explanation: stemReason,
          });
        } else {
          const eadEndStatus = computeMilestoneStatus(eadEndDays, true);
          const stemReason =
            stemDiff === 0
              ? `Both your 60-day STEM I-20 window and your OPT EAD expiration fall on ${formatDisplayDate(profile.eadEndDate)}.`
              : `Your OPT EAD expiration date (${formatDisplayDate(profile.eadEndDate)}) comes ${Math.abs(stemDiff)} days earlier than 60 days from your STEM I-20 issue date (${formatDisplayDate(stemI20Plus60Str)}). USCIS cannot accept a STEM OPT extension after your current EAD expires.`;

          milestones.push({
            id: 'stem-ead-end-date',
            title: 'Real Deadline: Post-Completion OPT EAD Expires & STEM OPT Window Closes',
            dateStr: profile.eadEndDate,
            dateFormatted: formatDisplayDate(profile.eadEndDate),
            daysFromToday: eadEndDays,
            countdownText: formatCountdown(eadEndDays),
            status: eadEndStatus.status,
            statusLabel: eadEndStatus.statusLabel,
            category: 'stem',
            explanation: `USCIS must receive your STEM OPT extension before your current EAD expires on ${formatDisplayDate(profile.eadEndDate)}—this is your Real Deadline because it arrives earlier than the 60-day mark from your STEM I-20 issue date.`,
            isRealDeadline: true,
            realDeadlineReason: stemReason,
            isConditionalStem,
            actionRequired: true,
          });

          realDeadlines.push({
            type: 'stem',
            title: '24-Month STEM OPT Filing Real Deadline',
            realDateStr: profile.eadEndDate,
            realDateFormatted: formatDisplayDate(profile.eadEndDate),
            daysFromToday: eadEndDays,
            countdownText: formatCountdown(eadEndDays),
            winningRule: 'OPT EAD Expiration Cutoff',
            otherRuleDateFormatted: formatDisplayDate(stemI20Plus60Str),
            explanation: stemReason,
          });
        }
      } else {
        const eadEndStatus = computeMilestoneStatus(eadEndDays, true);
        const stemReason =
          'Your STEM OPT extension application must reach USCIS on or before your current EAD expiration date, AND within 60 days of the date your DSO issues your STEM OPT I-20, whichever comes first.';

        milestones.push({
          id: 'stem-ead-end-date',
          title: isConditionalStem
            ? 'Real Deadline: OPT EAD Expires & Conditional STEM OPT Window Closes'
            : 'Real Deadline: OPT EAD Expires & STEM OPT Filing Window Closes',
          dateStr: profile.eadEndDate,
          dateFormatted: formatDisplayDate(profile.eadEndDate),
          daysFromToday: eadEndDays,
          countdownText: formatCountdown(eadEndDays),
          status: eadEndStatus.status,
          statusLabel: eadEndStatus.statusLabel,
          category: 'stem',
          explanation:
            'Final date your Post-Completion OPT EAD is valid and the latest date USCIS can receive your 24-month STEM OPT extension.',
          isRealDeadline: true,
          realDeadlineReason: stemReason,
          isConditionalStem,
          actionRequired: true,
        });

        realDeadlines.push({
          type: 'stem',
          title: '24-Month STEM OPT Filing Deadline',
          realDateStr: profile.eadEndDate,
          realDateFormatted: formatDisplayDate(profile.eadEndDate),
          daysFromToday: eadEndDays,
          countdownText: formatCountdown(eadEndDays),
          winningRule: 'OPT EAD Expiration Date (No STEM I-20 Date Entered Yet)',
          otherRuleDateFormatted: 'Add STEM I-20 date to check 60-day limit',
          explanation: stemReason,
        });
      }
    } else {
      // Non-STEM degree with EAD end date entered (Scenario 5)
      const eadEndStatus = computeMilestoneStatus(eadEndDays, true);
      const postOptGraceStr = addCalendarDays(profile.eadEndDate, 60);
      const postOptGraceDays = diffCalendarDays(postOptGraceStr);
      const postOptGraceStatus = computeMilestoneStatus(postOptGraceDays, false);

      milestones.push({
        id: 'opt-ead-end-nonstem',
        title: 'Real Deadline: Post-Completion OPT EAD Employment Authorization Ends',
        dateStr: profile.eadEndDate,
        dateFormatted: formatDisplayDate(profile.eadEndDate),
        daysFromToday: eadEndDays,
        countdownText: formatCountdown(eadEndDays),
        status: eadEndStatus.status,
        statusLabel: eadEndStatus.statusLabel,
        category: 'opt',
        explanation:
          'Final day you are authorized to work under Post-Completion OPT; a 60-day grace period to depart the US, transfer SEVIS, or change status begins the next day.',
        isRealDeadline: true,
        actionRequired: true,
      });

      milestones.push({
        id: 'post-opt-grace-end',
        title: '60-Day Post-OPT Grace Period Ends',
        dateStr: postOptGraceStr,
        dateFormatted: formatDisplayDate(postOptGraceStr),
        daysFromToday: postOptGraceDays,
        countdownText: formatCountdown(postOptGraceDays),
        status: postOptGraceStatus.status,
        statusLabel: postOptGraceStatus.statusLabel,
        category: 'grace',
        explanation:
          'Last day of your 60-day grace period following OPT EAD completion to transfer your SEVIS record, begin a new degree level, or depart the United States.',
        isRealDeadline: false,
        actionRequired: true,
      });
    }
  }

  // Sort milestones chronologically by dateStr, then by priority
  milestones.sort((a, b) => {
    const diff = diffCalendarDays(a.dateStr, b.dateStr);
    if (diff !== 0) return diff;
    if (a.isRealDeadline && !b.isRealDeadline) return -1;
    if (!a.isRealDeadline && b.isRealDeadline) return 1;
    return 0;
  });

  // Determine the single most urgent upcoming action ("Next step" banner)
  const upcomingNotSuperseded = milestones.filter(
    (m) => m.daysFromToday >= 0 && !m.supersededByRealDeadline
  );
  const upcomingActionable = upcomingNotSuperseded.filter((m) => m.actionRequired);

  const hasValidOptI20 = Boolean(
    profile.optI20IssueDate && parseLocalDate(profile.optI20IssueDate)
  );

  let nextStep: TimelineMilestone | null = null;

  if (hasActiveEad) {
    const stemOrEadUpcoming = upcomingActionable.filter(
      (m) => m.category === 'stem' || m.id.includes('ead') || m.id.includes('post-opt')
    );
    nextStep =
      stemOrEadUpcoming[0] ||
      upcomingActionable[0] ||
      upcomingNotSuperseded[0] ||
      null;
  } else if (!hasValidOptI20 && optOpenDays <= 0 && opt60CloseDays >= 0) {
    // OPT filing window is already open and no OPT recommendation I-20 date has been entered:
    // Guide the student to request their OPT recommendation from their DSO first, with the final deadline shown as a secondary line below.
    const dsoUrgencyStatus: MilestoneStatus =
      opt60CloseDays <= 7 ? 'red' : opt60CloseDays <= 30 ? 'amber' : 'green';
    nextStep = {
      id: 'next-step-request-opt-i20',
      title: 'Request your OPT recommendation from your DSO',
      dateStr: opt60CloseStr,
      dateFormatted: `Window opened ${formatDisplayDate(optOpenStr)}`,
      daysFromToday: opt60CloseDays,
      countdownText: 'OPT filing window is open',
      status: dsoUrgencyStatus,
      statusLabel: 'Action Required',
      category: 'opt',
      explanation:
        "Your 90-day Post-Completion OPT filing window is open. Contact your school's international student office (DSO) to request your OPT-recommended Form I-20—you must have this updated I-20 before submitting Form I-765 to USCIS.",
      secondaryDeadlineLine: `Final filing deadline: ${formatDisplayDate(opt60CloseStr)} (${formatCountdown(opt60CloseDays)}) — or within 30 days of your DSO issuing your OPT I-20, whichever comes first.`,
      isRealDeadline: false,
      actionRequired: true,
    };
  } else {
    nextStep = upcomingActionable[0] || upcomingNotSuperseded[0] || null;
  }

  return { milestones, nextStep, realDeadlines, filingWindowClosedAlert };
}

/**
 * Rule 6: Unemployment Counter Calculation
 * 90 days allowed on post-completion OPT; 150 days total if on STEM OPT.
 */
export function calculateUnemployment(profile: StudentProfile): UnemploymentSummary {
  const isOnStem =
    profile.isCurrentlyOnStemOpt &&
    (profile.stemStatus === 'yes' || profile.stemStatus === 'unsure');
  const maxAllowedDays = isOnStem ? 150 : 90;

  if (profile.unemploymentMode === 'manual') {
    const usedDays = Math.max(0, Math.round(profile.manualUnemploymentDays || 0));
    const remainingDays = Math.max(0, maxAllowedDays - usedDays);
    return {
      maxAllowedDays,
      usedDays,
      remainingDays,
      isOverLimit: usedDays > maxAllowedDays,
      isOnStem,
      mode: 'manual',
      activeEadWindowText: profile.eadStartDate
        ? `From EAD start ${formatDisplayDate(profile.eadStartDate)}`
        : 'Manual day counter active',
      gapBreakdowns: [],
    };
  }

  if (!profile.eadStartDate || !parseLocalDate(profile.eadStartDate)) {
    return {
      maxAllowedDays,
      usedDays: 0,
      remainingDays: maxAllowedDays,
      isOverLimit: false,
      isOnStem,
      mode: 'tracker',
      activeEadWindowText: 'Add your OPT EAD Start Date to auto-calculate unemployment gaps',
      gapBreakdowns: [],
    };
  }

  const todayStr = toDateInputString(getTodayLocal());

  if (diffCalendarDays(profile.eadStartDate, todayStr) > 0) {
    return {
      maxAllowedDays,
      usedDays: 0,
      remainingDays: maxAllowedDays,
      isOverLimit: false,
      isOnStem,
      mode: 'tracker',
      activeEadWindowText: `EAD starts ${formatDisplayDate(profile.eadStartDate)} (${formatCountdown(diffCalendarDays(profile.eadStartDate))})`,
      gapBreakdowns: [],
    };
  }

  let windowEndStr = todayStr;
  if (profile.eadEndDate && parseLocalDate(profile.eadEndDate) && !isOnStem) {
    if (diffCalendarDays(profile.eadEndDate, todayStr) < 0) {
      windowEndStr = profile.eadEndDate;
    }
  }

  const totalWindowDays = diffCalendarDays(windowEndStr, profile.eadStartDate) + 1;
  if (totalWindowDays <= 0) {
    return {
      maxAllowedDays,
      usedDays: 0,
      remainingDays: maxAllowedDays,
      isOverLimit: false,
      isOnStem,
      mode: 'tracker',
      activeEadWindowText: `${formatDisplayDate(profile.eadStartDate)} – ${formatDisplayDate(windowEndStr)}`,
      gapBreakdowns: [],
    };
  }

  const employedFlags = new Array<boolean>(totalWindowDays).fill(false);

  for (const period of profile.employmentPeriods) {
    if (!period.startDate || !parseLocalDate(period.startDate)) continue;
    const pEndStr = period.isCurrent ? windowEndStr : period.endDate;
    if (!pEndStr || !parseLocalDate(pEndStr)) continue;

    const startOffset = Math.max(
      0,
      diffCalendarDays(period.startDate, profile.eadStartDate)
    );
    const endOffset = Math.min(
      totalWindowDays - 1,
      diffCalendarDays(pEndStr, profile.eadStartDate)
    );

    if (endOffset >= startOffset) {
      for (let i = startOffset; i <= endOffset; i++) {
        employedFlags[i] = true;
      }
    }
  }

  const gapBreakdowns: Array<{
    startStr: string;
    endStr: string;
    days: number;
    label: string;
  }> = [];

  let usedDays = 0;
  let gapStartIdx: number | null = null;

  for (let i = 0; i < totalWindowDays; i++) {
    if (!employedFlags[i]) {
      usedDays++;
      if (gapStartIdx === null) {
        gapStartIdx = i;
      }
    } else if (gapStartIdx !== null) {
      const gStart = addCalendarDays(profile.eadStartDate, gapStartIdx);
      const gEnd = addCalendarDays(profile.eadStartDate, i - 1);
      const gDays = i - gapStartIdx;
      gapBreakdowns.push({
        startStr: gStart,
        endStr: gEnd,
        days: gDays,
        label: `${formatDisplayDate(gStart)} – ${formatDisplayDate(gEnd)}`,
      });
      gapStartIdx = null;
    }
  }

  if (gapStartIdx !== null) {
    const gStart = addCalendarDays(profile.eadStartDate, gapStartIdx);
    const gEnd = addCalendarDays(profile.eadStartDate, totalWindowDays - 1);
    const gDays = totalWindowDays - gapStartIdx;
    gapBreakdowns.push({
      startStr: gStart,
      endStr: gEnd,
      days: gDays,
      label: `${formatDisplayDate(gStart)} – ${formatDisplayDate(gEnd)}`,
    });
  }

  const remainingDays = Math.max(0, maxAllowedDays - usedDays);

  return {
    maxAllowedDays,
    usedDays,
    remainingDays,
    isOverLimit: usedDays > maxAllowedDays,
    isOnStem,
    mode: 'tracker',
    activeEadWindowText: `Evaluated from ${formatDisplayDate(profile.eadStartDate)} through ${formatDisplayDate(windowEndStr)} (${totalWindowDays} calendar days)`,
    gapBreakdowns,
  };
}
