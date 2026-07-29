import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('.env.local');
const raw = fs.readFileSync(filePath);
const text = raw[0] === 0xff && raw[1] === 0xfe || raw[0] === 0xfe && raw[1] === 0xff ?
    raw.toString('utf16le') :
    raw.toString('utf8');
const values = {};
for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...rest] = trimmed.split('=');
    let v = rest.join('=').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
    }
    values[k.trim()] = v;
}

const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Return a compact JSON object with a single field hello.' },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
});

const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${values.GROQ_API_KEY}`,
    },
    body,
});
console.log('status', res.status);
console.log(await res.text());