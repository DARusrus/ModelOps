import http from 'node:http';

const payload = JSON.stringify({
    model_name: 'Runtime-Check',
    version: '1.0.0',
    dataset: 'demo',
    intended_use: 'verification',
    input_shape: 'N/A',
    reproducibility: 'high',
    metrics: {},
    training: {},
    hardware: {},
    deployment: {},
    limitations: [],
    risks: [],
    tests: [],
    warnings: [],
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/modelops',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
    },
}, (res) => {
    let raw = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => {
        console.log(raw);
    });
});
req.on('error', (err) => {
    console.error(err);
    process.exit(1);
});
req.write(payload);
req.end();