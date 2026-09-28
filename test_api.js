const http = require('http');

const body = JSON.stringify({ args: [] });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/getDashboardData',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.ok) {
        console.log('SUCCESS! Data keys:', Object.keys(parsed.data || {}));
      } else {
        console.log('FAILED:', parsed.error);
        console.log('STACK:', parsed.stack);
      }
    } catch (e) {
      console.log('RAW:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('Request error:', e.message));
req.write(body);
req.end();
