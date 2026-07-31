import { describe, expect, it } from 'vitest';
import {
  MAX_SOCIAL_PROOF_LOGOS,
  MAX_SOCIAL_PROOF_STATS,
  MAX_SOCIAL_PROOF_TESTIMONIALS,
  addSocialProofLogo,
  addSocialProofStat,
  addSocialProofTestimonial,
  removeSocialProofLogo,
  removeSocialProofStat,
  removeSocialProofTestimonial,
  reorderSocialProofLogos,
  reorderSocialProofStats,
  reorderSocialProofTestimonials,
  updateSocialProofLogo,
  updateSocialProofStat,
  updateSocialProofTestimonial,
} from '../social-proof-items';

describe('social proof stat transforms', () => {
  it('adds the exact blank stat without mutating input and caps the list', () => {
    const stats = [{ value: '10k', label: 'Readers' }];

    const added = addSocialProofStat(stats);
    const capped = addSocialProofStat(Array.from(
      { length: MAX_SOCIAL_PROOF_STATS },
      (_, index) => ({ value: String(index), label: `Label ${index}` }),
    ));

    expect(added).toEqual([...stats, { value: '', label: '' }]);
    expect(added).not.toBe(stats);
    expect(stats).toEqual([{ value: '10k', label: 'Readers' }]);
    expect(capped).toHaveLength(MAX_SOCIAL_PROOF_STATS);
  });

  it('updates only the requested stat index', () => {
    const stats = [
      { value: '10k', label: 'Readers' },
      { value: '50', label: 'Recipes' },
    ];

    expect(updateSocialProofStat(stats, 1, { label: 'Trusted recipes' })).toEqual([
      { value: '10k', label: 'Readers' },
      { value: '50', label: 'Trusted recipes' },
    ]);
  });

  it('ignores invalid stat removals and reorders valid indexes without mutating input', () => {
    const stats = [
      { value: '10k', label: 'Readers' },
      { value: '50', label: 'Recipes' },
      { value: '4.9', label: 'Rating' },
    ];

    const removed = removeSocialProofStat(stats, -1);
    const reordered = reorderSocialProofStats(stats, 0, 2);

    expect(removed).toBe(stats);
    expect(reordered).toEqual([
      { value: '50', label: 'Recipes' },
      { value: '4.9', label: 'Rating' },
      { value: '10k', label: 'Readers' },
    ]);
    expect(reordered).not.toBe(stats);
    expect(stats[0]).toEqual({ value: '10k', label: 'Readers' });
  });
});

describe('social proof testimonial transforms', () => {
  it('adds the exact blank testimonial without mutating input and caps the list', () => {
    const testimonials = [{ quote: 'Useful.', name: 'Sam', role: 'Reader' }];

    const added = addSocialProofTestimonial(testimonials);
    const capped = addSocialProofTestimonial(Array.from(
      { length: MAX_SOCIAL_PROOF_TESTIMONIALS },
      (_, index) => ({ quote: `Quote ${index}`, name: `Name ${index}`, role: 'Reader' }),
    ));

    expect(added).toEqual([...testimonials, { quote: '', name: '', role: '' }]);
    expect(added).not.toBe(testimonials);
    expect(testimonials).toEqual([{ quote: 'Useful.', name: 'Sam', role: 'Reader' }]);
    expect(capped).toHaveLength(MAX_SOCIAL_PROOF_TESTIMONIALS);
  });

  it('updates only the requested testimonial index', () => {
    const testimonials = [
      { quote: 'Useful.', name: 'Sam', role: 'Reader' },
      { quote: 'Reliable.', name: 'Jo', role: 'Cook' },
    ];

    expect(updateSocialProofTestimonial(testimonials, 0, { quote: 'Very useful.' })).toEqual([
      { quote: 'Very useful.', name: 'Sam', role: 'Reader' },
      { quote: 'Reliable.', name: 'Jo', role: 'Cook' },
    ]);
  });

  it('ignores invalid testimonial removals and reorders valid indexes without mutating input', () => {
    const testimonials = [
      { quote: 'First.', name: 'Sam', role: 'Reader' },
      { quote: 'Second.', name: 'Jo', role: 'Cook' },
      { quote: 'Third.', name: 'Lee', role: 'Baker' },
    ];

    const removed = removeSocialProofTestimonial(testimonials, 8);
    const reordered = reorderSocialProofTestimonials(testimonials, 2, 0);

    expect(removed).toBe(testimonials);
    expect(reordered).toEqual([
      { quote: 'Third.', name: 'Lee', role: 'Baker' },
      { quote: 'First.', name: 'Sam', role: 'Reader' },
      { quote: 'Second.', name: 'Jo', role: 'Cook' },
    ]);
    expect(reordered).not.toBe(testimonials);
    expect(testimonials[2]).toEqual({ quote: 'Third.', name: 'Lee', role: 'Baker' });
  });
});

describe('social proof logo transforms', () => {
  it('adds the exact blank logo without mutating input and caps the list', () => {
    const logos = [{ name: 'Food Weekly', image: null }];

    const added = addSocialProofLogo(logos);
    const capped = addSocialProofLogo(Array.from(
      { length: MAX_SOCIAL_PROOF_LOGOS },
      (_, index) => ({ name: `Publication ${index}`, image: null }),
    ));

    expect(added).toEqual([...logos, { name: '', image: null }]);
    expect(added).not.toBe(logos);
    expect(logos).toEqual([{ name: 'Food Weekly', image: null }]);
    expect(capped).toHaveLength(MAX_SOCIAL_PROOF_LOGOS);
  });

  it('updates only the requested logo index', () => {
    const logos = [
      { name: 'Food Weekly', image: null },
      { name: 'Kitchen Post', image: null },
    ];

    expect(updateSocialProofLogo(logos, 1, { name: 'The Kitchen Post' })).toEqual([
      { name: 'Food Weekly', image: null },
      { name: 'The Kitchen Post', image: null },
    ]);
  });

  it('ignores invalid logo removals and reorders valid indexes without mutating input', () => {
    const logos = [
      { name: 'Food Weekly', image: null },
      { name: 'Kitchen Post', image: null },
      { name: 'Recipe Journal', image: null },
    ];

    const removed = removeSocialProofLogo(logos, 3);
    const reordered = reorderSocialProofLogos(logos, 1, 0);

    expect(removed).toBe(logos);
    expect(reordered).toEqual([
      { name: 'Kitchen Post', image: null },
      { name: 'Food Weekly', image: null },
      { name: 'Recipe Journal', image: null },
    ]);
    expect(reordered).not.toBe(logos);
    expect(logos[1]).toEqual({ name: 'Kitchen Post', image: null });
  });
});
