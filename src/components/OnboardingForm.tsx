import React, { useState } from 'react';
import {
  StudentProfile,
  DegreeLevel,
  StemDesignation,
  ValidationIssue,
} from '../types';
import {
  addCalendarDays,
  formatDisplayDate,
} from '../utils/dateRules';
import {
  AlertTriangle,
  Check,
  Compass,
  HelpCircle,
  Lock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface OnboardingFormProps {
  profile: StudentProfile;
  onChange: (updated: StudentProfile) => void;
  onSubmit: () => void;
  onOpenCipGuide: () => void;
  onRequestResetData: () => void;
  validationIssues: ValidationIssue[];
  isEditingExisting: boolean;
  onCancelEdit?: () => void;
}

export const OnboardingForm: React.FC<OnboardingFormProps> = ({
  profile,
  onChange,
  onSubmit,
  onOpenCipGuide,
  onRequestResetData,
  validationIssues,
  isEditingExisting,
  onCancelEdit,
}) => {
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const hasBlockingErrors = validationIssues.some((i) => i.severity === 'error');

  // For first-time users who haven't entered a programEndDate yet, don't show a red error
  // until they either enter dates or attempt to submit
  const visibleValidationIssues = validationIssues.filter((issue) => {
    if (
      issue.field === 'programEndDate' &&
      !profile.programEndDate &&
      !attemptedSubmit
    ) {
      return false;
    }
    return true;
  });

  const updateField = <K extends keyof StudentProfile>(
    key: K,
    value: StudentProfile[K]
  ) => {
    if (key === 'stemStatus' && value === 'no') {
      onChange({
        ...profile,
        stemStatus: 'no',
        stemI20IssueDate: '',
        isCurrentlyOnStemOpt: false,
      });
      return;
    }
    onChange({
      ...profile,
      [key]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!hasBlockingErrors && profile.programEndDate) {
      onSubmit();
    }
  };

  const getFieldError = (fieldName: string) =>
    visibleValidationIssues.find((i) => i.field === fieldName);

  const graceEndPreview = profile.programEndDate
    ? formatDisplayDate(addCalendarDays(profile.programEndDate, 60))
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* FRIENDLY EMPTY STATE FOR FIRST-TIME USERS */}
      {!isEditingExisting && !profile.programEndDate && (
        <section
          aria-label="Welcome to F-1 Compass"
          className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-8 space-y-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/70 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                Welcome to F-1 Compass — Let&apos;s map your OPT timeline calmly
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Immigration deadlines can feel overwhelming, especially when balancing the 90-day pre-completion window, the 60-day grace period, and the 30-day DSO I-20 rule. Enter your Program End Date from Page 1 of your Form I-20 below to generate a clear, step-by-step plan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                01. One Required Date
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Start with just your I-20 Program End Date. Add your OPT I-20 or EAD card dates later when you receive them.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                02. Real Deadline Clarity
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatically compares your 30-day I-20 clock against your 60-day post-graduation cutoff so you never miss the earlier date.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80">
              <div className="text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                <span>03. 100% Browser Private</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your dates and checklist stay stored strictly in your browser&apos;s local storage and can be reset anytime.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ONE-SCREEN ONBOARDING & PROFILE FORM */}
      <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {isEditingExisting ? 'Update Your F-1 Dates' : 'Your F-1 Timeline Setup'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter the dates from your Form I-20 and EAD card (if applicable). Optional dates can be added anytime later.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0 pt-1">
            <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>Saved locally in your browser</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-7" noValidate>
          {/* Section 1: Core Academic Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Name (optional) */}
            <div>
              <label
                htmlFor="student-name"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Name <span className="text-xs font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="student-name"
                type="text"
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Jordan Lee"
                className="mt-2 w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Used only to personalize your header and calendar exports.
              </p>
            </div>

            {/* Program End Date (Required) */}
            <div>
              <label
                htmlFor="program-end-date"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Program end date (from I-20) <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="relative mt-2">
                <input
                  id="program-end-date"
                  type="date"
                  required
                  value={profile.programEndDate}
                  onChange={(e) => updateField('programEndDate', e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white dark:bg-slate-950 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                    getFieldError('programEndDate')
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Found on Page 1 of Form I-20 under &ldquo;Program of Study&rdquo;.
                {graceEndPreview && (
                  <span className="block text-slate-600 dark:text-slate-300 mt-0.5">
                    60-day grace period ends: <strong className="font-mono-tabular">{graceEndPreview}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Degree Level & STEM Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            {/* Degree Level */}
            <div>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Degree level
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'bachelors', label: "Bachelor's" },
                    { value: 'masters', label: "Master's" },
                    { value: 'phd', label: 'PhD' },
                  ] as { value: DegreeLevel; label: string }[]
                ).map((item) => {
                  const active = profile.degreeLevel === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateField('degreeLevel', item.value)}
                      className={`py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Is the degree STEM-designated? */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                  Is the degree STEM-designated?
                </span>
                <button
                  type="button"
                  onClick={onOpenCipGuide}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap shrink-0"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Check CIP code
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                    { value: 'unsure', label: 'Not sure' },
                  ] as { value: StemDesignation; label: string }[]
                ).map((item) => {
                  const active = profile.stemStatus === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateField('stemStatus', item.value)}
                      className={`py-2.5 px-2 sm:px-3 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inline helper if "Not sure" is selected for STEM */}
          {profile.stemStatus === 'unsure' && (
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="font-semibold">Not sure if your major is STEM-designated?</strong>{' '}
                We will display a conditional STEM OPT timeline so you don&apos;t miss any deadlines, and you can verify your 6-digit CIP code on Page 1 of your Form I-20.
              </div>
              <button
                type="button"
                onClick={onOpenCipGuide}
                className="px-3.5 py-2 text-xs font-semibold text-amber-950 dark:text-amber-100 bg-amber-200/70 dark:bg-amber-800/60 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Open CIP Code Guide
              </button>
            </div>
          )}

          {/* Divider for Optional Post-Completion OPT & STEM OPT Dates */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Optional I-20 &amp; EAD Card Dates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Leave blank if you haven&apos;t received them yet—you can add or test them anytime.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* OPT Recommendation I-20 Issue Date */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="opt-i20-date"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    OPT recommendation I-20 issue date
                  </label>
                  {profile.optI20IssueDate && (
                    <button
                      type="button"
                      onClick={() => updateField('optI20IssueDate', '')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="opt-i20-date"
                  type="date"
                  value={profile.optI20IssueDate}
                  onChange={(e) => updateField('optI20IssueDate', e.target.value)}
                  className="mt-2 w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Triggers the strict <strong>30-day rule</strong>: USCIS must receive your application within 30 days of this date.
                </p>
              </div>

              {/* STEM OPT I-20 Issue Date (Hidden for Non-STEM students) */}
              {profile.stemStatus !== 'no' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="stem-i20-date"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                    >
                      STEM OPT I-20 issue date
                    </label>
                    {profile.stemI20IssueDate && (
                      <button
                        type="button"
                        onClick={() => updateField('stemI20IssueDate', '')}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="stem-i20-date"
                    type="date"
                    value={profile.stemI20IssueDate}
                    onChange={(e) => updateField('stemI20IssueDate', e.target.value)}
                    className="mt-2 w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Triggers the <strong>60-day rule</strong> for STEM OPT: USCIS must receive your STEM extension within 60 days.
                  </p>
                </div>
              )}

              {/* OPT EAD Start Date */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ead-start-date"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    OPT EAD start date
                  </label>
                  {profile.eadStartDate && (
                    <button
                      type="button"
                      onClick={() => updateField('eadStartDate', '')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="ead-start-date"
                  type="date"
                  value={profile.eadStartDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    if (newStart && !profile.eadEndDate) {
                      const suggestedEnd = addCalendarDays(newStart, 364);
                      onChange({
                        ...profile,
                        eadStartDate: newStart,
                        eadEndDate: suggestedEnd,
                      });
                    } else {
                      updateField('eadStartDate', newStart);
                    }
                  }}
                  className="mt-2 w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Labeled &ldquo;Valid From&rdquo; on your EAD card (or your requested start date).
                </p>
              </div>

              {/* OPT EAD End Date */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="ead-end-date"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    OPT EAD end date
                  </label>
                  {profile.eadEndDate && (
                    <button
                      type="button"
                      onClick={() => updateField('eadEndDate', '')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="ead-end-date"
                  type="date"
                  value={profile.eadEndDate}
                  onChange={(e) => updateField('eadEndDate', e.target.value)}
                  className={`mt-2 w-full px-3.5 py-2.5 text-sm font-mono-tabular bg-white dark:bg-slate-950 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 ${
                    getFieldError('eadEndDate')?.severity === 'error'
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Labeled &ldquo;Card Expires&rdquo; on your EAD card. Opens the 90-day STEM OPT filing window.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Issues Box */}
          {visibleValidationIssues.length > 0 && (
            <div className="space-y-2.5">
              {visibleValidationIssues.map((issue, idx) => (
                <div
                  key={`${issue.field}-${idx}`}
                  role="alert"
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                    issue.severity === 'error'
                      ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                      : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onRequestResetData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset my data
            </button>

            <div className="flex items-center gap-3">
              {isEditingExisting && onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                {isEditingExisting ? 'Save & View Timeline' : 'Calculate My Timeline'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
