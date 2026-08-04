import axios from 'axios';

const DEFAULT_SAVE_ERROR = 'Failed to save homepage configuration';

interface HomepageSaveError {
  message: string;
  description?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getHomepageSaveError(error: unknown): HomepageSaveError {
  if (!axios.isAxiosError(error) || !isRecord(error.response?.data)) {
    return { message: DEFAULT_SAVE_ERROR };
  }

  const payload = error.response.data;
  const message = typeof payload.error === 'string' && payload.error.trim()
    ? payload.error.trim()
    : DEFAULT_SAVE_ERROR;
  const fields = isRecord(payload.details) && isRecord(payload.details.fields)
    ? payload.details.fields
    : null;

  if (!fields) return { message };

  const fieldMessages = Object.entries(fields).flatMap(([field, value]) => (
    typeof value === 'string' && value.trim() ? [`${field}: ${value.trim()}`] : []
  ));

  return fieldMessages.length > 0
    ? { message, description: fieldMessages.join('\n') }
    : { message };
}
