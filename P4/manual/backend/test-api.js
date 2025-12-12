#!/usr/bin/env node

const http = require('http');

// Test login
function testLogin() {
  const data = JSON.stringify({
    username: 'admin',
    password: 'admin'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      console.log('✓ Login Response:', JSON.parse(body));
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('✗ Login failed:', error.message);
    process.exit(1);
  });

  req.write(data);
  req.end();
}

// Wait a bit for server to start, then test
setTimeout(testLogin, 1000);

console.log('Testing admin login...');
