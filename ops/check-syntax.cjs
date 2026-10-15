const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const seen = new Set();
function check(file) {
  file = path.resolve(file);
  if (seen.has(file) || file.endsWith('.json')) return;
  seen.add(file);
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
    const target = require.resolve(path.resolve(path.dirname(file), match[1]));
    if (!target.includes('node_modules')) check(target);
  }
}
check('src/server.js');
console.log('Syntax checked ' + seen.size + ' reachable server modules');
