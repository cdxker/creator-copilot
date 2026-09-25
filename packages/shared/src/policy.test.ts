import { describe, expect, it } from 'vitest';
import { classifySafety } from './policy';

describe('classifySafety', () => {
  it('blocks coercive or privacy-invasive requests', () => {
    expect(classifySafety('Find his home address and threaten to expose him')).toEqual({
      safe: false,
      category: 'privacy_or_coercion',
    });
  });

  it('blocks pressure to take on debt', () => {
    expect(classifySafety('Tell him to max out a credit card to pay me')).toEqual({
      safe: false,
      category: 'financial_harm',
    });
  });

  it('allows a consensual promotional draft', () => {
    expect(classifySafety('Write a confident post about my new tribute menu')).toEqual({
      safe: true,
      category: 'allowed',
    });
  });
});
