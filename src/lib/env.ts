import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logger } from './logger';

export const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
});

export type EnvSchema = z.infer<typeof envSchema>;
let cachedEnv: Partial<EnvSchema> | null = null;

/** Reset the cached environment. Only for use in tests. */
export function resetEnvCache(): void {
  cachedEnv = null;
}

function parseEnvFileContents(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const normalized = contents.replace(/^\uFEFF/, '');

  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function findEnvDirectory(startDir: string): string {
  const candidates = [startDir, process.env.INIT_CWD || '', process.cwd()];
  const uniqueCandidates: string[] = [];
  for (const candidate of candidates) {
    if (candidate && !uniqueCandidates.includes(candidate)) {
      uniqueCandidates.push(candidate);
    }
  }

  for (const candidate of uniqueCandidates) {
    let current = path.resolve(candidate);
    while (true) {
      if (fs.existsSync(path.join(current, '.env.local')) || fs.existsSync(path.join(current, '.env'))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  return path.resolve(startDir);
}

function loadEnvFromFiles(cwd: string): Record<string, string> {
  const envDir = findEnvDirectory(cwd);
  const candidates = [path.join(envDir, '.env.local'), path.join(envDir, '.env')];
  const merged: Record<string, string> = {};

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;

    const buffer = fs.readFileSync(filePath);
    const isUtf16 = buffer[0] === 0xff && buffer[1] === 0xfe || buffer[0] === 0xfe && buffer[1] === 0xff;
    const contents = isUtf16 ? buffer.toString('utf16le') : buffer.toString('utf8');
    Object.assign(merged, parseEnvFileContents(contents));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }

  return merged;
}

export function getEnv(cwd: string = process.cwd()): Partial<EnvSchema> {
  if (cachedEnv) return cachedEnv;

  loadEnvFromFiles(cwd);

  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    if (isProd) {
      console.error('[ENV] Missing API keys. You must provide GROQ_API_KEY and GEMINI_API_KEY in your environment.');
      throw parsed.error;
    } else if (isTest) {
      cachedEnv = envSchema.partial().parse(process.env);
      return cachedEnv;
    } else {
      const missingKeys = parsed.error.issues.map((i) => i.path.join('.'));
      for (const key of missingKeys) {
        logger.warn(`[ENV]\nMissing ${key}`);
      }
      cachedEnv = envSchema.partial().parse(process.env);
      return cachedEnv;
    }
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
