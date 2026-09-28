
const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 8081,
  path: '/api/getDashboardData',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let data = JSON.parse(body).data;
    console.log("Clusters:", JSON.stringify(data.clusters.map(c => ({id: c.id, count: c.companyCount}))));
  });
});
req.write(JSON.stringify({ args: [] }));
req.end();

