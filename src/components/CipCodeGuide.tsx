import React, { useState } from 'react';
import { COMMON_CIP_EXAMPLES } from '../data/cipData';
import { StemDesignation } from '../types';
import { ExternalLink, Info, Search, X } from 'lucide-react';

interface CipCodeGuideProps {
  currentStemStatus: StemDesignation;
  onSelectStemStatus: (status: StemDesignation) => void;
  onClose?: () => void;
}

export const CipCodeGuide: React.FC<CipCodeGuideProps> = ({
  currentStemStatus,
  onSelectStemStatus,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = COMMON_CIP_EXAMPLES.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.cipPrefix.toLowerCase().includes(q) ||
      item.exampleCode.toLowerCase().includes(q) ||
      item.fieldTitle.toLowerCase().includes(q) ||
      item.commonMajors.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-7 space-y-5 overflow-hidden">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
            How to Verify If Your Degree Is STEM-Designated (CIP Code Guide)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            STEM OPT eligibility is determined by the 6-digit DHS CIP code printed on your Form I-20—not by what your department calls your major.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close CIP Code Guide"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Important Top Accuracy Note & Official DHS Link */}
      <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/35 border border-teal-200/90 dark:border-teal-800/80 space-y-2.5">
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
          <Info className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
          <p className="font-medium">
            Majors with the same name can have different CIP codes at different schools. Only the exact 6-digit code on your I-20 matters.
          </p>
        </div>
        <div className="pl-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-5">
          <a
            href="https://www.ice.gov/sites/default/files/documents/stem-list.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 underline underline-offset-4 break-words"
          >
            <span>Check your exact code on the official DHS STEM Designated Degree Program List (PDF)</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          <a
            href="https://nces.ed.gov/ipeds/cipcode/default.aspx?y=56"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 underline underline-offset-4 break-words"
          >
            <span>Look up CIP code definitions on NCES (2020 Edition)</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
      </div>

      {/* Step-by-step instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        <div className="p-4 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
          <div className="font-semibold text-teal-800 dark:text-teal-300">
            01. Locate &ldquo;Program of Study&rdquo;
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
            Look at <strong>Page 1 of your Form I-20</strong> in the middle box labeled &ldquo;Program of Study&rdquo; next to &ldquo;Major 1&rdquo; or &ldquo;Major 2&rdquo;.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
          <div className="font-semibold text-teal-800 dark:text-teal-300">
            02. Read the 6-Digit Code
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
            Find the 6-digit number formatted like <span className="font-mono-tabular font-semibold">11.0701</span> or <span className="font-mono-tabular font-semibold">14.0901</span> printed right beside your major name.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
          <div className="font-semibold text-teal-800 dark:text-teal-300">
            03. Update Your Status Below
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
            Verify your exact 6-digit code on the official DHS list and set your status below to <strong>Yes</strong>, <strong>No</strong>, or <strong>Not sure</strong>.
          </p>
        </div>
      </div>

      {/* Search & Quick Status Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CIP code or major"
            className="block w-full min-w-0 max-w-full box-border pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        {/* Label above buttons on mobile, one line on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Your STEM status:
          </span>
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5">
            {(
              [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'unsure', label: 'Not sure' },
              ] as { value: StemDesignation; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectStemStatus(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  currentStemStatus === opt.value
                    ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600'
                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Stacked Cards (<768px) */}
      <div className="md:hidden space-y-3">
        {filteredEntries.map((entry) => (
          <div
            key={entry.exampleCode}
            className="p-4 rounded-xl bg-[#F7F9FA] dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono-tabular font-bold text-sm text-slate-900 dark:text-slate-100">
                {entry.cipPrefix}{' '}
                <span className="text-xs font-normal text-slate-500">
                  (e.g. {entry.exampleCode})
                </span>
              </span>
            </div>

            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {entry.fieldTitle}
            </div>

            <div className="text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Majors: </span>
              {entry.commonMajors}
            </div>

            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">DHS STEM List: </span>
              {entry.stemEligible ? (
                <span className="font-semibold text-teal-700 dark:text-teal-400">
                  Often included, verify exact code
                </span>
              ) : (
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Not on STEM list, verify exact code
                </span>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200/80 dark:border-slate-800">
              {entry.notes}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop Reference Table (>=768px) */}
      <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F7F9FA] dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <th className="py-2.5 px-3 font-semibold">CIP Series / Code</th>
              <th className="py-2.5 px-3 font-semibold">Field &amp; Common Majors</th>
              <th className="py-2.5 px-3 font-semibold">DHS STEM List</th>
              <th className="py-2.5 px-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredEntries.map((entry) => (
              <tr
                key={entry.exampleCode}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-2.5 px-3 font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {entry.cipPrefix}
                  <span className="block text-[11px] font-normal text-slate-500">
                    e.g. {entry.exampleCode}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {entry.fieldTitle}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {entry.commonMajors}
                  </div>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {entry.stemEligible ? (
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      Often included, verify exact code
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Not on STEM list, verify exact code
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {entry.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

