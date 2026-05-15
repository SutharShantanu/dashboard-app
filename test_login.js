const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/callback/credentials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let data = '';
  res.on('data', d => {
    data += d;
  });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', error => {
  console.error(error);
});

// Since NextAuth uses CSRF tokens normally, this simple approach might get a 400 Bad Request or redirect without testing auth, but let's see.
req.write('username=SabaAdmin&password=Admin@123');
req.end();
