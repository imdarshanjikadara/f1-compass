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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/checklist/generate', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate personalized checklist.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/chat/ask', async (req, res) => {
    try {
      const { question, timelineContext } = req.body || {};
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

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
      const answerText = sanitizeNonGuaranteeText(
        String(
          parsed.answer ||
            'I can only answer questions about your entered OPT/STEM OPT dates and unemployment counter. Please contact your DSO for further assistance.'
        )
      );

      res.json({
        answer: answerText,
        isOutOfScope: Boolean(parsed.isOutOfScope),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unable to answer right now.';
      res.status(500).json({ error: message });
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
