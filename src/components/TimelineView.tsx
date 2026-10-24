import React, { useState } from 'react';
import {
  StudentProfile,
  TimelineMilestone,
  RealDeadlineSummary,
  MilestoneStatus,
  FilingWindowClosedAlert,
} from '../types';
import { addCalendarDays, formatDisplayDate } from '../utils/dateRules';
import {
  buildGoogleCalendarUrl,
  downloadMilestoneIcs,
  downloadUpcomingMilestonesIcs,
  milestoneToCalendarInput,
} from '../utils/icsExport';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

interface TimelineViewProps {
  profile: StudentProfile;
  milestones: TimelineMilestone[];
  nextStep: TimelineMilestone | null;
  realDeadlines: RealDeadlineSummary[];
  filingWindowClosedAlert: FilingWindowClosedAlert | null;
  onEditDates: () => void;
  onOpenCipGuide: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  profile,
  milestones,
  nextStep,
  realDeadlines,
  filingWindowClosedAlert,
  onEditDates,
  onOpenCipGuide,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'opt' | 'grace' | 'stem'>('all');

  if (!profile.programEndDate || milestones.length === 0) {
    return (
      <section className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-center text-teal-700 dark:text-teal-400 mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Your Personalized Timeline Is Ready to Map
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Enter your Program End Date from Page 1 of your Form I-20 to calculate your 90-day OPT filing window, 60-day grace period, and Real Deadline.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onEditDates}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Enter My I-20 Dates
          </button>
        </div>
      </section>
    );
  }

  const effectiveFilter =
    profile.stemStatus === 'no' && categoryFilter === 'stem' ? 'all' : categoryFilter;

  const filteredMilestones = milestones.filter((m) =>
    effectiveFilter === 'all' ? true : m.category === effectiveFilter
  );

  const upcomingCount = milestones.filter((m) => m.daysFromToday >= 0).length;

  const graceStartFormatted = formatDisplayDate(addCalendarDays(profile.programEndDate, 1));
  const graceEndFormatted = formatDisplayDate(addCalendarDays(profile.programEndDate, 60));

  const getStatusTheme = (status: MilestoneStatus) => {
    switch (status) {
      case 'red':
        return {
          cardBorder: 'border-red-300 dark:border-red-800/80',
          cardBg: 'bg-red-50/35 dark:bg-red-950/20',
          nodeBg: 'bg-red-600 dark:bg-red-500 text-white',
          textAccent: 'text-red-700 dark:text-red-400',
          countdownColor: 'text-red-700 dark:text-red-300 font-semibold',
          icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
        };
      case 'amber':
        return {
          cardBorder: 'border-amber-300 dark:border-amber-800/80',
          cardBg: 'bg-amber-50/30 dark:bg-amber-950/15',
          nodeBg: 'bg-amber-500 dark:bg-amber-500 text-white',
          textAccent: 'text-amber-800 dark:text-amber-400',
          countdownColor: 'text-amber-800 dark:text-amber-300 font-semibold',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
        };
      case 'green':
        return {
          cardBorder: 'border-emerald-200/90 dark:border-emerald-900/70',
          cardBg: 'bg-white dark:bg-[#111921]',
          nodeBg: 'bg-emerald-600 dark:bg-emerald-500 text-white',
          textAccent: 'text-emerald-700 dark:text-emerald-400',
          countdownColor: 'text-emerald-700 dark:text-emerald-400 font-medium',
          icon: <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        };
      case 'gray':
      default:
        return {
          cardBorder: 'border-slate-200/90 dark:border-slate-800',
          cardBg: 'bg-slate-50/60 dark:bg-slate-900/40',
          nodeBg: 'bg-slate-400 dark:bg-slate-700 text-white',
          textAccent: 'text-slate-500 dark:text-slate-400',
          countdownColor: 'text-slate-500 dark:text-slate-400',
          icon: <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CRITICAL RED ALERT BANNER IF FILING WINDOW HAS CLOSED OR NEXT STEP BANNER */}
      {filingWindowClosedAlert?.isClosed ? (
        <section
          role="alert"
          aria-label="Critical filing window closed alert"
          className="rounded-2xl border-2 border-red-400 dark:border-red-700 bg-red-50/90 dark:bg-red-950/40 p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-600 dark:bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-300">
                  <span>Critical Status Alert</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    Closed on {filingWindowClosedAlert.closedDateFormatted}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {filingWindowClosedAlert.daysSinceClosed}{' '}
                    {filingWindowClosedAlert.daysSinceClosed === 1 ? 'day' : 'days'} ago
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-red-950 dark:text-red-100">
                  {filingWindowClosedAlert.title}
                </h2>

                <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed max-w-2xl">
                  {filingWindowClosedAlert.explanation}
                </p>

                <div className="p-3.5 rounded-xl bg-white/85 dark:bg-slate-950/60 border border-red-200 dark:border-red-800/80 text-xs text-red-950 dark:text-red-100 leading-relaxed">
                  <strong className="font-semibold">Recommended Immediate Action: </strong>
                  {filingWindowClosedAlert.recommendation}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:self-start">
              <button
                type="button"
                onClick={onEditDates}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Already Filed / Update EAD Dates
              </button>
            </div>
          </div>
        </section>
      ) : nextStep ? (
        <section
          aria-label="Most urgent next step"
          className={`rounded-2xl border p-4 sm:p-6 ${
            nextStep.status === 'red'
              ? 'bg-red-50/60 dark:bg-red-950/25 border-red-300 dark:border-red-800'
              : nextStep.status === 'amber'
              ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800'
              : 'bg-teal-50/50 dark:bg-teal-950/25 border-teal-200/90 dark:border-teal-800/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span
                  className={
                    nextStep.status === 'red'
                      ? 'text-red-700 dark:text-red-300'
                      : nextStep.status === 'amber'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-teal-800 dark:text-teal-300'
                  }
                >
                  Next step
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="font-mono-tabular text-slate-900 dark:text-slate-100">
                  {nextStep.dateFormatted}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span
                  className={`font-mono-tabular ${
                    nextStep.status === 'red'
                      ? 'text-red-700 dark:text-red-300'
                      : nextStep.status === 'amber'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-teal-800 dark:text-teal-300'
                  }`}
                >
                  {nextStep.countdownText}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                {nextStep.title}
              </h2>

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
                {nextStep.explanation}
              </p>

              {nextStep.secondaryDeadlineLine && (
                <p className="pt-1 text-xs font-medium text-slate-800 dark:text-slate-200 font-mono-tabular">
                  {nextStep.secondaryDeadlineLine}
                </p>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <a
                  href={buildGoogleCalendarUrl(
                    milestoneToCalendarInput(nextStep),
                    profile.name
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Google Calendar
                </a>
                <button
                  type="button"
                  onClick={() => downloadMilestoneIcs(nextStep, profile.name)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  title="Download .ics with 14-day and 3-day reminders"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  .ics
                </button>
              </div>
              {!profile.optI20IssueDate && nextStep.category === 'opt' && (
                <button
                  type="button"
                  onClick={onEditDates}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline whitespace-nowrap shrink-0"
                >
                  Received OPT I-20? Enter date
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111921] p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              All calculated milestones are in the past
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              If you have received your OPT EAD card or a new Form I-20, update your dates to see upcoming STEM OPT or grace period windows.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditDates}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Update Dates
          </button>
        </section>
      )}

      {/* 2. REAL DEADLINE ARBITRATOR & 60-DAY GRACE WINDOW SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {realDeadlines.map((rd) => (
          <div
            key={rd.type}
            className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Real Deadline Analysis ({rd.type.toUpperCase()})
                </span>
                <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                  {rd.countdownText}
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {rd.realDateFormatted}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {rd.winningRule}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {rd.explanation}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Compared cutoff:</span>
              <span className="font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
                {rd.otherRuleDateFormatted}
              </span>
            </div>
          </div>
        ))}

        {/* Rule 4: Grace Period & Requested OPT Start Date Window Card */}
        <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                60-Day Grace Period &amp; OPT Start Window
              </span>
              <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                60 days
              </span>
            </div>

            <div className="mt-2.5">
              <h3 className="text-base font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                {graceStartFormatted} – {graceEndFormatted}
              </h3>
            </div>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your requested Post-Completion OPT start date on Form I-765 must fall within this 60-day post-graduation grace period window.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Program end date (I-20):</span>
            <span className="font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
              {formatDisplayDate(profile.programEndDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Conditional STEM Banner if student selected "Not sure" */}
      {profile.stemStatus === 'unsure' && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/25 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>STEM Designation Marked &ldquo;Not Sure&rdquo;:</strong>{' '}
              {profile.eadEndDate
                ? 'Conditional 24-month STEM OPT milestones are shown below. Verify your 6-digit CIP code on Form I-20 Page 1 to confirm eligibility.'
                : 'Once you enter your OPT EAD dates, conditional STEM OPT milestones will appear automatically. Verify your CIP code now to check if your degree qualifies for 150 total unemployment days and a 24-month extension.'}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCipGuide}
            className="px-3.5 py-2 text-xs font-semibold text-amber-950 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-800/70 hover:bg-amber-300/80 dark:hover:bg-amber-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Check CIP Code Guide
          </button>
        </div>
      )}

      {/* 3. VERTICAL TIMELINE HEADER & CONTROLS */}
      <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {profile.name ? `${profile.name}'s Immigration Timeline` : 'Personalized Immigration Timeline'}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Green: &gt;30d away</span>
              <span aria-hidden="true">·</span>
              <span>Amber: ≤30d</span>
              <span aria-hidden="true">·</span>
              <span>Red: ≤7d or Real Deadline</span>
              <span aria-hidden="true">·</span>
              <span>Gray: Passed</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Interactive Category Filter Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'opt', label: 'OPT' },
                  { id: 'grace', label: 'Grace' },
                  ...(profile.stemStatus !== 'no'
                    ? ([{ id: 'stem', label: 'STEM' }] as const)
                    : []),
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    effectiveFilter === tab.id
                      ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => downloadUpcomingMilestonesIcs(milestones, profile.name)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Export all upcoming deadlines as a single .ics file with 14-day and 3-day reminders for Google Calendar, Apple Calendar, or Outlook"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>
                Add to Calendar ({upcomingCount > 0 ? `${upcomingCount} upcoming` : 'All'} .ics)
              </span>
            </button>
          </div>
        </div>

        {/* Vertical Timeline List */}
        {filteredMilestones.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {categoryFilter === 'stem'
                ? 'No STEM OPT milestones calculated yet. Enter your OPT EAD Start and End dates (and ensure STEM designation is Yes or Not sure) to generate your STEM OPT timeline.'
                : 'No milestones match this filter.'}
            </p>
            {categoryFilter === 'stem' && (
              <button
                type="button"
                onClick={onEditDates}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Add OPT EAD Dates
              </button>
            )}
          </div>
        ) : (
          <div className="mt-7 relative">
            {/* Vertical Connecting Spine */}
            <div
              aria-hidden="true"
              className="absolute left-3.5 top-3 bottom-3 w-px bg-slate-200 dark:bg-slate-800"
            />

            <div className="space-y-5">
              {filteredMilestones.map((m, index) => {
                const theme = getStatusTheme(m.status);
                const googleCalUrl = buildGoogleCalendarUrl(
                  milestoneToCalendarInput(m),
                  profile.name
                );

                return (
                  <div key={m.id} className="relative pl-10">
                    {/* Timeline Node Indicator */}
                    <div
                      className={`absolute left-1 top-4 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono-tabular font-bold ring-4 ring-white dark:ring-[#111921] ${theme.nodeBg}`}
                    >
                      {index + 1}
                    </div>

                    {/* Milestone Card */}
                    <article
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${theme.cardBorder} ${theme.cardBg}`}
                    >
                      {/* Top Metadata Row: Unboxed text with · separators + Individual Calendar Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {theme.icon}
                          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                            {m.dateFormatted}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className={`font-mono-tabular ${theme.countdownColor}`}>
                            {m.countdownText}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className={`font-medium ${theme.textAccent}`}>
                            {m.statusLabel}
                          </span>
                          {m.isConditionalStem && (
                            <>
                              <span aria-hidden="true" className="text-slate-400">
                                ·
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                Conditional on STEM CIP
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={googleCalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded transition-colors whitespace-nowrap shrink-0"
                            title={`Add "${m.title}" to Google Calendar`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Calendar</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => downloadMilestoneIcs(m, profile.name)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                            title={`Download .ics for "${m.title}" (includes 14-day & 3-day reminders)`}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>.ics</span>
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3
                        className={`mt-2.5 text-base font-bold ${
                          m.status === 'gray'
                            ? 'text-slate-600 dark:text-slate-400'
                            : 'text-slate-900 dark:text-slate-50'
                        }`}
                      >
                        {m.title}
                      </h3>

                      {/* One-Sentence Plain-English Explanation */}
                      <p
                        className={`mt-1.5 text-sm leading-relaxed ${
                          m.status === 'gray'
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {m.explanation}
                      </p>

                      {/* Real Deadline Specific Explanation Footer */}
                      {m.isRealDeadline && m.realDeadlineReason && (
                        <div className="mt-3.5 pt-3 border-t border-red-200/70 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 leading-relaxed">
                          <strong className="font-semibold">Why this is your Real Deadline: </strong>
                          {m.realDeadlineReason}
                        </div>
                      )}
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
