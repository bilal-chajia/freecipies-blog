import { beforeEach, describe, expect, it, vi } from 'vitest';

const { normalizeHomepageSettingsFromAdmin, updateHomepageSettings } = vi.hoisted(() => ({
  normalizeHomepageSettingsFromAdmin: vi.fn((value: unknown) => value),
  updateHomepageSettings: vi.fn(),
}));

vi.mock('cloudflare:workers', () => ({ env: { DB: {} } }));
vi.mock('@modules/settings/services/homepage-settings-images', () => ({
  normalizeHomepageSettingsFromAdmin,
  presentHomepageSettingsForAdmin: vi.fn((value: unknown) => value),
}));
vi.mock('@modules/settings/services/settings.service', () => ({
  getHomepageSettings: vi.fn(),
  updateHomepageSettings,
}));

import { PUT } from '../homepage';

const put = async (body: unknown): Promise<Response> => PUT({
  request: new Request('https://example.com/api/settings/homepage', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),
} as Parameters<typeof PUT>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  normalizeHomepageSettingsFromAdmin.mockImplementation((value: unknown) => value);
});

describe('PUT /api/settings/homepage', () => {
  it('preserves AppError status, code, and Zod field details', async () => {
    const response = await put({ sections: 'not-an-array' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
      details: {
        fields: {
          sections: expect.any(String),
        },
      },
    });
    expect(updateHomepageSettings).not.toHaveBeenCalled();
  });

  it('keeps an unknown update failure generic', async () => {
    normalizeHomepageSettingsFromAdmin.mockImplementation(() => {
      throw new Error('sensitive persistence failure');
    });

    const response = await put({});

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Failed to update homepage settings',
      code: 'INTERNAL_ERROR',
    });
  });
});
