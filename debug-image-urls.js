#!/usr/bin/env node

/**
 * Image URL Debugging Script
 * 
 * Usage: node debug-image-urls.js
 * 
 * This script helps you test if image URLs are accessible
 */

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

function testURL(url) {
  return new Promise((resolve) => {
    if (!url || !url.trim()) {
      resolve({ status: 'MISSING', message: 'URL is empty or not provided' });
      return;
    }

    const https = url.startsWith('https') ? require('https') : require('http');
    
    const request = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      resolve({
        status: res.statusCode === 200 ? 'SUCCESS' : 'ERROR',
        statusCode: res.statusCode,
        message: `Server returned: ${res.statusCode}`
      });
      res.resume(); // Consume response data
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 'TIMEOUT', message: 'Request timed out (5s)' });
    });

    request.on('error', (err) => {
      resolve({ status: 'ERROR', message: `Network error: ${err.message}` });
    });

    request.end();
  });
}

async function main() {
  console.log('\n=== Image URL Debugger ===\n');

  // Option 1: Manual URL testing
  const mode = await question('Mode: (1) Test single URL, (2) Test from JSON file? [1/2]: ');

  if (mode === '2') {
    const filePath = await question('JSON file path (paste output from console logs): ');
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        console.log('\n📋 Testing URLs from file...\n');

        for (const teacher of data) {
          console.log(`Teacher: ${teacher.full_name || 'Unknown'}`);
          
          const results = await Promise.all([
            { name: 'Profile Picture', url: teacher.profile_picture },
            { name: 'CNIC Image', url: teacher.cnic_image },
            { name: 'Degree Certificate', url: teacher.degree_certificate }
          ].map(async (item) => {
            const result = await testURL(item.url);
            return { ...item, ...result };
          }));

          results.forEach(r => {
            const icon = r.status === 'SUCCESS' ? '✅' : r.status === 'MISSING' ? '⚠️' : '❌';
            console.log(`  ${icon} ${r.name}:`);
            console.log(`     Status: ${r.status}`);
            console.log(`     URL: ${r.url || 'N/A'}`);
            console.log(`     Message: ${r.message}\n`);
          });
        }
      } catch (err) {
        console.error('❌ Error reading file:', err.message);
      }
    } else {
      console.error('❌ File not found');
    }
  } else {
    // Manual testing
    while (true) {
      const url = await question('\nEnter image URL (or "quit" to exit): ');
      if (url.toLowerCase() === 'quit') break;

      console.log('\nTesting URL...');
      const result = await testURL(url);
      
      console.log(`\n📊 Result:`);
      console.log(`  Status: ${result.status}`);
      console.log(`  Code: ${result.statusCode || 'N/A'}`);
      console.log(`  Message: ${result.message}`);

      if (result.status === 'SUCCESS') {
        console.log('  ✅ Image URL is accessible!');
      } else if (result.status === 'MISSING') {
        console.log('  ⚠️  URL is empty or not provided by backend');
      } else {
        console.log('  ❌ Cannot access image URL');
      }
    }
  }

  rl.close();
}

main().catch(console.error);
