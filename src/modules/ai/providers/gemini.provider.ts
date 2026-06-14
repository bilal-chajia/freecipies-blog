/**
 * AI Provider - Google Gemini (built-in)
 * =======================================
 * Thin wrapper over GeminiCompatibleProvider bound to the public Gemini API base.
 */

import { GeminiCompatibleProvider } from './gemini-compatible.provider';

export class GeminiProvider extends GeminiCompatibleProvider {
    constructor(apiKey: string) {
        super('gemini', 'https://generativelanguage.googleapis.com', apiKey);
    }
}
