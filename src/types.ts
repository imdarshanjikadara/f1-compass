export type DegreeLevel = 'bachelors' | 'masters' | 'phd';
export type StemDesignation = 'yes' | 'no' | 'unsure';
export type MilestoneStatus = 'green' | 'amber' | 'red' | 'gray';
export type MilestoneCategory = 'opt' | 'grace' | 'stem';

export interface EmploymentPeriod {
  id: string;
  employer: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (empty if isCurrent is true)
  isCurrent: boolean;
  isStemPeriod?: boolean;
}

export interface StudentProfile {
  name: string;
  programEndDate: string; // YYYY-MM-DD (required)
  degreeLevel: DegreeLevel;
  stemStatus: StemDesignation;
  optI20IssueDate: string; // YYYY-MM-DD (optional)
  eadStartDate: string;    // YYYY-MM-DD (optional)
  eadEndDate: string;      // YYYY-MM-DD (optional)
  stemI20IssueDate: string; // YYYY-MM-DD (optional)
  unemploymentMode: 'tracker' | 'manual';
  manualUnemploymentDays: number;
  isCurrentlyOnStemOpt: boolean;
  employmentPeriods: EmploymentPeriod[];
}

export interface TimelineMilestone {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  dateFormatted: string;
  daysFromToday: number;
  countdownText: string;
  status: MilestoneStatus;
  statusLabel: string;
  category: MilestoneCategory;
  explanation: string;
  isRealDeadline: boolean;
  realDeadlineReason?: string;
  supersededByRealDeadline?: boolean;
  isConditionalStem?: boolean;
  actionRequired?: boolean;
  secondaryDeadlineLine?: string;
}

export interface FilingWindowClosedAlert {
  isClosed: boolean;
  title: string;
  closedDateFormatted: string;
  daysSinceClosed: number;
  countdownText: string;
  explanation: string;
  recommendation: string;
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface RealDeadlineSummary {
  type: 'opt' | 'stem';
  title: string;
  realDateStr: string;
  realDateFormatted: string;
  daysFromToday: number;
  countdownText: string;
  winningRule: string;
  otherRuleDateFormatted: string;
  explanation: string;
}

export interface UnemploymentSummary {
  maxAllowedDays: number;
  usedDays: number;
  remainingDays: number;
  isOverLimit: boolean;
  isOnStem: boolean;
  mode: 'tracker' | 'manual';
  activeEadWindowText: string;
  gapBreakdowns: Array<{
    startStr: string;
    endStr: string;
    days: number;
    label: string;
  }>;
}

export interface ChecklistStepCopy {
  stepKey: string;
  title: string;
  instruction: string;
  whyThisMatters: string;
}

export interface ChecklistItem extends ChecklistStepCopy {
  phase: string;
  dueDateStr: string; // YYYY-MM-DD strictly computed by app rules
  dueDateFormatted: string;
  daysFromToday: number;
  countdownText: string;
  status: MilestoneStatus;
  statusLabel: string;
  isRealDeadline: boolean;
  ruleCitation: string;
  isConditionalStem?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isOutOfScope?: boolean;
}
