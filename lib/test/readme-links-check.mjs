// filepath: d:\gith1\tsUtils\lib\test\readme-links-check.js
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

function _createRegEx(value) {
    let escaped = value.replace(/([-+|^$#\.\?{}()\[\]\\\/\"\'])/g, "\\$1").replace(/\*/g, "(.*)");
    return new RegExp("(" + escaped + "[^\\)\"'\\s]+)", "gi");
}

function _checkRemoteUrl(url) {
  return new Promise((resolve) => {
    // Determine which protocol to use
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
      const isValid = res.statusCode >= 200 && res.statusCode < 400;
      console.log(` -- ${isValid ? '✓' : '⚠️'} Remote URL ${url} - Status: ${res.statusCode}`);
      resolve(isValid);
    });
    
    req.on('error', (err) => {
      console.log(`⚠️ Error checking remote URL: ${url} - ${err.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function _checkRemoteUrls(urls, validFiles, missingFiles) {
  let theUrls = Array.from(urls);
  console.log(`\nChecking ${theUrls.length} remote URLs...`);
  for (const url of theUrls) {
    if (await _checkRemoteUrl(url)) {
      validFiles.push({ url });
    } else {
      missingFiles.push({ url });
    }
  }
}

// Configuration
const cwd = process.cwd();
const readmePath = path.resolve(cwd, './README.md');
const docsBasePath = path.resolve(cwd, './docs');
const utilsBaseUrl = 'https://nevware21.github.io/ts-utils/typedoc/';
const asyncBaseUrl = 'https://nevware21.github.io/ts-async/typedoc/';

console.log('\nChecking README.md links to documentation:');
console.log('=========================================\n');

// Read README.md
let readme;
try {
  readme = fs.readFileSync(readmePath, 'utf8');
  console.log(`✓ README.md found and read successfully.`);
} catch (error) {
  console.error(`✗ Error reading README.md: ${error.message}`);
  process.exit(1);
}

// Extract all links that start with the utilsBaseUrl
const utilsLinkRegex = _createRegEx(utilsBaseUrl);
let match;
const utilsLinks = new Set();
while ((match = utilsLinkRegex.exec(readme)) !== null) {
  utilsLinks.add(match[1]);
}

console.log(` -- ${utilsLinks.size} ts-utils unique links to typedoc documentation.`);

// Extract all links that start with the asyncBaseUrl
const asyncLinkRegex = _createRegEx(asyncBaseUrl);
const asyncLinks = new Set();
while ((match = asyncLinkRegex.exec(readme)) !== null) {
  asyncLinks.add(match[1]);
}

console.log(` -- ${asyncLinks.size} async unique links to typedoc documentation.`);

// Process each link
let asyncMissingFiles = [];
let asyncValidFiles = [];

asyncLinks.forEach(url => {
  
  // Convert URL to local file path
  const relativePath = url.substring(asyncBaseUrl.length);
  const localPath = path.join(docsBasePath, 'typedoc', relativePath);
  
  // Check if file exists
  if (fs.existsSync(localPath)) {
    asyncValidFiles.push({ url, localPath });
  } else {
    asyncMissingFiles.push({ url, localPath });
  }
});

let utilsMissingFiles = [];
let utilsValidFiles = [];

// Check if the URL is valid on the remote server (disabled by default)
await _checkRemoteUrls(utilsLinks, utilsValidFiles, utilsMissingFiles);

// Output results
console.log(`\n${asyncValidFiles.length} async links are valid.`);

if (asyncMissingFiles.length === 0) {
  console.log(' -- All async links are valid! 🎉');
} else {
  console.log(`\n❌ Found ${asyncMissingFiles.length} missing files:`);
  asyncMissingFiles.forEach(({ url, localPath }) => {
    console.log(`  - ${url}`);
    console.log(`    Expected at: ${localPath}`);
  });
}

console.log(`\n${utilsValidFiles.length} utils links are valid.`);
if (utilsMissingFiles.length === 0) {
  console.log(' -- All utils links are valid! 🎉');
} else {
  console.log(`\n❌ Found ${utilsMissingFiles.length} missing utils files:`);
  utilsMissingFiles.forEach(({ url, localPath }) => {
    console.log(`  - ${url}`);
    console.log(`    Expected at: ${localPath}`);
  });
}

// Check if there are any HTML files in docs/typedoc that aren't linked in README
const allDocFiles = [];
function collectFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(fullPath);
    } else if (stat.isFile() && item.endsWith('.html')) {
      // Get the relative path from the docs directory
      const relativePath = path.relative(docsBasePath, fullPath)
        .replace(/\\/g, '/'); // Normalize for URL comparison
      allDocFiles.push({
        path: fullPath,
        url: `https://nevware21.github.io/ts-async/${relativePath}`
      });
    }
  }
}

try {
  collectFiles(path.join(docsBasePath, 'typedoc'));
  
  const linkedUrls = new Set(Array.from(asyncLinks));
  const unlinkedFiles = allDocFiles.filter(file => !linkedUrls.has(file.url));
  
  if (unlinkedFiles.length > 0) {
    console.log(`\nℹ️ Found ${unlinkedFiles.length} documentation files not linked in README.md`);
    console.log('  (This is just informational, not necessarily an issue)');
    // Uncomment to see unlinked files
    // unlinkedFiles.forEach(file => {
    //   console.log(`  - ${file.url}`);
    // });
  }
} catch (error) {
  console.error(`Error while checking for unlinked files: ${error.message}`);
}

// Return appropriate exit code
if (asyncMissingFiles.length > 0) {
  console.log('\n❌ Test failed: Some documentation links in README.md are broken.');
  process.exit(1);
} else {
  console.log('\n✅ Test passed: All documentation links in README.md are valid.');
  process.exit(0);
}
