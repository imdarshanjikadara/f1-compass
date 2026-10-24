import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function sanitizeNonGuaranteeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\bdefinitely eligible\b/gi, 'potentially eligible (confirm with your DSO)')
    .replace(/\bguaranteed to be approved\b/gi, 'subject to USCIS review')
    .replace(/\byou are eligible\b/gi, 'if confirmed eligible by your DSO')
    .replace(/\byou will be approved\b/gi, 'once adjudicated by USCIS');
}

/**
 * Checks if a user question asks about out-of-scope immigration or legal topics
 * beyond F-1 Compass's 6 built-in OPT and STEM OPT deadline/unemployment rules.
 */
function detectOutOfScopeTopic(question: string): string | null {
  const q = question.toLowerCase();

  if (/\b(h-?1b|h1-?b|cap[\s-]?gap|lottery)\b/i.test(q)) {
    return 'H-1B visas and Cap-Gap extensions';
  }
  if (
    /\b(travel|travelling|traveling|flight|leave the us|leave the country|outside the us|re-?enter|re-?entry|port of entry|customs|cbp|visa stamp|visa renewal|expired visa|passport renewal)\b/i.test(
      q
    )
  ) {
    return 'international travel, visa renewal, and U.S. re-entry rules';
  }
  if (
    /\b(change of status|cos\b|f-?2\b|b-?1\b|b-?2\b|j-?1\b|o-?1\b|h-?4\b|green card|i-?140|i-?485|adjustment of status|asylum|marriage)\b/i.test(
      q
    )
  ) {
    return 'change of status or other visa categories';
  }
  if (/\b(cpt\b|curricular practical training|pre-?completion opt|severe economic hardship)\b/i.test(q)) {
    return 'CPT, Pre-Completion OPT, or economic hardship authorization';
  }
  if (
    /\b(rfe\b|request for evidence|denied|denial|motion to reopen|appeal|i-?290b|unlawful presence|deportation|out of status|terminated sevis|reinstatement|lawyer|attorney|legal advice|tax|taxes|ssn|social security)\b/i.test(
      q
    )
  ) {
    return 'specific legal situations, RFEs/denials, SEVIS reinstatement, or tax/SSN rules';
  }

  return null;
}

const FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
] as const;

interface TimelineContextPayload {
  todayDate?: string;
  degreeLevel?: string;
  stemStatus?: string;
  enteredDates?: {
    programEndDate?: string;
    optI20IssueDate?: string;
    eadStartDate?: string;
    eadEndDate?: string;
    stemI20IssueDate?: string;
  };
  calculatedReferenceDates?: {
    optWindowOpensMinus90d?: string;
    day59AfterProgramEnd?: string;
    day60PostGradAndGraceEnd?: string;
    optI20Plus30DaysCutoff?: string;
  };
  realDeadlines?: Array<{
    type?: string;
    realDeadlineDate?: string;
    countdown?: string;
    winningRule?: string;
    comparedCutoff?: string;
    explanation?: string;
  }>;
  unemploymentCounter?: {
    mode?: string;
    stage?: string;
    usedDays?: number;
    remainingDays?: number;
    maxAllowedDays?: number;
    isOverLimit?: boolean;
    windowSummary?: string;
  };
  allCalculatedMilestones?: Array<{
    title?: string;
    date?: string;
    countdown?: string;
    status?: string;
    isRealDeadline?: boolean;
    explanation?: string;
  }>;
}

/**
 * Generates an accurate, rule-grounded answer directly from the student's
 * calculated `timelineContext` whenever the upstream LLM is experiencing a 503
 * spike or when running locally without an API key.
 */
function buildDeterministicTimelineAnswer(
  question: string,
  ctx: TimelineContextPayload = {}
): { answer: string; isOutOfScope: boolean } {
  const q = question.toLowerCase();
  const entered = ctx.enteredDates || {};
  const refs = ctx.calculatedReferenceDates || {};
  const realDeadlines = Array.isArray(ctx.realDeadlines) ? ctx.realDeadlines : [];
  const optReal = realDeadlines.find((d) => d.type === 'opt') || realDeadlines[0];
  const stemReal = realDeadlines.find((d) => d.type === 'stem');
  const unemp = ctx.unemploymentCounter || {};

  const progEnd = entered.programEndDate || 'your Program End Date';
  const day59 = refs.day59AfterProgramEnd || '59 days after your Program End Date';
  const day60 = refs.day60PostGradAndGraceEnd || '60 days after your Program End Date';
  const optOpen = refs.optWindowOpensMinus90d || '90 days before your Program End Date';
  const optI20 = entered.optI20IssueDate;
  const opt30Cutoff = refs.optI20Plus30DaysCutoff;

  // 1. Day 59 / Day 60 / Grace period filing questions
  if (/\b(day\s*59|day\s*60|59th|60th|grace\s*period|late|after\s*graduation)\b/i.test(q)) {
    if (optI20 && optI20 !== 'Not entered yet' && opt30Cutoff && !opt30Cutoff.startsWith('Not applicable')) {
      return {
        answer: `Day 59 after your Program End Date (${progEnd}) is ${day59}, and your 60-day post-graduation filing window and grace period close on ${day60}. However, because your OPT I-20 was issued on ${optI20}, USCIS must also receive your application within 30 days of that I-20 date (${opt30Cutoff})—making your Real Deadline ${optReal?.realDeadlineDate || opt30Cutoff} (${optReal?.countdown || 'whichever comes first'}). If you file on ${day59}, your application is only valid if ${day59} is on or before your 30-day I-20 cutoff and USCIS officially receipts it before ${day60}; confirm your exact filing plan with your DSO.`,
        isOutOfScope: false,
      };
    }
    return {
      answer: `Day 59 after your Program End Date (${progEnd}) is ${day59}, which is 1 day before your 60-day post-completion OPT filing window and grace period close on ${day60}. Under F-1 Compass's built-in rules, USCIS must officially receive your Form I-765 on or before ${day60} AND within 30 days of when your DSO issues your OPT recommendation I-20. Filing as late as ${day59} leaves almost no buffer if you still need to request your OPT I-20 from your DSO, so request your I-20 and confirm your submission date with your DSO right away.`,
      isOutOfScope: false,
    };
  }

  // 2. Unemployment counter questions
  if (/\b(unemploy|job|work|90\s*day|150\s*day|days\s*left|remaining\s*days)\b/i.test(q)) {
    const used = unemp.usedDays ?? 0;
    const rem = unemp.remainingDays ?? 90;
    const max = unemp.maxAllowedDays ?? 90;
    const stage = unemp.stage || 'Post-Completion OPT (90 days cap)';
    return {
      answer: `Based on your ${stage} tracker, you have used ${used} of ${max} allowed unemployment days and have ${rem} days remaining (${unemp.windowSummary || 'based on your entered EAD dates'}). Remember that qualifying OPT employment must be at least 20 hours per week in your field of study and reported to your DSO/SEVP Portal; always verify your SEVIS employment record with your DSO.`,
      isOutOfScope: false,
    };
  }

  // 3. STEM OPT questions
  if (/\b(stem|24[\s-]?month|extension|i-?983)\b/i.test(q)) {
    if (ctx.stemStatus === 'no') {
      return {
        answer: `Your profile is currently set to Non-STEM, so the 24-month STEM OPT extension rules do not apply (you are tracked under the standard 12-month Post-Completion OPT window opening ${optOpen} and closing ${day60}). If your degree's 6-digit CIP code on Page 1 of your Form I-20 is on the official DHS STEM list, update your STEM status in Edit Dates and confirm with your DSO.`,
        isOutOfScope: false,
      };
    }
    if (stemReal) {
      return {
        answer: `For your 24-month STEM OPT extension, your Real Deadline for USCIS to receive Form I-765 is ${stemReal.realDeadlineDate} (${stemReal.countdown}), governed by ${stemReal.winningRule}. ${stemReal.explanation || 'USCIS must receive your STEM OPT application before your current EAD expires and within 60 days of your DSO issuing your STEM OPT I-20.'} Please confirm your Form I-983 and STEM I-20 timing with your DSO.`,
        isOutOfScope: false,
      };
    }
    return {
      answer: `Under Rule 5, the 24-month STEM OPT extension filing window opens 90 days before your initial OPT EAD end date and closes on your EAD expiration date, and USCIS must receive your application within 60 days of your DSO's STEM I-20 recommendation (whichever date comes earlier). Enter your OPT EAD Start and End dates in Edit Dates to calculate your exact STEM OPT dates, and confirm eligibility with your DSO.`,
      isOutOfScope: false,
    };
  }

  // 4. Real Deadline / 30-day I-20 rule / When to apply questions
  if (/\b(real\s*deadline|deadline|30[\s-]?day|i-?20|window|when\s*can\s*i\s*apply|when\s*should\s*i|earliest|latest|cutoff)\b/i.test(q)) {
    if (optReal) {
      return {
        answer: `Your Post-Completion OPT Real Deadline is ${optReal.realDeadlineDate} (${optReal.countdown}), determined by ${optReal.winningRule}. ${optReal.explanation || `Your OPT filing window opens on ${optOpen} (90 days before ${progEnd}) and closes on ${day60} (60 days after ${progEnd}), or 30 days after your OPT I-20 is issued—whichever comes first.`} Always confirm your exact dates with your DSO before filing with USCIS.`,
        isOutOfScope: false,
      };
    }
    return {
      answer: `Based on your Program End Date (${progEnd}), your Post-Completion OPT filing window opens on ${optOpen} (90 days before program end) and closes on ${day60} (60 days after program end). Once your DSO issues your OPT recommendation I-20, USCIS must receive your Form I-765 within 30 days of that I-20 issue date or by ${day60}, whichever comes earlier. Please confirm all dates with your DSO.`,
      isOutOfScope: false,
    };
  }

  // 5. General summary of the student's calculated timeline
  if (optReal) {
    return {
      answer: `Based on your Program End Date of ${progEnd}, your OPT filing window runs from ${optOpen} to ${day60}, and your current Real Deadline is ${optReal.realDeadlineDate} (${optReal.countdown}) under ${optReal.winningRule}. You also have ${unemp.remainingDays ?? 90} of ${unemp.maxAllowedDays ?? 90} unemployment days remaining. Please confirm all filing dates and requirements with your school's DSO.`,
      isOutOfScope: false,
    };
  }

  return {
    answer: `Based on your entered dates (Program End Date: ${progEnd}), your Post-Completion OPT window opens 90 days before graduation (${optOpen}) and closes 60 days after graduation (${day60}), subject to the strict 30-day DSO I-20 rule. Please check your timeline milestones or confirm specific details with your school's DSO.`,
    isOutOfScope: false,
  };
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  let lastError: unknown = null;
  for (const modelName of FALLBACK_MODELS) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: modelName,
      });
    } catch (err: unknown) {
      lastError = err;
      // Continue to next fallback model on 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, or network error
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/checklist/generate', async (req, res) => {
    const {
      degreeLevel,
      stemStatus,
      hasOptI20,
      hasEad,
      hasStemI20,
      usedUnemploymentDays,
      maxAllowedUnemploymentDays,
      slots,
    } = req.body || {};

    if (!Array.isArray(slots) || slots.length === 0) {
      res.status(400).json({ error: 'Checklist slots are required.' });
      return;
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({ items: [] });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptPayload = {
        studentSituation: {
          degreeLevel,
          stemStatus,
          hasOptI20Issued: Boolean(hasOptI20),
          hasActiveOptEad: Boolean(hasEad),
          hasStemOptI20Issued: Boolean(hasStemI20),
          unemploymentCounter: `${usedUnemploymentDays ?? 0} of ${maxAllowedUnemploymentDays ?? 90} days used`,
        },
        ruleCalculatedChecklistSlots: slots.map((s: Record<string, unknown>) => ({
          stepKey: s.stepKey,
          phase: s.phase,
          ruleCalculatedDueDate: s.dueDateFormatted,
          countdownFromToday: s.countdownText,
          ruleCitation: s.ruleCitation,
          defaultTitle: s.title,
        })),
      };

      const systemInstruction = [
        'You are an F-1 international student immigration planning assistant generating personalized checklist copy for the "F-1 Compass" web app.',
        'STRICT RULES:',
        '1. You will receive an array of deterministic checklist slots (`ruleCalculatedChecklistSlots`), each with a `stepKey` and a `ruleCalculatedDueDate` computed by the app.',
        '2. Return an array with the exact same `stepKey` values. NEVER invent new dates or alter the app-calculated dates.',
        '3. Tailor each item `title` (concise action headline, 5-10 words), `instruction` (1-2 actionable plain-English sentences tailored to the student degree level, STEM status, and whether they already have their OPT I-20 or EAD), and `whyThisMatters` (1-2 plain-English sentences explaining why this step and deadline matter).',
        '4. NEVER tell the student they are definitely eligible or approved for OPT or STEM OPT. Always frame eligibility and approval as conditional on DSO verification and official USCIS adjudication.',
      ].join('\n');

      const response = await generateContentWithFallback(ai, {
        contents: JSON.stringify(promptPayload),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepKey: {
                  type: Type.STRING,
                  description: 'Exact stepKey matching the input slot.',
                },
                title: {
                  type: Type.STRING,
                  description: 'Actionable checklist item title.',
                },
                instruction: {
                  type: Type.STRING,
                  description: 'Personalized 1-2 sentence step instruction.',
                },
                whyThisMatters: {
                  type: Type.STRING,
                  description: 'Plain-English 1-2 sentence explanation of why this step matters.',
                },
              },
              required: ['stepKey', 'title', 'instruction', 'whyThisMatters'],
            },
          },
        },
      });

      const rawText = response.text || '[]';
      const parsed = JSON.parse(rawText);

      const sanitizedItems = Array.isArray(parsed)
        ? parsed.map((item: Record<string, string>) => ({
            stepKey: String(item.stepKey || ''),
            title: sanitizeNonGuaranteeText(String(item.title || '')),
            instruction: sanitizeNonGuaranteeText(String(item.instruction || '')),
            whyThisMatters: sanitizeNonGuaranteeText(String(item.whyThisMatters || '')),
          }))
        : [];

      res.json({ items: sanitizedItems });
    } catch {
      // Gracefully fall back to the built-in deterministic checklist items if all models are busy (503)
      res.json({ items: [] });
    }
  });

  app.post('/api/chat/ask', async (req, res) => {
    try {
      const { question, mode, timelineContext } = req.body || {};
      const trimmedQuestion = String(question || '').trim();

      if (!trimmedQuestion) {
        res.status(400).json({ error: 'Please enter a question.' });
        return;
      }

      // 1. Deterministic check for out-of-scope topics (H-1B, travel, COS, CPT, legal situations)
      const outOfScopeTopic = detectOutOfScopeTopic(trimmedQuestion);
      if (outOfScopeTopic) {
        res.json({
          answer: `I can't answer questions about ${outOfScopeTopic} reliably because F-1 Compass only calculates dates using its 6 built-in Post-Completion OPT and STEM OPT deadline and unemployment rules. Please contact your school's DSO or a qualified immigration attorney for guidance on your situation.`,
          isOutOfScope: true,
        });
        return;
      }

      // 2. Smart Hybrid Mode: Starter prompt buttons are answered 100% deterministically (0 API tokens)
      if (mode === 'starter') {
        res.json(buildDeterministicTimelineAnswer(trimmedQuestion, timelineContext));
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json(buildDeterministicTimelineAnswer(trimmedQuestion, timelineContext));
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = [
        'You are the F-1 Compass Timeline Assistant, helping an F-1 student understand their own calculated OPT and STEM OPT timeline.',
        'STRICT RULES YOU MUST FOLLOW:',
        '1. Answer using ONLY the student\'s entered dates, calculated timeline milestones, and the app\'s 6 built-in rules provided in `timelineContext`:',
        '   - Rule 1: Post-completion OPT filing window opens 90 days before Program End Date.',
        '   - Rule 2: Post-completion OPT filing window closes 60 days after Program End Date.',
        '   - Rule 3: If an OPT recommendation I-20 date is entered, USCIS must receive the application within 30 days of that date; whichever deadline comes first (30-day I-20 rule or 60-day post-graduation cutoff) is the Real Deadline.',
        '   - Rule 4: Grace period is Program End Date + 60 days, and the requested OPT start date must fall within this window.',
        '   - Rule 5: If OPT EAD dates are entered, the STEM OPT filing window opens 90 days before the EAD end date and closes on the EAD end date; if a STEM OPT I-20 date is entered, USCIS must also receive the application within 60 days of that date (whichever is earlier is the Real Deadline).',
        '   - Rule 6: Unemployment counter allows 90 days on Post-Completion OPT, or 150 days total if on STEM OPT.',
        '2. Keep your answer short (2 to 4 plain-English sentences) and cite the exact calculated dates from `timelineContext`.',
        '3. If the student asks about ANY topic outside these 6 built-in rules (such as H-1B, Cap-Gap, international travel, visa stamps, change of status, CPT, RFEs, taxes, or complex legal situations), set `isOutOfScope` to true and say that you cannot answer reliably and recommend contacting their school\'s DSO or an immigration attorney.',
        '4. Never give legal advice or guarantee eligibility or approval. Always remind them to confirm dates with their DSO.',
      ].join('\n');

      try {
        const response = await generateContentWithFallback(ai, {
          contents: JSON.stringify({
            studentQuestion: trimmedQuestion,
            timelineContext,
          }),
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: {
                  type: Type.STRING,
                  description: 'Short 2-4 sentence plain-English response grounded strictly in the provided dates and rules.',
                },
                isOutOfScope: {
                  type: Type.BOOLEAN,
                  description: 'True if the question is outside the 6 built-in OPT/STEM OPT timeline and unemployment rules.',
                },
              },
              required: ['answer', 'isOutOfScope'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed.answer) {
          res.json({
            answer: sanitizeNonGuaranteeText(String(parsed.answer)),
            isOutOfScope: Boolean(parsed.isOutOfScope),
          });
          return;
        }
      } catch {
        // If all upstream Gemini models return 503 UNAVAILABLE or 429, fall through to deterministic answer
      }

      res.json(buildDeterministicTimelineAnswer(trimmedQuestion, timelineContext));
    } catch {
      res.json(
        buildDeterministicTimelineAnswer(
          String(req.body?.question || ''),
          req.body?.timelineContext
        )
      );
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`F-1 Compass server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
