import json
import urllib.request
import urllib.error
from pathlib import Path

p = Path('.env.local')
text = p.read_bytes()
if text.startswith(b'\xff\xfe') or text.startswith(b'\xfe\xff'):
    text = text.decode('utf-16')
else:
    text = text.decode('utf-8')
values = {}
for line in text.splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    if '=' in line:
        k, v = line.split('=', 1)
        k = k.strip()
        v = v.strip()
        if v and v[0] in '"\'' and v[-1] == v[0]:
            v = v[1:-1]
        values[k] = v

body = json.dumps({
    'model': 'llama-3.3-70b-versatile',
    'messages': [
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': 'Return a compact JSON object with a single field hello.'}
    ],
    'temperature': 0.1,
    'response_format': {'type': 'json_object'}
}).encode()
req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', data=body, headers={'Content-Type': 'application/json', 'Authorization': f"Bearer {values['GROQ_API_KEY']}"}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=45) as resp:
        print('status', resp.status)
        print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('status', e.code)
    print(e.read().decode())
except Exception as e:
    print('err', repr(e))
