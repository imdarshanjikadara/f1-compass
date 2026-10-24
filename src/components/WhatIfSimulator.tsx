import React, { useState, useEffect } from 'react';
import { StudentProfile } from '../types';
import {
  addCalendarDays,
  diffCalendarDays,
  formatCountdown,
  formatDisplayDate,
  parseLocalDate,
} from '../utils/dateRules';
import { Check, RotateCcw, Sliders } from 'lucide-react';

interface WhatIfSimulatorProps {
  profile: StudentProfile;
  onApplySimulatedDates: (updated: StudentProfile) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  profile,
  onApplySimulatedDates,
}) => {
  const [simOptI20, setSimOptI20] = useState(
    profile.optI20IssueDate || profile.programEndDate
  );
  const [simRequestedStart, setSimRequestedStart] = useState(
    profile.eadStartDate ||
      (profile.programEndDate ? addCalendarDays(profile.programEndDate, 14) : '')
  );
  const [simStemI20, setSimStemI20] = useState(
    profile.stemI20IssueDate ||
      (profile.eadEndDate ? addCalendarDays(profile.eadEndDate, -45) : '')
  );
  const [appliedBanner, setAppliedBanner] = useState(false);

  useEffect(() => {
    setSimOptI20(profile.optI20IssueDate || profile.programEndDate);
    setSimRequestedStart(
      profile.eadStartDate ||
        (profile.programEndDate ? addCalendarDays(profile.programEndDate, 14) : '')
    );
    setSimStemI20(
      profile.stemI20IssueDate ||
        (profile.eadEndDate ? addCalendarDays(profile.eadEndDate, -45) : '')
    );
  }, [
    profile.programEndDate,
    profile.optI20IssueDate,
    profile.eadStartDate,
    profile.eadEndDate,
    profile.stemI20IssueDate,
  ]);

  const opt60CutoffStr = profile.programEndDate
    ? addCalendarDays(profile.programEndDate, 60)
    : '';
  const simOpt30Str =
    simOptI20 && parseLocalDate(simOptI20)
      ? addCalendarDays(simOptI20, 30)
      : '';
  const is30DayEarlier =
    Boolean(simOpt30Str && opt60CutoffStr) &&
    diffCalendarDays(simOpt30Str, opt60CutoffStr) <= 0;
  const simulatedRealOptDeadline = simOpt30Str
    ? is30DayEarlier
      ? simOpt30Str
      : opt60CutoffStr
    : opt60CutoffStr;

  const graceStartStr = profile.programEndDate
    ? addCalendarDays(profile.programEndDate, 1)
    : '';
  const graceEndStr = opt60CutoffStr;
  const startOffsetFromProgEnd =
    profile.programEndDate &&
    simRequestedStart &&
    parseLocalDate(simRequestedStart)
      ? diffCalendarDays(simRequestedStart, profile.programEndDate)
      : null;
  const isRequestedStartValid =
    startOffsetFromProgEnd !== null &&
    startOffsetFromProgEnd >= 1 &&
    startOffsetFromProgEnd <= 60;

  const hasEadEnd = Boolean(profile.eadEndDate && parseLocalDate(profile.eadEndDate));
  const simStem60Str =
    hasEadEnd && simStemI20 && parseLocalDate(simStemI20)
      ? addCalendarDays(simStemI20, 60)
      : '';
  const isStem60Earlier =
    hasEadEnd &&
    Boolean(simStem60Str) &&
    diffCalendarDays(simStem60Str, profile.eadEndDate) <= 0;
  const simulatedRealStemDeadline =
    hasEadEnd && simStem60Str
      ? isStem60Earlier
        ? simStem60Str
        : profile.eadEndDate
      : profile.eadEndDate;

  const handleApplyToProfile = () => {
    onApplySimulatedDates({
      ...profile,
      optI20IssueDate: simOptI20,
      eadStartDate: simRequestedStart || profile.eadStartDate,
      eadEndDate:
        !profile.eadEndDate && simRequestedStart
          ? addCalendarDays(simRequestedStart, 364)
          : profile.eadEndDate,
      stemI20IssueDate: simStemI20 || profile.stemI20IssueDate,
    });
    setAppliedBanner(true);
    setTimeout(() => setAppliedBanner(false), 2500);
  };

  const handleResetSimulator = () => {
    setSimOptI20(profile.optI20IssueDate || profile.programEndDate);
    setSimRequestedStart(
      profile.eadStartDate ||
        (profile.programEndDate ? addCalendarDays(profile.programEndDate, 14) : '')
    );
    setSimStemI20(
      profile.stemI20IssueDate ||
        (profile.eadEndDate ? addCalendarDays(profile.eadEndDate, -45) : '')
    );
  };

  return (
    <section
      id="simulator-section"
      className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>What-If Date Simulator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Test hypothetical I-20 issue dates or OPT start dates before committing them to your profile.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetSimulator}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Simulation 1: Hypothetical OPT I-20 Issue Date */}
      <div className="space-y-2 min-w-0">
        <label
          htmlFor="sim-opt-i20"
          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
        >
          1. If my DSO issues my OPT I-20 on:
        </label>
        <input
          id="sim-opt-i20"
          type="date"
          value={simOptI20}
          onChange={(e) => setSimOptI20(e.target.value)}
          className="block w-full min-w-0 max-w-full appearance-none box-border px-3.5 py-2 text-xs font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {simOpt30Str && opt60CutoffStr && (
          <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-slate-600 dark:text-slate-400">30-Day I-20 Cutoff:</span>
              <span className="font-mono-tabular font-medium text-slate-900 dark:text-slate-100">
                {formatDisplayDate(simOpt30Str)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-slate-600 dark:text-slate-400">60-Day Post-Grad Cutoff:</span>
              <span className="font-mono-tabular font-medium text-slate-900 dark:text-slate-100">
                {formatDisplayDate(opt60CutoffStr)}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-1 font-semibold text-red-700 dark:text-red-400">
              <span>Simulated Real Deadline:</span>
              <span className="font-mono-tabular">
                {formatDisplayDate(simulatedRealOptDeadline)} (
                {formatCountdown(diffCalendarDays(simulatedRealOptDeadline))})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              {is30DayEarlier
                ? 'The 30-day I-20 rule wins because it falls earlier than your 60-day post-graduation cutoff.'
                : 'The 60-day post-graduation rule wins because USCIS never accepts OPT filings after day 60, even if 30 days from your I-20 extends further.'}
            </p>
          </div>
        )}
      </div>

      {/* Simulation 2: Requested OPT Start Date Window Check */}
      <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800 min-w-0">
        <label
          htmlFor="sim-opt-start"
          className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
        >
          2. Check a Requested OPT Start Date (Grace Period Rule):
        </label>
        <input
          id="sim-opt-start"
          type="date"
          value={simRequestedStart}
          onChange={(e) => setSimRequestedStart(e.target.value)}
          className="block w-full min-w-0 max-w-full appearance-none box-border px-3.5 py-2 text-xs font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {startOffsetFromProgEnd !== null && graceStartStr && graceEndStr && (
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              isRequestedStartValid
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50/60 dark:bg-red-950/25 border-red-200 dark:border-red-800/70 text-red-900 dark:text-red-200'
            }`}
          >
            {isRequestedStartValid ? (
              <span>
                <strong>Valid OPT Start Date:</strong> Day {startOffsetFromProgEnd} of your 60-day grace period ({formatDisplayDate(graceStartStr)} – {formatDisplayDate(graceEndStr)}).
              </span>
            ) : startOffsetFromProgEnd <= 0 ? (
              <span>
                <strong>Invalid Start Date:</strong> {Math.abs(startOffsetFromProgEnd)} days before/on your Program End Date. Post-completion OPT must start between {formatDisplayDate(graceStartStr)} and {formatDisplayDate(graceEndStr)}.
              </span>
            ) : (
              <span>
                <strong>Invalid Start Date:</strong> {startOffsetFromProgEnd - 60} days after your 60-day grace period closes ({formatDisplayDate(graceEndStr)}).
              </span>
            )}
          </div>
        )}
      </div>

      {/* Simulation 3: STEM OPT I-20 60-Day Check (if EAD End Date exists) */}
      {hasEadEnd && (profile.stemStatus === 'yes' || profile.stemStatus === 'unsure') && (
        <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800 min-w-0">
          <label
            htmlFor="sim-stem-i20"
            className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            3. If my DSO issues my STEM OPT I-20 on:
          </label>
          <input
            id="sim-stem-i20"
            type="date"
            value={simStemI20}
            onChange={(e) => setSimStemI20(e.target.value)}
            className="block w-full min-w-0 max-w-full appearance-none box-border px-3.5 py-2 text-xs font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />

          {simStem60Str && (
            <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-slate-600 dark:text-slate-400">60-Day STEM I-20 Limit:</span>
                <span className="font-mono-tabular font-medium text-slate-900 dark:text-slate-100">
                  {formatDisplayDate(simStem60Str)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 font-semibold text-red-700 dark:text-red-400">
                <span>Simulated STEM Real Deadline:</span>
                <span className="font-mono-tabular">
                  {formatDisplayDate(simulatedRealStemDeadline)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Apply Button */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
        {appliedBanner ? (
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Applied to your timeline!
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Satisfied with these dates?
          </span>
        )}

        <button
          type="button"
          onClick={handleApplyToProfile}
          className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Apply to My Timeline
        </button>
      </div>
    </section>
  );
};
