/**
 * AI Provider - Anthropic Claude (built-in)
 * ==========================================
 * Thin wrapper over AnthropicCompatibleProvider bound to the public Anthropic API base.
 */

import { AnthropicCompatibleProvider } from './anthropic-compatible.provider';

export class AnthropicProvider extends AnthropicCompatibleProvider {
    constructor(apiKey: string) {
        super('anthropic', 'https://api.anthropic.com', apiKey);
    }
}
