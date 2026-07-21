import { generateGroqResponse } from './groq';
import { generateGeminiResponse } from './gemini';

export async function generateWithFallback(prompt: string) {
  try {
    return await generateGroqResponse(prompt);
  } catch (error) {
    console.log('Falling back to Gemini...');
    return await generateGeminiResponse(prompt);
  }
}
