import React, { useState } from 'react';
import {
  StudentProfile,
  EmploymentPeriod,
  UnemploymentSummary,
} from '../types';
import {
  diffCalendarDays,
  formatDisplayDate,
  parseLocalDate,
} from '../utils/dateRules';
import {
  Briefcase,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';

interface UnemploymentTrackerProps {
  profile: StudentProfile;
  summary: UnemploymentSummary;
  onChange: (updated: StudentProfile) => void;
  onEditDates: () => void;
}

export const UnemploymentTracker: React.FC<UnemploymentTrackerProps> = ({
  profile,
  summary,
  onChange,
  onEditDates,
}) => {
  const [employer, setEmployer] = useState('');
  const [startDate, setStartDate] = useState(profile.eadStartDate || '');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const percentageUsed = Math.min(
    100,
    Math.round((summary.usedDays / summary.maxAllowedDays) * 100)
  );

  const getCounterStatusColor = () => {
    if (summary.isOverLimit || summary.remainingDays <= 7) {
      return {
        bar: 'bg-red-600 dark:bg-red-500',
        text: 'text-red-700 dark:text-red-400',
        label: summary.isOverLimit ? 'Limit Exceeded' : 'Critical (≤7d left)',
      };
    }
    if (summary.remainingDays <= 30) {
      return {
        bar: 'bg-amber-500 dark:bg-amber-500',
        text: 'text-amber-700 dark:text-amber-400',
        label: 'Approaching Limit (≤30d left)',
      };
    }
    return {
      bar: 'bg-teal-700 dark:bg-teal-500',
      text: 'text-teal-700 dark:text-teal-400',
      label: 'Within Safe Allowance',
    };
  };

  const statusStyle = getCounterStatusColor();

  const handleModeSwitch = (mode: 'tracker' | 'manual') => {
    onChange({
      ...profile,
      unemploymentMode: mode,
      manualUnemploymentDays:
        mode === 'manual' ? summary.usedDays : profile.manualUnemploymentDays,
    });
  };

  const handleToggleOnStem = (onStem: boolean) => {
    onChange({
      ...profile,
      isCurrentlyOnStemOpt: onStem,
    });
  };

  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!startDate || !parseLocalDate(startDate)) {
      setFormError('Please enter a valid employment start date.');
      return;
    }

    if (!isCurrent) {
      if (!endDate || !parseLocalDate(endDate)) {
        setFormError('Please enter an employment end date or check "Currently working here".');
        return;
      }
      if (diffCalendarDays(endDate, startDate) < 0) {
        setFormError('Employment end date cannot be earlier than the start date.');
        return;
      }
    }

    const newPeriod: EmploymentPeriod = {
      id: `emp-${Date.now()}`,
      employer: employer.trim() || 'Qualifying OPT Employer',
      startDate,
      endDate: isCurrent ? '' : endDate,
      isCurrent,
    };

    onChange({
      ...profile,
      employmentPeriods: [...profile.employmentPeriods, newPeriod],
    });

    setEmployer('');
    setEndDate('');
    setIsCurrent(true);
  };

  const handleDeletePeriod = (id: string) => {
    onChange({
      ...profile,
      employmentPeriods: profile.employmentPeriods.filter((p) => p.id !== id),
    });
  };

  return (
    <section
      id="unemployment-section"
      className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Unemployment Day Counter
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {profile.stemStatus === 'no'
              ? '90 days maximum allowed on Post-Completion OPT'
              : '90 days allowed on Post-Completion OPT · 150 days cumulative on STEM OPT'}
          </p>
        </div>

        {/* Mode Segmented Toggle */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleModeSwitch('tracker')}
            className={`px-2.5 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap ${
              profile.unemploymentMode === 'tracker'
                ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Job Period Tracker
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('manual')}
            className={`px-2.5 py-1.5 sm:py-1 text-xs font-medium rounded-md transition-colors text-center whitespace-nowrap ${
              profile.unemploymentMode === 'manual'
                ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Manual Override
          </button>
        </div>
      </div>

      {/* Allowance Tier Selector (90d Post-Completion vs 150d STEM OPT): Label above full-width toggle */}
      {(profile.stemStatus === 'yes' || profile.stemStatus === 'unsure') && (
        <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
          <span className="block text-slate-700 dark:text-slate-300 font-medium">
            Active OPT stage:
          </span>
          <div className="grid grid-cols-2 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => handleToggleOnStem(false)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                !profile.isCurrentlyOnStemOpt
                  ? 'bg-teal-700 dark:bg-teal-600 text-white'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Initial OPT (90d)
            </button>
            <button
              type="button"
              onClick={() => handleToggleOnStem(true)}
              className={`px-3 py-2 rounded-lg font-medium transition-colors text-center whitespace-nowrap ${
                profile.isCurrentlyOnStemOpt
                  ? 'bg-teal-700 dark:bg-teal-600 text-white'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              STEM OPT (150d)
            </button>
          </div>
        </div>
      )}

      {/* Primary Numeric Readout & Progress Bar */}
      <div className="space-y-3">
        <div className="space-y-1">
          {/* Line 1: "0 / 90 days used" on one line */}
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-3xl font-bold font-mono-tabular text-slate-900 dark:text-slate-50">
              {summary.usedDays}
            </span>
            <span className="text-sm font-mono-tabular text-slate-500 dark:text-slate-400">
              / {summary.maxAllowedDays} days used
            </span>
          </div>

          {/* Line 2: "90 days remaining" with "Within Safe Allowance" on the line below it */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
            <span className={`font-mono-tabular font-semibold ${statusStyle.text}`}>
              {summary.isOverLimit
                ? `${summary.usedDays - summary.maxAllowedDays} days over limit`
                : `${summary.remainingDays} days remaining`}
            </span>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${statusStyle.bar}`}
            style={{ width: `${percentageUsed}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {summary.activeEadWindowText}
        </p>
      </div>

      {/* Mode Content: Manual Override vs Employment Period Tracker */}
      {profile.unemploymentMode === 'manual' ? (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
          <label
            htmlFor="manual-unemployment-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Adjust total accrued unemployment days manually:
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...profile,
                  manualUnemploymentDays: Math.max(0, (profile.manualUnemploymentDays || 0) - 1),
                })
              }
              className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Decrease unemployment days by 1"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              id="manual-unemployment-input"
              type="number"
              min={0}
              max={365}
              value={profile.manualUnemploymentDays}
              onChange={(e) =>
                onChange({
                  ...profile,
                  manualUnemploymentDays: Math.max(0, parseInt(e.target.value || '0', 10)),
                })
              }
              className="w-24 px-3 py-2 text-center text-base font-mono-tabular font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />

            <button
              type="button"
              onClick={() =>
                onChange({
                  ...profile,
                  manualUnemploymentDays: (profile.manualUnemploymentDays || 0) + 1,
                })
              }
              className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Increase unemployment days by 1"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:ml-auto">
              {[0, 15, 45, 75].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...profile,
                      manualUnemploymentDays: preset,
                    })
                  }
                  className="px-2 py-1 text-xs font-mono-tabular text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 rounded transition-colors"
                >
                  {preset}d
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
          {!profile.eadStartDate ? (
            <div className="p-4 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Add your <strong>OPT EAD Start Date</strong> to automatically calculate exact unemployment gaps between jobs, or switch to Manual Override above.
              </p>
              <button
                type="button"
                onClick={onEditDates}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Add EAD Date
              </button>
            </div>
          ) : (
            <>
              {/* Logged Employment Periods List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Logged Employment Periods ({profile.employmentPeriods.length})</span>
                  <span>Qualifying ≥20 hrs/wk</span>
                </div>

                {profile.employmentPeriods.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-2 leading-relaxed">
                    No employment periods logged yet. Every calendar day since your EAD start date counts toward unemployment until you log a job below.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {profile.employmentPeriods.map((period) => (
                      <div
                        key={period.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                            <span>{period.employer}</span>
                          </div>
                          <div className="font-mono-tabular text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDisplayDate(period.startDate)} –{' '}
                            {period.isCurrent ? 'Present' : formatDisplayDate(period.endDate)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(period.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          aria-label={`Remove ${period.employer}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gap Breakdown Summary */}
              {summary.gapBreakdowns.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Detected Unemployment Gaps:
                  </span>
                  <div className="space-y-1">
                    {summary.gapBreakdowns.map((g, i) => (
                      <div
                        key={`${g.startStr}-${i}`}
                        className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-[#F7F9FA] dark:bg-slate-900/70 px-3 py-1.5 rounded-lg"
                      >
                        <span className="font-mono-tabular">{g.label}</span>
                        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-200">
                          {g.days} {g.days === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Employment Period Form */}
              <form
                onSubmit={handleAddPeriod}
                className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Add Employment / Internship Period
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  <input
                    type="text"
                    value={employer}
                    onChange={(e) => setEmployer(e.target.value)}
                    placeholder="Employer or Lab Name (e.g., Acme Corp)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        disabled={isCurrent}
                        value={isCurrent ? '' : endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCurrent}
                        onChange={(e) => setIsCurrent(e.target.checked)}
                        className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span>Currently working here</span>
                    </label>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Log Job
                    </button>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
                )}
              </form>
            </>
          )}
        </div>
      )}
    </section>
  );
};
