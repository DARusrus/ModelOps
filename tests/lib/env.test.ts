import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getEnv, resetEnvCache } from '../../src/lib/env';

describe('env loader', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    resetEnvCache();
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modelops-env-'));
  });

  afterEach(() => {
    for (const key of ['GROQ_API_KEY', 'GEMINI_API_KEY']) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads provider keys from a UTF-16 .env.local file', () => {
    const envFile = path.join(tempDir, '.env.local');
    const content = '\uFEFFGROQ_API_KEY="groq-from-file"\nGEMINI_API_KEY="gemini-from-file"\n';
    fs.writeFileSync(envFile, content, 'utf16le');

    const env = getEnv(tempDir);

    expect(env.GROQ_API_KEY).toBe('groq-from-file');
    expect(env.GEMINI_API_KEY).toBe('gemini-from-file');
    expect(process.env.GROQ_API_KEY).toBe('groq-from-file');
    expect(process.env.GEMINI_API_KEY).toBe('gemini-from-file');
  });
});
