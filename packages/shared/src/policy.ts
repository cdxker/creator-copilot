export type SafetyCategory =
  | 'allowed'
  | 'privacy_or_coercion'
  | 'financial_harm'
  | 'account_compromise'
  | 'minors';

export type SafetyResult =
  | { safe: true; category: 'allowed' }
  | { safe: false; category: Exclude<SafetyCategory, 'allowed'> };

const rules: Array<{ category: Exclude<SafetyCategory, 'allowed'>; pattern: RegExp }> = [
  {
    category: 'minors',
    pattern: /\b(minor|underage|under 18|schoolgirl|schoolboy|child)\b/i,
  },
  {
    category: 'privacy_or_coercion',
    pattern:
      /\b(home address|doxx?|blackmail|threaten|expose (?:him|her|them)|leak (?:his|her|their)|real name|employer|family)\b/i,
  },
  {
    category: 'financial_harm',
    pattern:
      /\b(max out|credit card|take (?:out )?a loan|borrow money|go into debt|skip rent|miss rent|empty (?:your|his|her|their) account)\b/i,
  },
  {
    category: 'account_compromise',
    pattern: /\b(password|session cookie|steal (?:an? )?account|bypass 2fa|evade (?:a )?ban|hack (?:his|her|their))\b/i,
  },
];

export function classifySafety(text: string): SafetyResult {
  const match = rules.find((rule) => rule.pattern.test(text));
  return match
    ? { safe: false, category: match.category }
    : { safe: true, category: 'allowed' };
}
