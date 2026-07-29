import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, context, history } = body || {};

    const prompt = `You are a helpful AI assistant for a ModelOps evaluation workflow.

Mode: ${mode || 'form'}
Current context: ${JSON.stringify(context || {}, null, 2)}
Conversation history: ${JSON.stringify(history || [], null, 2)}

Return JSON with the following shape:
{
  "message": "A concise conversational reply",
  "suggestions": [
    {
      "id": "suggestion-1",
      "title": "Short title",
      "detail": "Why it matters",
      "field": "executive_summary",
      "value": "Improved content",
      "confidence": 0.92
    }
  ]
}

Focus on practical, evidence-based improvements for the current form or model card context.`;

    const providerResponse = await generateWithFallback(prompt);
    const rawText = providerResponse.raw_text || '';
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    const jsonText = start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = {
        message: 'I reviewed the context and prepared a concise set of recommendations.',
        suggestions: [],
      };
    }

    return NextResponse.json({
      message: typeof parsed.message === 'string' ? parsed.message : 'I reviewed the context and prepared a concise set of recommendations.',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (error) {
    logger.error('[API /api/modelops/assistant] Server Error:', error);
    return NextResponse.json({ message: 'I’m available to help tighten the narrative and improve the form context.', suggestions: [] }, { status: 500 });
  }
}
