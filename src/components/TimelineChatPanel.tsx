import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  RealDeadlineSummary,
  StudentProfile,
  TimelineMilestone,
  UnemploymentSummary,
} from '../types';
import {
  addCalendarDays,
  formatDisplayDate,
  getTodayLocal,
  toDateInputString,
} from '../utils/dateRules';
import {
  AlertTriangle,
  MessageSquare,
  Send,
  Trash2,
  X,
} from 'lucide-react';

interface TimelineChatPanelProps {
  profile: StudentProfile;
  milestones: TimelineMilestone[];
  realDeadlines: RealDeadlineSummary[];
  unemployment: UnemploymentSummary;
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
}

const STARTER_PROMPTS = [
  'What happens if I file on day 59?',
  'How many unemployment days do I have left?',
  'What is my Real Deadline and why?',
  'Can I travel outside the US while OPT is pending?',
];

export const TimelineChatPanel: React.FC<TimelineChatPanelProps> = ({
  profile,
  milestones,
  realDeadlines,
  unemployment,
  messages,
  onUpdateMessages,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, mobileDrawerOpen]);

  const sendQuestion = async (questionText: string, isStarter = false) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    onUpdateMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const todayStr = toDateInputString(getTodayLocal());
      const day59Str = profile.programEndDate
        ? addCalendarDays(profile.programEndDate, 59)
        : '';
      const day60Str = profile.programEndDate
        ? addCalendarDays(profile.programEndDate, 60)
        : '';
      const optOpenStr = profile.programEndDate
        ? addCalendarDays(profile.programEndDate, -90)
        : '';
      const optI20Plus30Str = profile.optI20IssueDate
        ? addCalendarDays(profile.optI20IssueDate, 30)
        : null;

      const timelineContext = {
        todayDate: formatDisplayDate(todayStr),
        degreeLevel: profile.degreeLevel,
        stemStatus: profile.stemStatus,
        enteredDates: {
          programEndDate: profile.programEndDate
            ? formatDisplayDate(profile.programEndDate)
            : 'Not entered yet',
          optI20IssueDate: profile.optI20IssueDate
            ? formatDisplayDate(profile.optI20IssueDate)
            : 'Not entered yet',
          eadStartDate: profile.eadStartDate
            ? formatDisplayDate(profile.eadStartDate)
            : 'Not entered yet',
          eadEndDate: profile.eadEndDate
            ? formatDisplayDate(profile.eadEndDate)
            : 'Not entered yet',
          stemI20IssueDate: profile.stemI20IssueDate
            ? formatDisplayDate(profile.stemI20IssueDate)
            : 'Not entered yet',
        },
        calculatedReferenceDates: {
          optWindowOpensMinus90d: optOpenStr ? formatDisplayDate(optOpenStr) : 'Pending program end date',
          day59AfterProgramEnd: day59Str ? formatDisplayDate(day59Str) : 'Pending program end date',
          day60PostGradAndGraceEnd: day60Str ? formatDisplayDate(day60Str) : 'Pending program end date',
          optI20Plus30DaysCutoff: optI20Plus30Str
            ? formatDisplayDate(optI20Plus30Str)
            : 'Not applicable until OPT I-20 date is entered',
        },
        realDeadlines: realDeadlines.map((rd) => ({
          type: rd.type,
          realDeadlineDate: rd.realDateFormatted,
          countdown: rd.countdownText,
          winningRule: rd.winningRule,
          comparedCutoff: rd.otherRuleDateFormatted,
          explanation: rd.explanation,
        })),
        unemploymentCounter: {
          mode: unemployment.mode,
          stage: unemployment.isOnStem
            ? 'Active STEM OPT (150 days total cap)'
            : 'Post-Completion OPT (90 days cap)',
          usedDays: unemployment.usedDays,
          remainingDays: unemployment.remainingDays,
          maxAllowedDays: unemployment.maxAllowedDays,
          isOverLimit: unemployment.isOverLimit,
          windowSummary: unemployment.activeEadWindowText,
        },
        allCalculatedMilestones: milestones.map((m) => ({
          title: m.title,
          date: m.dateFormatted,
          countdown: m.countdownText,
          status: m.statusLabel,
          isRealDeadline: m.isRealDeadline,
          explanation: m.explanation,
        })),
      };

      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          mode: isStarter ? 'starter' : 'custom',
          timelineContext,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOutOfScope: Boolean(data.isOutOfScope),
      };

      onUpdateMessages([...nextMessages, assistantMessage]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach timeline assistant.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const renderChatBody = () => (
    <div className="space-y-4">
      {/* Starter Prompt Buttons */}
      <div className="space-y-2">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Ask about your calculated dates &amp; rules:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading}
              onClick={() => sendQuestion(prompt, true)}
              className="px-2.5 py-1.5 text-xs text-left font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div
        ref={scrollContainerRef}
        className="max-h-72 overflow-y-auto space-y-3 pr-1 border-t border-slate-100 dark:border-slate-800/80 pt-3"
      >
        {messages.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              Select a starter prompt above or ask your own question about your OPT filing window, 30-day I-20 cutoff, grace period, or unemployment counter.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Answers use only your entered dates and F-1 Compass&apos;s built-in rules.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-700 dark:bg-teal-600 text-white'
                    : msg.isOutOfScope
                    ? 'bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100'
                }`}
              >
                {msg.isOutOfScope && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Outside Built-In Rules · Consult DSO or Attorney</span>
                  </div>
                )}
                <p>{msg.text}</p>
              </div>
              <span className="mt-1 text-[10px] font-mono-tabular text-slate-400 dark:text-slate-500">
                {msg.role === 'user' ? 'You' : 'F-1 Compass'} · {msg.timestamp}
              </span>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-start">
            <div className="rounded-xl px-3.5 py-2.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Checking your calculated timeline dates...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1 min-w-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., What happens if I file on day 59?"
          className="flex-1 min-w-0 max-w-full box-border px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
        Answers are based strictly on your entered dates and built-in rules, not legal advice. For H-1B, travel, CPT, or legal questions, contact your DSO or an immigration attorney.
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop & Inline Side-Column Card */}
      <section
        id="chat-assistant-section"
        className="bg-white dark:bg-[#111921] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
              <span>Ask About Your Timeline</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rule-grounded Q&amp;A using only your entered dates
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => onUpdateMessages([])}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
              title="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {renderChatBody()}
      </section>

      {/* Mobile Collapsible Quick-Access Trigger & Drawer: Compact round icon-only button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        {!mobileDrawerOpen ? (
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Ask Timeline Q&A"
            title="Ask Timeline Q&A"
            className="w-11 h-11 flex items-center justify-center text-white bg-teal-700 dark:bg-teal-600 rounded-full shadow-lg hover:bg-teal-800 dark:hover:bg-teal-500 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        ) : (
          <div className="fixed inset-x-3 bottom-3 z-50 bg-white dark:bg-[#111921] border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl p-4 sm:p-5 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                Ask About Your Timeline
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded"
                aria-label="Close mobile chat drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderChatBody()}
          </div>
        )}
      </div>
    </>
  );
};
