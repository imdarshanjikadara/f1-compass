import React, { useState } from 'react';
import {
  ChecklistItem,
  MilestoneStatus,
  StudentProfile,
} from '../types';
import {
  buildGoogleCalendarUrl,
  checklistItemToCalendarInput,
  downloadChecklistItemIcs,
  downloadUpcomingChecklistIcs,
} from '../utils/icsExport';
import {
  AlertCircle,
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface MyChecklistViewProps {
  profile: StudentProfile;
  items: ChecklistItem[];
  checkedMap: Record<string, boolean>;
  onToggleStep: (stepKey: string) => void;
  onRefreshAi: () => void;
  isGeneratingAi: boolean;
  aiError: string | null;
  isAiPersonalized: boolean;
  onEditDates?: () => void;
}

export const MyChecklistView: React.FC<MyChecklistViewProps> = ({
  profile,
  items,
  checkedMap,
  onToggleStep,
  onRefreshAi,
  isGeneratingAi,
  aiError,
  isAiPersonalized,
  onEditDates,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'remaining' | 'completed'>('all');

  if (!profile.programEndDate || items.length === 0) {
    return (
      <section className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 sm:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-center text-teal-700 dark:text-teal-400 mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Set Up Your Dates to Generate Your Checklist
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every step in your F-1 Compass checklist is tied to a rule-calculated deadline from your I-20 Program End Date.
          </p>
        </div>
        {onEditDates && (
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
        )}
      </section>
    );
  }

  const totalCount = items.length;
  const completedCount = items.filter((item) => Boolean(checkedMap[item.stepKey])).length;
  const upcomingCount = items.filter((item) => item.daysFromToday >= 0).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredItems = items.filter((item) => {
    const isChecked = Boolean(checkedMap[item.stepKey]);
    if (filterMode === 'remaining') return !isChecked;
    if (filterMode === 'completed') return isChecked;
    return true;
  });

  // Group filtered items by chronological phase while preserving order
  const phases: Array<{ phaseTitle: string; phaseItems: ChecklistItem[] }> = [];
  for (const item of filteredItems) {
    const existing = phases.find((p) => p.phaseTitle === item.phase);
    if (existing) {
      existing.phaseItems.push(item);
    } else {
      phases.push({ phaseTitle: item.phase, phaseItems: [item] });
    }
  }

  const getStatusTheme = (status: MilestoneStatus, isChecked: boolean) => {
    if (isChecked) {
      return {
        border: 'border-slate-200/90 dark:border-slate-800',
        bg: 'bg-slate-50/60 dark:bg-slate-900/40',
        dateColor: 'text-slate-500 dark:text-slate-400',
        countdownColor: 'text-emerald-700 dark:text-emerald-400 font-medium',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    switch (status) {
      case 'red':
        return {
          border: 'border-red-300 dark:border-red-800/80',
          bg: 'bg-red-50/35 dark:bg-red-950/20',
          dateColor: 'text-slate-900 dark:text-slate-100',
          countdownColor: 'text-red-700 dark:text-red-300 font-semibold',
          icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />,
        };
      case 'amber':
        return {
          border: 'border-amber-300 dark:border-amber-800/80',
          bg: 'bg-amber-50/30 dark:bg-amber-950/15',
          dateColor: 'text-slate-900 dark:text-slate-100',
          countdownColor: 'text-amber-800 dark:text-amber-300 font-semibold',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
        };
      case 'green':
        return {
          border: 'border-slate-200/90 dark:border-slate-800',
          bg: 'bg-white dark:bg-[#111921]',
          dateColor: 'text-slate-900 dark:text-slate-100',
          countdownColor: 'text-emerald-700 dark:text-emerald-400 font-medium',
          icon: <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
        };
      case 'gray':
      default:
        return {
          border: 'border-slate-200/90 dark:border-slate-800',
          bg: 'bg-white dark:bg-[#111921]',
          dateColor: 'text-slate-600 dark:text-slate-300',
          countdownColor: 'text-slate-500 dark:text-slate-400',
          icon: <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Completion Progress Card */}
      <section className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {profile.name ? `${profile.name}'s OPT & STEM OPT Checklist` : 'My Personalized OPT & STEM OPT Checklist'}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every due date below is calculated directly from your F-1 Compass timeline rules. Checked items stay saved in your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadUpcomingChecklistIcs(items, profile.name)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Export all upcoming checklist deadlines as a single .ics file with 14-day and 3-day reminders"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>
                Add to Calendar ({upcomingCount > 0 ? `${upcomingCount} upcoming` : 'All'} .ics)
              </span>
            </button>

            <button
              type="button"
              onClick={onRefreshAi}
              disabled={isGeneratingAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
              <span>
                {isGeneratingAi
                  ? 'Personalizing with Gemini...'
                  : isAiPersonalized
                  ? 'Refresh Gemini Notes'
                  : 'Personalize with Gemini'}
              </span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Filter Controls */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Checklist Progress
              </span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                {completedCount} of {totalCount} completed ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 dark:bg-teal-500 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg w-full sm:w-auto self-start sm:self-center">
            {(
              [
                { id: 'all', label: `All (${totalCount})` },
                { id: 'remaining', label: `Remaining (${totalCount - completedCount})` },
                { id: 'completed', label: `Done (${completedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {aiError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3"
          >
            <span>
              Showing standard rule-bound checklist guidance ({aiError}). You can retry Gemini personalization anytime.
            </span>
            <button
              type="button"
              onClick={onRefreshAi}
              className="underline font-semibold whitespace-nowrap shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* Phase-Grouped Checklist Items */}
      {phases.length === 0 ? (
        <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {filterMode === 'completed'
              ? 'No checklist items checked off yet.'
              : 'All checklist items are marked complete!'}
          </p>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
          >
            Show all {totalCount} checklist items
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {phases.map((phaseGroup) => (
            <section
              key={phaseGroup.phaseTitle}
              className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-7 space-y-4"
            >
              <div className="pb-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {phaseGroup.phaseTitle}
                </h3>
                <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                  {phaseGroup.phaseItems.filter((i) => checkedMap[i.stepKey]).length} /{' '}
                  {phaseGroup.phaseItems.length} done
                </span>
              </div>

              <div className="space-y-4">
                {phaseGroup.phaseItems.map((item) => {
                  const isChecked = Boolean(checkedMap[item.stepKey]);
                  const theme = getStatusTheme(item.status, isChecked);
                  const googleCalUrl = buildGoogleCalendarUrl(
                    checklistItemToCalendarInput(item),
                    profile.name
                  );

                  return (
                    <article
                      key={item.stepKey}
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${theme.border} ${theme.bg}`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Accessible Checkbox */}
                        <div className="pt-0.5 shrink-0">
                          <input
                            id={`chk-${item.stepKey}`}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleStep(item.stepKey)}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-teal-700 focus:ring-2 focus:ring-teal-600 cursor-pointer"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Top Metadata Row: Unboxed text with · separators + Individual Calendar Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {theme.icon}
                              <span className={`font-mono-tabular font-semibold ${theme.dateColor}`}>
                                Due: {item.dueDateFormatted}
                              </span>
                              <span aria-hidden="true" className="text-slate-400">
                                ·
                              </span>
                              <span className={`font-mono-tabular ${theme.countdownColor}`}>
                                {isChecked ? 'Completed' : item.countdownText}
                              </span>
                              {item.isConditionalStem && (
                                <>
                                  <span aria-hidden="true" className="text-slate-400">
                                    ·
                                  </span>
                                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                                    If STEM-Eligible
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
                                title={`Add "${item.title}" to Google Calendar`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Google Calendar</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => downloadChecklistItemIcs(item, profile.name)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                                title={`Download .ics for "${item.title}" (includes 14-day & 3-day reminders)`}
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span>.ics</span>
                              </button>
                            </div>
                          </div>

                          {/* Rule Citation Subtitle */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.ruleCitation}
                          </div>

                          {/* Checklist Item Title */}
                          <label
                            htmlFor={`chk-${item.stepKey}`}
                            className={`block text-base font-bold cursor-pointer ${
                              isChecked
                                ? 'line-through text-slate-500 dark:text-slate-400'
                                : 'text-slate-900 dark:text-slate-50'
                            }`}
                          >
                            {item.title}
                          </label>

                          {/* Actionable Instruction */}
                          <p
                            className={`text-sm leading-relaxed ${
                              isChecked
                                ? 'text-slate-500 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.instruction}
                          </p>

                          {/* Mandatory "Why this matters" Note in Plain English */}
                          <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong className="font-semibold text-slate-800 dark:text-slate-200">
                              Why this matters:{' '}
                            </strong>
                            {item.whyThisMatters}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Mandatory Closing Note: "Questions? Contact your DSO before filing." */}
      <footer className="bg-teal-50/60 dark:bg-teal-950/25 border border-teal-200/80 dark:border-teal-800/70 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <HelpCircle className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50">
              Questions? Contact your DSO before filing.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This checklist is for planning only and does not determine OPT or STEM OPT eligibility or guarantee approval. Always verify your Form I-20 endorsements, CIP code, and filing window with your school&apos;s Designated School Official (DSO).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
