/**
 * AI Generate API Endpoint
 * ========================
 * POST /api/admin/ai/generate
 * 
 * Generates content using the configured AI provider.
 */

import type { APIRoute } from 'astro';
import { handleGenerateContent } from '@server/api/admin/ai/generate.handler';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleGenerateContent(request);
