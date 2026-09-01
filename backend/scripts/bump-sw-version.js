const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', '..', 'public', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.log('[bump-sw-version] sw.js no encontrado, se omite.');
  process.exit(0);
}

const version = 'v' + Date.now();
let content = fs.readFileSync(swPath, 'utf8');

content = content.replace(
  /const SW_VERSION = '[^']*';/,
  `const SW_VERSION = '${version}';`
);
content = content.replace(
  /const CACHE_NAME = '[^']*';/,
  `const CACHE_NAME = 'assendapp-${version}';`
);

fs.writeFileSync(swPath, content, 'utf8');
console.log(`[bump-sw-version] sw.js actualizado a versión ${version}`);
