/**
 * AI Provider Icons
 * =================
 * Uses @lobehub/icons.
 * Uses .Avatar sub-component for a consistent, premium look with background.
 */

import React from 'react';
import {
    OpenAI,
    Gemini,
    Anthropic,
    Mistral,
    DeepSeek,
    Grok,
    OpenRouter,
    Qwen,
    Moonshot,
    Zhipu,
} from '@lobehub/icons';

// Map provider ID to icon component using .Avatar
export const ProviderIcon = ({ provider, className = "w-6 h-6" }) => {
    // Extract numeric size
    const sizeMatch = className.match(/w-(\d+)/);
    const size = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 24;

    const props = { size, className };

    switch (provider) {
        case 'gemini':
            return <Gemini.Avatar {...props} />;
        case 'openai':
            return <OpenAI.Avatar {...props} />;
        case 'anthropic':
            return <Anthropic.Avatar {...props} />;
        case 'mistral':
            return <Mistral.Avatar {...props} />;
        case 'deepseek':
            return <DeepSeek.Avatar {...props} />;
        case 'xai':
            return <Grok.Avatar {...props} />;
        case 'openrouter':
            return <OpenRouter.Avatar {...props} />;
        case 'qwen':
            return <Qwen.Avatar {...props} />;
        case 'moonshot':
            return <Moonshot.Avatar {...props} />;
        case 'zhipu':
            return <Zhipu.Avatar {...props} />;
        default:
            return null;
    }
};

export default ProviderIcon;
