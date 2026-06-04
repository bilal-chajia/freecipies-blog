import { describe, expect, it } from 'vitest';
import { CreateCustomProviderSchema } from '../ai';

describe('CreateCustomProviderSchema', () => {
    it('rejects ids that collide with built-in providers', () => {
        const result = CreateCustomProviderSchema.safeParse({
            id: 'openai',
            label: 'OpenAI proxy',
            base_url: 'https://proxy.example.com/v1',
            api_key: 'sk-test',
        });

        expect(result.success).toBe(false);
    });
});
