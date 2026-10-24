import {
  StudentProfile,
  ChecklistItem,
  ChecklistStepCopy,
  UnemploymentSummary,
} from '../types';
import {
  addCalendarDays,
  computeMilestoneStatus,
  diffCalendarDays,
  formatCountdown,
  formatDisplayDate,
  parseLocalDate,
} from './dateRules';

/**
 * Computes a deterministic fingerprint of the student's anonymized date & stage state
 * so cached Gemini checklist personalization knows when dates have changed.
 */
export function getChecklistProfileFingerprint(profile: StudentProfile): string {
  return [
    profile.programEndDate,
    profile.degreeLevel,
    profile.stemStatus,
    profile.optI20IssueDate || 'none',
    profile.eadStartDate || 'none',
    profile.eadEndDate || 'none',
    profile.stemI20IssueDate || 'none',
    profile.isCurrentlyOnStemOpt ? 'stem-active' : 'opt-active',
  ].join('|');
}

/**
 * Generates the complete, chronological list of checklist items where every single
 * due date is strictly calculated by F-1 Compass's deterministic rules (Rules 1-6).
 * Merges any personalized Gemini copy (`aiCopyMap`) onto the fixed rule-bound slots.
 */
export function buildRuleBoundChecklist(
  profile: StudentProfile,
  unemployment: UnemploymentSummary,
  aiCopyMap: Record<string, ChecklistStepCopy> = {}
): ChecklistItem[] {
  if (!profile.programEndDate || !parseLocalDate(profile.programEndDate)) {
    return [];
  }

  const degreeLabel =
    profile.degreeLevel === 'bachelors'
      ? "Bachelor's"
      : profile.degreeLevel === 'masters'
      ? "Master's"
      : 'PhD';

  // Rule 1: 90 days before program end date
  const optOpenStr = addCalendarDays(profile.programEndDate, -90);
  // Rule 2: 60 days after program end date
  const optClose60Str = addCalendarDays(profile.programEndDate, 60);
  // Rule 3: 30 days after OPT I-20 issue date (if entered)
  const hasOptI20 = Boolean(
    profile.optI20IssueDate && parseLocalDate(profile.optI20IssueDate)
  );
  const optI20Plus30Str = hasOptI20
    ? addCalendarDays(profile.optI20IssueDate, 30)
    : '';

  const isOptI20Earlier =
    hasOptI20 && diffCalendarDays(optI20Plus30Str, optClose60Str) <= 0;
  const optRealDeadlineStr = hasOptI20
    ? isOptI20Earlier
      ? optI20Plus30Str
      : optClose60Str
    : optClose60Str;

  const optRealDeadlineRuleCitation = hasOptI20
    ? isOptI20Earlier
      ? `Rule 3: 30 days after OPT I-20 issue date (${formatDisplayDate(profile.optI20IssueDate)}) — earlier than 60-day post-grad cutoff`
      : `Rule 2: 60 days after Program End Date (${formatDisplayDate(profile.programEndDate)}) — earlier than 30-day I-20 cutoff`
    : `Rule 2: 60 days after Program End Date (outer statutory filing limit)`;

  // For document preparation: if OPT Real Deadline is earlier than Program End Date, use OPT Real Deadline; else Program End Date
  const prepDateStr =
    diffCalendarDays(optRealDeadlineStr, profile.programEndDate) < 0
      ? optRealDeadlineStr
      : profile.programEndDate;
  const prepRuleCitation =
    prepDateStr === optRealDeadlineStr
      ? optRealDeadlineRuleCitation
      : `Rule 4: Program End Date (${formatDisplayDate(profile.programEndDate)})`;

  // Rule 4 & 6: Employer reporting & unemployment tracking anchor
  const hasEadStart = Boolean(
    profile.eadStartDate && parseLocalDate(profile.eadStartDate)
  );
  const hasEadEnd = Boolean(
    profile.eadEndDate && parseLocalDate(profile.eadEndDate)
  );

  const employerReportDateStr = hasEadStart
    ? profile.eadStartDate
    : optClose60Str;
  const employerReportCitation = hasEadStart
    ? `Rule 4: Entered OPT EAD Start Date (${formatDisplayDate(profile.eadStartDate)})`
    : `Rule 4: End of 60-Day Post-Graduation Grace Period (latest permissible OPT start date)`;

  // Rule 6: 90-day unemployment window anchor
  const unemp90DateStr = hasEadStart
    ? addCalendarDays(profile.eadStartDate, 89)
    : optClose60Str;
  const unemp90Citation = hasEadStart
    ? `Rule 6: 90-day Post-Completion OPT unemployment limit from EAD start (${formatDisplayDate(profile.eadStartDate)})`
    : `Rule 6: 90-day Post-Completion OPT unemployment rule (starts once EAD begins within the 60-day grace window)`;

  const rawItems: Array<{
    stepKey: string;
    phase: string;
    dueDateStr: string;
    isRealDeadline: boolean;
    ruleCitation: string;
    isConditionalStem?: boolean;
    defaultTitle: string;
    defaultInstruction: string;
    defaultWhyThisMatters: string;
  }> = [
    {
      stepKey: 'opt_request_dso',
      phase: 'Phase 1: DSO Recommendation & Form I-20',
      dueDateStr: optOpenStr,
      isRealDeadline: false,
      ruleCitation: 'Rule 1: Post-Completion OPT window opens 90 days before Program End Date',
      defaultTitle: 'Request Post-Completion OPT Recommendation from Your DSO',
      defaultInstruction: `Contact your school's international student office as your 90-day filing window opens for your ${degreeLabel} program and submit their OPT request form with your proposed OPT start date (between ${formatDisplayDate(addCalendarDays(profile.programEndDate, 1))} and ${formatDisplayDate(optClose60Str)}).`,
      defaultWhyThisMatters:
        'You cannot validly file Form I-765 with USCIS until your DSO enters an OPT recommendation in SEVIS and issues your updated Form I-20.',
    },
    {
      stepKey: 'opt_obtain_i20',
      phase: 'Phase 1: DSO Recommendation & Form I-20',
      dueDateStr: hasOptI20 ? profile.optI20IssueDate : optOpenStr,
      isRealDeadline: false,
      ruleCitation: hasOptI20
        ? `Rule 3: OPT Recommendation I-20 issued on ${formatDisplayDate(profile.optI20IssueDate)}`
        : 'Rule 1 & 3: Earliest date DSO can issue OPT I-20 (90 days before Program End Date)',
      defaultTitle: hasOptI20
        ? 'Verify & Sign Your OPT-Endorsed Form I-20'
        : 'Obtain Updated Form I-20 with OPT Recommendation',
      defaultInstruction: hasOptI20
        ? `Confirm that Page 2 of your Form I-20 issued on ${formatDisplayDate(profile.optI20IssueDate)} shows your DSO's OPT endorsement and sign Page 1 in ink before scanning.`
        : 'Receive your newly endorsed Form I-20 from your DSO, verify the OPT requested dates on Page 2, and sign Page 1 before uploading to USCIS.',
      defaultWhyThisMatters:
        'The date your DSO issues this Form I-20 starts a strict 30-day clock—USCIS must receive your complete OPT application within 30 days of that endorsement.',
    },
    {
      stepKey: 'opt_prepare_i765',
      phase: 'Phase 2: Form I-765 Preparation & USCIS Filing',
      dueDateStr: prepDateStr,
      isRealDeadline: false,
      ruleCitation: prepRuleCitation,
      defaultTitle: 'Prepare Form I-765 Documents & Supporting Evidence',
      defaultInstruction:
        'Assemble your signed OPT I-20, passport biographical page, most recent Form I-94 arrival record, previous CPT/OPT I-20s (if any), and U.S. passport-style photos for category (c)(3)(B).',
      defaultWhyThisMatters:
        'Missing signatures on Page 1 of Form I-20 or uploading an expired I-20 are leading triggers for USCIS Requests for Evidence (RFEs) or denials.',
    },
    {
      stepKey: 'opt_file_uscis',
      phase: 'Phase 2: Form I-765 Preparation & USCIS Filing',
      dueDateStr: optRealDeadlineStr,
      isRealDeadline: true,
      ruleCitation: optRealDeadlineRuleCitation,
      defaultTitle: 'File Form I-765 with USCIS by Your Real Deadline',
      defaultInstruction: hasOptI20
        ? `Submit your Form I-765 application so USCIS officially receives it on or before ${formatDisplayDate(optRealDeadlineStr)}.`
        : `Submit your Form I-765 application within 30 days of your DSO issuing your OPT I-20 and no later than ${formatDisplayDate(optRealDeadlineStr)}.`,
      defaultWhyThisMatters: hasOptI20
        ? `This is your binding Real Deadline: USCIS enforces the earlier of 30 days from your DSO's I-20 recommendation (${formatDisplayDate(optI20Plus30Str)}) or 60 days after program completion (${formatDisplayDate(optClose60Str)}).`
        : 'USCIS strictly enforces both the 30-day DSO I-20 rule and the 60-day post-graduation cutoff; late receipts cannot be waived.',
    },
    {
      stepKey: 'opt_track_receipt',
      phase: 'Phase 3: EAD Activation, SEVP Portal & Unemployment',
      dueDateStr: optClose60Str,
      isRealDeadline: false,
      ruleCitation: 'Rule 4: 60-Day Grace Period & Requested OPT Start Window Closes',
      defaultTitle: 'Track USCIS Form I-797C Receipt Notice & Physical EAD Card',
      defaultInstruction:
        'Save your Form I-797C receipt number immediately upon filing, verify your mailing address, and wait until you have your physical EAD card in hand (and its start date has arrived) before starting work.',
      defaultWhyThisMatters:
        'While a timely filed OPT application allows you to remain in the U.S. past your 60-day grace period while USCIS adjudicates, you cannot begin working until your EAD start date arrives and you hold the physical card.',
    },
    {
      stepKey: 'opt_report_employer_sevp',
      phase: 'Phase 3: EAD Activation, SEVP Portal & Unemployment',
      dueDateStr: employerReportDateStr,
      isRealDeadline: false,
      ruleCitation: employerReportCitation,
      defaultTitle: 'Report Employer Information to Your DSO / SEVP Portal',
      defaultInstruction:
        'Once your OPT EAD starts, activate your SEVP Portal account (or use your school’s reporting portal) and report your employer name, address, start date, and how the role directly relates to your degree field within 10 days of any change.',
      defaultWhyThisMatters:
        'SEVIS automatically counts every day after your EAD start date as unemployment unless qualifying employment (at least 20 hours/week related to your major) is properly reported.',
    },
    {
      stepKey: 'opt_track_unemployment',
      phase: 'Phase 3: EAD Activation, SEVP Portal & Unemployment',
      dueDateStr: unemp90DateStr,
      isRealDeadline: false,
      ruleCitation: unemp90Citation,
      defaultTitle: 'Track Your 90-Day Post-Completion OPT Unemployment Limit',
      defaultInstruction: `Monitor your cumulative unemployed days carefully (currently ${unemployment.usedDays} of ${unemployment.maxAllowedDays} days used) and keep offer letters, pay stubs, or supervisor records showing at least 20 hours per week in your field.`,
      defaultWhyThisMatters:
        'Accruing more than 90 days of unemployment during initial Post-Completion OPT can jeopardize your F-1 status maintenance and future immigration filings.',
    },
  ];

  // Add Phase 4: STEM OPT Extension steps if STEM is 'yes' or 'unsure'
  if (profile.stemStatus === 'yes' || profile.stemStatus === 'unsure') {
    const isConditionalStem = profile.stemStatus === 'unsure';
    const stemOpenStr = hasEadEnd
      ? addCalendarDays(profile.eadEndDate, -90)
      : optClose60Str;
    const stemOpenCitation = hasEadEnd
      ? `Rule 5: STEM OPT window opens 90 days before OPT EAD End Date (${formatDisplayDate(profile.eadEndDate)})`
      : 'Rule 5: STEM OPT window opens 90 days before your initial 12-month OPT EAD expires (enter EAD dates once received)';

    const hasStemI20 = Boolean(
      profile.stemI20IssueDate && parseLocalDate(profile.stemI20IssueDate)
    );
    const stemI20Plus60Str = hasStemI20
      ? addCalendarDays(profile.stemI20IssueDate, 60)
      : '';
    const isStemI20Earlier =
      hasEadEnd &&
      hasStemI20 &&
      diffCalendarDays(stemI20Plus60Str, profile.eadEndDate) < 0;

    const stemRealDeadlineStr = hasEadEnd
      ? isStemI20Earlier
        ? stemI20Plus60Str
        : profile.eadEndDate
      : optClose60Str;

    const stemRealCitation = hasEadEnd
      ? isStemI20Earlier
        ? `Rule 5: 60 days after STEM OPT I-20 issue date (${formatDisplayDate(profile.stemI20IssueDate)}) — earlier than EAD expiration`
        : `Rule 5: Initial OPT EAD Expiration Date (${formatDisplayDate(profile.eadEndDate)})`
      : 'Rule 5: STEM OPT application must be received before your initial OPT EAD expires and within 60 days of your STEM I-20';

    rawItems.push(
      {
        stepKey: 'stem_request_i20',
        phase: 'Phase 4: 24-Month STEM OPT Extension',
        dueDateStr: stemOpenStr,
        isRealDeadline: false,
        isConditionalStem,
        ruleCitation: stemOpenCitation,
        defaultTitle: isConditionalStem
          ? 'Verify STEM CIP Code & Complete Form I-983 Training Plan with Employer'
          : 'Complete Form I-983 Training Plan & Request STEM OPT I-20 from DSO',
        defaultInstruction:
          'Confirm your employer is enrolled in E-Verify, complete the Form I-983 Training Plan with your supervisor, and submit it to your DSO to request a STEM OPT recommendation I-20.',
        defaultWhyThisMatters:
          'A DSO cannot issue a STEM OPT Form I-20 until they review a complete, signed Form I-983 Training Plan from an E-Verify employer.',
      },
      {
        stepKey: 'stem_file_uscis',
        phase: 'Phase 4: 24-Month STEM OPT Extension',
        dueDateStr: stemRealDeadlineStr,
        isRealDeadline: hasEadEnd,
        isConditionalStem,
        ruleCitation: stemRealCitation,
        defaultTitle: isConditionalStem
          ? 'File 24-Month STEM OPT Extension (Form I-765) If Eligible'
          : 'File Form I-765 for 24-Month STEM OPT Extension Before Real Deadline',
        defaultInstruction: hasEadEnd
          ? `Submit your STEM OPT Form I-765 (category (c)(3)(C)), STEM-endorsed I-20, and degree evidence so USCIS receives it on or before ${formatDisplayDate(stemRealDeadlineStr)}.`
          : 'Once your OPT EAD dates are active, file your STEM OPT extension within 90 days before EAD expiration and within 60 days of the DSO STEM I-20 endorsement.',
        defaultWhyThisMatters:
          'Filing a timely STEM OPT extension before your current EAD expires (and within 60 days of your STEM I-20 issue date) can automatically extend work authorization for up to 180 days while USCIS adjudicates.',
      },
      {
        stepKey: 'stem_track_unemployment',
        phase: 'Phase 4: 24-Month STEM OPT Extension',
        dueDateStr: stemRealDeadlineStr,
        isRealDeadline: false,
        isConditionalStem,
        ruleCitation:
          'Rule 6: 150-day cumulative unemployment allowance across Post-Completion OPT + STEM OPT',
        defaultTitle:
          'Maintain 6-Month STEM Validation Reports & 150-Day Total Unemployment Cap',
        defaultInstruction:
          'Submit mandatory SEVIS validation reports to your DSO every 6 months, annual Form I-983 self-evaluations, and ensure total cumulative unemployment across initial OPT and STEM OPT stays within 150 days.',
        defaultWhyThisMatters:
          'STEM OPT adds 60 additional unemployment days (for 150 days total across both periods) and requires formal 6-month DSO validations to keep your SEVIS record active.',
      }
    );
  }

  return rawItems.map((item) => {
    const daysFromToday = diffCalendarDays(item.dueDateStr);
    const statusObj = computeMilestoneStatus(daysFromToday, item.isRealDeadline);
    const customCopy = aiCopyMap[item.stepKey];

    return {
      stepKey: item.stepKey,
      phase: item.phase,
      dueDateStr: item.dueDateStr,
      dueDateFormatted: formatDisplayDate(item.dueDateStr),
      daysFromToday,
      countdownText: formatCountdown(daysFromToday),
      status: statusObj.status,
      statusLabel: statusObj.statusLabel,
      isRealDeadline: item.isRealDeadline,
      ruleCitation: item.ruleCitation,
      isConditionalStem: item.isConditionalStem,
      title: customCopy?.title || item.defaultTitle,
      instruction: customCopy?.instruction || item.defaultInstruction,
      whyThisMatters: customCopy?.whyThisMatters || item.defaultWhyThisMatters,
    };
  });
}
