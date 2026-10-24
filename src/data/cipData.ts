export interface CipCodeEntry {
  cipPrefix: string;
  exampleCode: string;
  fieldTitle: string;
  commonMajors: string;
  stemEligible: boolean;
  notes: string;
}

export const COMMON_CIP_EXAMPLES: CipCodeEntry[] = [
  {
    cipPrefix: '11.xxxx',
    exampleCode: '11.0701',
    fieldTitle: 'Computer & Information Sciences',
    commonMajors: 'Computer Science, Artificial Intelligence, Information Technology, Cybersecurity',
    stemEligible: true,
    notes: 'Many 11.xxxx codes are on the DHS STEM list, but some sub-codes are not. Verify your exact 6-digit code on Page 1 of your I-20.',
  },
  {
    cipPrefix: '14.xxxx',
    exampleCode: '14.0901',
    fieldTitle: 'Engineering',
    commonMajors: 'Electrical, Mechanical, Civil, Chemical, Computer, Biomedical, Aerospace, Industrial Engineering',
    stemEligible: true,
    notes: 'Most 14.xxxx Engineering codes are included on the DHS STEM list; always confirm the exact 6-digit code printed on your I-20.',
  },
  {
    cipPrefix: '15.xxxx',
    exampleCode: '15.0000',
    fieldTitle: 'Engineering Technologies',
    commonMajors: 'Engineering Technology, Mechatronics, Robotics Technology, Electromechanical Technology',
    stemEligible: true,
    notes: 'Many 15.xxxx series programs are included, though eligibility depends on your exact 6-digit code on Page 1 of your I-20.',
  },
  {
    cipPrefix: '26.xxxx',
    exampleCode: '26.0101',
    fieldTitle: 'Biological & Biomedical Sciences',
    commonMajors: 'Biology, Biochemistry, Molecular Biology, Neuroscience, Bioinformatics, Genetics, Pharmacology',
    stemEligible: true,
    notes: 'Many 26.xxxx Biological and Biomedical Sciences codes are included; check your exact 6-digit code against the official DHS list.',
  },
  {
    cipPrefix: '27.xxxx',
    exampleCode: '27.0101',
    fieldTitle: 'Mathematics & Statistics',
    commonMajors: 'Mathematics, Applied Mathematics, Statistics, Financial Mathematics, Computational Math',
    stemEligible: true,
    notes: 'Many 27.xxxx Mathematics and Statistics codes are included; confirm your exact 6-digit code on Page 1 of your I-20.',
  },
  {
    cipPrefix: '30.xxxx',
    exampleCode: '30.7001',
    fieldTitle: 'Data Science & Interdisciplinary Studies',
    commonMajors: 'Data Science (30.7001), Data Analytics (30.7101), Business Analytics (30.7102), Cognitive Science (30.2501)',
    stemEligible: true,
    notes: 'Interdisciplinary 30.xxxx codes vary widely by school; only specific 6-digit codes (such as 30.7001) appear on the DHS STEM list.',
  },
  {
    cipPrefix: '40.xxxx',
    exampleCode: '40.0501',
    fieldTitle: 'Physical Sciences',
    commonMajors: 'Physics, Chemistry, Astrophysics, Materials Science, Atmospheric Sciences, Geology',
    stemEligible: true,
    notes: 'Many 40.xxxx Physical Sciences codes are on the DHS STEM list; verify the exact 6-digit code printed on your I-20.',
  },
  {
    cipPrefix: '45.0603',
    exampleCode: '45.0603',
    fieldTitle: 'Econometrics & Quantitative Economics',
    commonMajors: 'Quantitative Economics, Econometrics (Note: General Economics 45.0601 is NOT on the STEM list)',
    stemEligible: true,
    notes: 'Check Page 1 of your I-20 carefully: 45.0603 (Econometrics) is on the DHS STEM list, whereas 45.0601 (General Economics) is not.',
  },
  {
    cipPrefix: '52.13xx',
    exampleCode: '52.1301',
    fieldTitle: 'Management Science & Quantitative Methods',
    commonMajors: 'Management Science (52.1301), Business Statistics (52.1302), Actuarial Science (52.1304), Financial Analytics',
    stemEligible: true,
    notes: 'Some quantitative business programs use 52.1301, while standard Business Administration (52.0201) is not on the DHS STEM list.',
  },
  {
    cipPrefix: '52.0201',
    exampleCode: '52.0201',
    fieldTitle: 'General Business Administration & Management',
    commonMajors: 'General MBA, Business Administration, Marketing, Human Resources',
    stemEligible: false,
    notes: '52.0201 is not on the DHS STEM list (eligible for 12-month post-completion OPT only). Always check the exact code on your I-20.',
  },
];

