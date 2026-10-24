/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatMessage, ChecklistStepCopy, StudentProfile } from './types';
import {
  calculateTimeline,
  calculateUnemployment,
  formatDisplayDate,
  parseLocalDate,
  validateProfile,
} from './utils/dateRules';
import {
  buildRuleBoundChecklist,
  getChecklistProfileFingerprint,
} from './utils/checklistRules';
import { OnboardingForm } from './components/OnboardingForm';
import { TimelineView } from './components/TimelineView';
import { MyChecklistView } from './components/MyChecklistView';
import { TimelineChatPanel } from './components/TimelineChatPanel';
import { UnemploymentTracker } from './components/UnemploymentTracker';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { CipCodeGuide } from './components/CipCodeGuide';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  Compass,
  Edit3,
  Heart,
  HelpCircle,
  Lock,
  Menu,
  MessageSquare,
  Moon,
  RotateCcw,
  Scale,
  Settings,
  Sun,
  X,
} from 'lucide-react';

const STORAGE_KEY_PROFILE = 'f1_compass_profile_v1';
const STORAGE_KEY_ONBOARDED = 'f1_compass_onboarded_v1';
const STORAGE_KEY_THEME = 'f1_compass_theme_v1';
const STORAGE_KEY_CHECKLIST_CHECKED = 'f1_compass_checklist_checked_v1';
const STORAGE_KEY_CHECKLIST_AI_CACHE = 'f1_compass_checklist_ai_cache_v1';
const STORAGE_KEY_CHAT_HISTORY = 'f1_compass_chat_history_v1';

interface CachedAiChecklist {
  fingerprint: string;
  copyMap: Record<string, ChecklistStepCopy>;
}

/**
 * First-time users start with an empty programEndDate so they see the calm,
 * welcoming empty state alongside the setup form.
 */
function createEmptyProfile(): StudentProfile {
  return {
    name: '',
    programEndDate: '',
    degreeLevel: 'masters',
    stemStatus: 'yes',
    optI20IssueDate: '',
    eadStartDate: '',
    eadEndDate: '',
    stemI20IssueDate: '',
    unemploymentMode: 'tracker',
    manualUnemploymentDays: 0,
    isCurrentlyOnStemOpt: false,
    employmentPeriods: [],
  };
}

export default function App() {
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...createEmptyProfile(), ...parsed };
      }
    } catch {
      // Fallback if localStorage is unavailable or malformed
    }
    return createEmptyProfile();
  });

  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY_ONBOARDED) === 'true';
    } catch {
      return false;
    }
  });

  const [isEditingDates, setIsEditingDates] = useState<boolean>(() => !hasCompletedOnboarding);
  const [activeTab, setActiveTab] = useState<'timeline' | 'checklist'>('timeline');
  const [activeNavItem, setActiveNavItem] = useState<
    'timeline' | 'checklist' | 'qa' | 'unemployment' | 'cip'
  >('timeline');
  const [showCipGuide, setShowCipGuide] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [gearMenuOpen, setGearMenuOpen] = useState<boolean>(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState<boolean>(false);

  // Persistent Checked Map for Checklist Items
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_CHECKLIST_CHECKED);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return {};
  });

  // Cached Gemini Personalized Checklist Copy
  const [aiCache, setAiCache] = useState<CachedAiChecklist | null>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_CHECKLIST_AI_CACHE);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return null;
  });

  // Persistent Timeline Q&A Chat History
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_CHAT_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  // Close modals and menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResetConfirmModal) setShowResetConfirmModal(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (gearMenuOpen) setGearMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirmModal, mobileMenuOpen, gearMenuOpen]);

  // Persist profile locally in browser
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // Ignore storage errors
    }
  }, [profile]);

  // Persist checked items locally in browser
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_CHECKLIST_CHECKED,
        JSON.stringify(checkedMap)
      );
    } catch {
      // Ignore
    }
  }, [checkedMap]);

  // Persist AI checklist copy cache locally in browser
  useEffect(() => {
    try {
      if (aiCache) {
        window.localStorage.setItem(
          STORAGE_KEY_CHECKLIST_AI_CACHE,
          JSON.stringify(aiCache)
        );
      }
    } catch {
      // Ignore
    }
  }, [aiCache]);

  // Persist Chat History locally in browser
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_CHAT_HISTORY,
        JSON.stringify(chatMessages)
      );
    } catch {
      // Ignore
    }
  }, [chatMessages]);

  const validationIssues = useMemo(() => validateProfile(profile), [profile]);
  const hasBlockingErrors = validationIssues.some((i) => i.severity === 'error');

  const { milestones, nextStep, realDeadlines, filingWindowClosedAlert } = useMemo(
    () => calculateTimeline(profile),
    [profile]
  );

  const unemploymentSummary = useMemo(
    () => calculateUnemployment(profile),
    [profile]
  );

  const currentFingerprint = useMemo(
    () => getChecklistProfileFingerprint(profile),
    [profile]
  );

  const activeAiCopyMap = useMemo(() => {
    if (aiCache && aiCache.fingerprint === currentFingerprint) {
      return aiCache.copyMap;
    }
    return {};
  }, [aiCache, currentFingerprint]);

  const checklistItems = useMemo(
    () => buildRuleBoundChecklist(profile, unemploymentSummary, activeAiCopyMap),
    [profile, unemploymentSummary, activeAiCopyMap]
  );

  const generatePersonalizedChecklist = useCallback(async () => {
    if (!profile.programEndDate || !parseLocalDate(profile.programEndDate)) return;
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const baseSlots = buildRuleBoundChecklist(profile, unemploymentSummary, {});
      const response = await fetch('/api/checklist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degreeLevel: profile.degreeLevel,
          stemStatus: profile.stemStatus,
          hasOptI20: Boolean(profile.optI20IssueDate),
          hasEad: Boolean(profile.eadStartDate && profile.eadEndDate),
          hasStemI20: Boolean(profile.stemI20IssueDate),
          usedUnemploymentDays: unemploymentSummary.usedDays,
          maxAllowedUnemploymentDays: unemploymentSummary.maxAllowedDays,
          slots: baseSlots,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        const newMap: Record<string, ChecklistStepCopy> = {};
        for (const item of data.items) {
          if (item.stepKey && item.title && item.instruction && item.whyThisMatters) {
            newMap[item.stepKey] = {
              stepKey: item.stepKey,
              title: item.title,
              instruction: item.instruction,
              whyThisMatters: item.whyThisMatters,
            };
          }
        }
        setAiCache({
          fingerprint: currentFingerprint,
          copyMap: newMap,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach Gemini personalization service';
      setAiError(msg);
    } finally {
      setIsGeneratingAi(false);
    }
  }, [profile, unemploymentSummary, currentFingerprint]);

  // Smart Hybrid Mode: My Checklist runs 100% on the built-in deterministic checklist engine (0 API calls)

  const handleToggleChecklistStep = (stepKey: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const handleCompleteOnboarding = () => {
    setHasCompletedOnboarding(true);
    setIsEditingDates(false);
    try {
      window.localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmAndExecuteReset = () => {
    const fresh = createEmptyProfile();
    setProfile(fresh);
    setHasCompletedOnboarding(false);
    setIsEditingDates(true);
    setShowCipGuide(false);
    setCheckedMap({});
    setAiCache(null);
    setChatMessages([]);
    setAiError(null);
    setShowResetConfirmModal(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY_PROFILE);
      window.localStorage.removeItem(STORAGE_KEY_ONBOARDED);
      window.localStorage.removeItem(STORAGE_KEY_CHECKLIST_CHECKED);
      window.localStorage.removeItem(STORAGE_KEY_CHECKLIST_AI_CACHE);
      window.localStorage.removeItem(STORAGE_KEY_CHAT_HISTORY);
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    if (isEditingDates && !hasBlockingErrors && profile.programEndDate) {
      setIsEditingDates(false);
      setHasCompletedOnboarding(true);
    }
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const degreeLabelMap = {
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'PhD',
  };

  const stemLabelMap = {
    yes: 'STEM-Designated',
    no: 'Non-STEM (12m OPT)',
    unsure: 'STEM Unsure (Conditional)',
  };

  const completedChecklistCount = checklistItems.filter((i) => checkedMap[i.stepKey]).length;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#F7F9FA] dark:bg-[#0B1116] text-slate-900 dark:text-slate-100 transition-colors pb-20 lg:pb-0">
      {/* HEADER: Full nav + Edit Dates + Light Mode + Gear Menu on >=1024px (lg:); Logo + Light Mode icon + Hamburger icon on <1024px */}
      <header className="relative z-30 bg-white dark:bg-[#111921] border-b border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand lockup with simple Compass icon + wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 font-display"
          >
            <Compass className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>F-1 Compass</span>
          </a>

          {/* Zone 2 (>=1024px only): 5 concise single-line text navigation links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => {
                setActiveTab('timeline');
                setActiveNavItem('timeline');
                setShowCipGuide(false);
                if (isEditingDates) setIsEditingDates(false);
                scrollToSection('timeline-workspace');
              }}
              className={`hover:text-teal-800 dark:hover:text-teal-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                !isEditingDates && activeTab === 'timeline' && !showCipGuide && activeNavItem === 'timeline'
                  ? 'text-teal-800 dark:text-teal-300 font-semibold'
                  : ''
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('checklist');
                setActiveNavItem('checklist');
                setShowCipGuide(false);
                if (isEditingDates) setIsEditingDates(false);
                scrollToSection('timeline-workspace');
              }}
              className={`hover:text-teal-800 dark:hover:text-teal-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                !isEditingDates && activeTab === 'checklist' && !showCipGuide && activeNavItem === 'checklist'
                  ? 'text-teal-800 dark:text-teal-300 font-semibold'
                  : ''
              }`}
            >
              My Checklist
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavItem('qa');
                scrollToSection('chat-assistant-section');
              }}
              className={`hover:text-teal-800 dark:hover:text-teal-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                !isEditingDates && activeNavItem === 'qa'
                  ? 'text-teal-800 dark:text-teal-300 font-semibold'
                  : ''
              }`}
            >
              Ask Q&amp;A
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNavItem('unemployment');
                scrollToSection('unemployment-section');
              }}
              className={`hover:text-teal-800 dark:hover:text-teal-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                !isEditingDates && activeNavItem === 'unemployment'
                  ? 'text-teal-800 dark:text-teal-300 font-semibold'
                  : ''
              }`}
            >
              Unemployment
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCipGuide((prev) => {
                  const next = !prev;
                  setActiveNavItem(next ? 'cip' : activeTab);
                  return next;
                });
                scrollToSection('cip-guide-section');
              }}
              className={`hover:text-teal-800 dark:hover:text-teal-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                showCipGuide
                  ? 'text-teal-800 dark:text-teal-300 font-semibold'
                  : ''
              }`}
            >
              CIP Guide
            </button>
          </nav>

          {/* Zone 3 (>=1024px): Main button + Light Mode toggle + Gear icon menu */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isEditingDates && !hasBlockingErrors && profile.programEndDate) {
                  handleCompleteOnboarding();
                } else {
                  setIsEditingDates((prev) => !prev);
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isEditingDates ? 'View Timeline' : 'Edit Dates'}
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Desktop Gear Icon Menu containing "Reset my data" */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setGearMenuOpen((prev) => !prev)}
                aria-label="Settings and data options"
                aria-expanded={gearMenuOpen}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>

              {gearMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setGearMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 z-50 bg-white dark:bg-[#111921] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setGearMenuOpen(false);
                        setShowResetConfirmModal(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Reset my data</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile & Tablet (<1024px) Controls: Compact Light Mode icon + Hamburger menu icon ONLY */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Hamburger Menu Slide-In / Dropdown Panel (<1024px) */}
        {mobileMenuOpen && (
          <>
            {/* Tap outside backdrop */}
            <div
              className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Mobile Navigation Menu"
              className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] z-50 bg-white dark:bg-[#111921] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-5 lg:hidden overflow-y-auto"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="inline-flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-50 font-display">
                    <Compass className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span>F-1 Compass</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('timeline');
                      setActiveNavItem('timeline');
                      setShowCipGuide(false);
                      if (isEditingDates) setIsEditingDates(false);
                      setMobileMenuOpen(false);
                      scrollToSection('timeline-workspace');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      !isEditingDates && activeTab === 'timeline' && !showCipGuide && activeNavItem === 'timeline'
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Timeline</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('checklist');
                      setActiveNavItem('checklist');
                      setShowCipGuide(false);
                      if (isEditingDates) setIsEditingDates(false);
                      setMobileMenuOpen(false);
                      scrollToSection('timeline-workspace');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      !isEditingDates && activeTab === 'checklist' && !showCipGuide && activeNavItem === 'checklist'
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span>My Checklist</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNavItem('qa');
                      setMobileMenuOpen(false);
                      scrollToSection('chat-assistant-section');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      !isEditingDates && activeNavItem === 'qa'
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span>Ask Q&amp;A</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveNavItem('unemployment');
                      setMobileMenuOpen(false);
                      scrollToSection('unemployment-section');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      !isEditingDates && activeNavItem === 'unemployment'
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0" />
                    <span>Unemployment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCipGuide(true);
                      setActiveNavItem('cip');
                      setMobileMenuOpen(false);
                      scrollToSection('cip-guide-section');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                      showCipGuide
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span>CIP Guide</span>
                  </button>
                </nav>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (isEditingDates && !hasBlockingErrors && profile.programEndDate) {
                        handleCompleteOnboarding();
                      } else {
                        setIsEditingDates((prev) => !prev);
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingDates ? 'View Timeline' : 'Edit Dates'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom of Hamburger Menu: Reset my data */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowResetConfirmModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset my data</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* COMPACT DISCLAIMER BAR WITH "MORE" EXPANDER */}
      <div className="bg-slate-100/90 dark:bg-[#111921]/95 border-b border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs text-slate-700 dark:text-slate-300 flex items-start sm:items-center gap-2 leading-normal">
            <Scale className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              {disclaimerExpanded ? (
                <>
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    Disclaimer:
                  </strong>{' '}
                  This tool is for planning only and is not legal advice. Rules can change. Always confirm dates with your school&apos;s DSO and official USCIS guidance.{' '}
                  <button
                    type="button"
                    onClick={() => setDisclaimerExpanded(false)}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline ml-1"
                  >
                    Less
                  </button>
                </>
              ) : (
                <>
                  <strong className="font-semibold text-slate-900 dark:text-slate-100">
                    Disclaimer:
                  </strong>{' '}
                  Planning tool only, not legal advice. Always confirm dates with your DSO and official USCIS guidance.{' '}
                  <button
                    type="button"
                    onClick={() => setDisclaimerExpanded(true)}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline ml-1"
                  >
                    More
                  </button>
                </>
              )}
            </span>
          </p>
        </div>
      </div>

      {/* MAIN CONTENT VIEWPORT */}
      <main
        id="timeline-workspace"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8"
      >
        {/* Optional CIP Code Guide Drawer */}
        {showCipGuide && (
          <div id="cip-guide-section">
            <CipCodeGuide
              currentStemStatus={profile.stemStatus}
              onSelectStemStatus={(newStatus) =>
                setProfile((prev) => ({
                  ...prev,
                  stemStatus: newStatus,
                  ...(newStatus === 'no'
                    ? { stemI20IssueDate: '', isCurrentlyOnStemOpt: false }
                    : {}),
                }))
              }
              onClose={() => setShowCipGuide(false)}
            />
          </div>
        )}

        {isEditingDates ? (
          <OnboardingForm
            profile={profile}
            onChange={setProfile}
            onSubmit={handleCompleteOnboarding}
            onOpenCipGuide={() => setShowCipGuide(true)}
            onRequestResetData={() => setShowResetConfirmModal(true)}
            validationIssues={validationIssues}
            isEditingExisting={hasCompletedOnboarding}
            onCancelEdit={
              hasCompletedOnboarding ? () => setIsEditingDates(false) : undefined
            }
          />
        ) : (
          <>
            {/* Profile Context Summary Card: Equal-width tabs on mobile + cleanly wrapping chips */}
            <div className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              {/* Segmented Workspace Tab Switcher: Equal width (grid-cols-2) on mobile */}
              <div className="grid grid-cols-2 md:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('timeline');
                    setActiveNavItem('timeline');
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'timeline'
                      ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>Timeline ({milestones.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('checklist');
                    setActiveNavItem('checklist');
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'checklist'
                      ? 'bg-white dark:bg-[#111921] text-slate-900 dark:text-slate-50 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span>
                    My Checklist ({completedChecklistCount}/{checklistItems.length})
                  </span>
                </button>
              </div>

              {/* Profile Summary Chips: Wrap neatly without stray · separators or orphaned Edit Dates */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {profile.name && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F7F9FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100">
                    {profile.name}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F7F9FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {degreeLabelMap[profile.degreeLevel]}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F7F9FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  {stemLabelMap[profile.stemStatus]}
                </span>
                {profile.programEndDate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F9FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <span>Program End:</span>
                    <strong className="font-mono-tabular text-slate-900 dark:text-slate-100">
                      {formatDisplayDate(profile.programEndDate)}
                    </strong>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditingDates(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-100/70 dark:hover:bg-teal-950/70 transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3 h-3 shrink-0" />
                  <span>Edit Dates</span>
                </button>
              </div>
            </div>

            {/* 12-Column Desktop Grid: 7 Cols Primary View (Timeline or My Checklist) + 5 Cols Chat Q&A, Unemployment & What-If Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              <div className="lg:col-span-7 min-w-0">
                {activeTab === 'timeline' ? (
                  <TimelineView
                    profile={profile}
                    milestones={milestones}
                    nextStep={nextStep}
                    realDeadlines={realDeadlines}
                    filingWindowClosedAlert={filingWindowClosedAlert}
                    onEditDates={() => setIsEditingDates(true)}
                    onOpenCipGuide={() => {
                      setShowCipGuide(true);
                      scrollToSection('cip-guide-section');
                    }}
                  />
                ) : (
                  <MyChecklistView
                    profile={profile}
                    items={checklistItems}
                    checkedMap={checkedMap}
                    onToggleStep={handleToggleChecklistStep}
                    onEditDates={() => setIsEditingDates(true)}
                  />
                )}
              </div>

              <div className="lg:col-span-5 min-w-0 space-y-7">
                <TimelineChatPanel
                  profile={profile}
                  milestones={milestones}
                  realDeadlines={realDeadlines}
                  unemployment={unemploymentSummary}
                  messages={chatMessages}
                  onUpdateMessages={setChatMessages}
                />

                <UnemploymentTracker
                  profile={profile}
                  summary={unemploymentSummary}
                  onChange={setProfile}
                  onEditDates={() => setIsEditingDates(true)}
                />

                <WhatIfSimulator
                  profile={profile}
                  onApplySimulatedDates={(updated) => setProfile(updated)}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* FOOTER WITH PERSISTENT DISCLAIMER, SAVED LOCALLY NOTE & CREATOR CREDIT */}
      <footer className="bg-white dark:bg-[#111921] border-t border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p className="max-w-2xl leading-relaxed">
            This tool is for planning only and is not legal advice. Rules can change. Always confirm dates with your school&apos;s DSO and official USCIS guidance.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Lock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>Saved locally in browser</span>
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span>Built with</span>
              <Heart className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 fill-teal-700/20 dark:fill-teal-400/20 shrink-0" />
              <span>for F-1 students by</span>
              <a
                href="https://www.linkedin.com/in/imdarshanjikadara/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-2"
              >
                Darshan Jikadara
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* TWO-STEP CONFIRMATION MODAL FOR "RESET MY DATA" */}
      {showResetConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#111921] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="reset-modal-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-50"
                  >
                    Reset all saved F-1 Compass data?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close confirmation dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently clear your entered I-20 and EAD dates, logged employment periods, checked checklist items, and timeline Q&amp;A history from this browser.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndExecuteReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Yes, reset my data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
