import { describe, expect, it } from 'vitest';
import { getHomepageSaveError } from '../homepage-save-error';

describe('getHomepageSaveError', () => {
  it('returns the server validation message and field details for an Axios error', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          success: false,
          error: 'Social feed must contain at least 3 items when enabled',
          code: 'VALIDATION_ERROR',
          details: {
            fields: {
              'sections.9.items': 'Social feed must contain at least 3 items when enabled',
              'sections.9.title': 'Social feed title is required when enabled',
            },
          },
        },
      },
    };

    expect(getHomepageSaveError(error)).toEqual({
      message: 'Social feed must contain at least 3 items when enabled',
      description: 'sections.9.items: Social feed must contain at least 3 items when enabled\nsections.9.title: Social feed title is required when enabled',
    });
  });

  it('does not expose unknown client errors', () => {
    expect(getHomepageSaveError(new Error('sensitive internal failure'))).toEqual({
      message: 'Failed to save homepage configuration',
    });
  });
});
