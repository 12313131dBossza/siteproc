const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log(`Total lines: ${lines.length}`);

// Find the line with "if (!project) return ("
let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (!project) return (')) {
    targetIdx = i;
    console.log(`Found target at line ${i + 1}: ${lines[i].substring(0,50)}`);
    break;
  }
}

if (targetIdx === -1) {
  console.log('❌ Could not find loading return statement');
  process.exit(1);
}

// Insert <AppLayout> after the return (
lines[targetIdx + 1] = '    <AppLayout>\r';
lines.splice(targetIdx + 2, 0, '      <div className="p-6">\r');

// Find the closing </div> before )
let closeIdx = -1;
for (let i = targetIdx + 2; i < Math.min(targetIdx + 20, lines.length); i++) {
  if (lines[i].includes('</div>') && lines[i + 1] && lines[i + 1].includes(')')) {
    closeIdx = i;
    console.log(`Found close at line ${i + 1}`);
    break;
  }
}

if (closeIdx !== -1) {
  // Replace simple "Loading..." with spinner
  for (let i = targetIdx; i <= closeIdx; i++) {
    if (lines[i].includes('<div>Loading…</div>')) {
      console.log(`Replacing loading text at line ${i + 1}`);
      lines.splice(i, 1,
        '          <div className="flex items-center justify-center min-h-[60vh]">\r',
        '            <div className="text-center space-y-3">\r',
        '              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>\r',
        '              <div className="text-gray-600">Loading project details...</div>\r',
        '            </div>\r',
        '          </div>\r'
      );
      closeIdx += 5; // Adjust close index
      break;
    }
  }
  
  // Add closing tags before the )
  lines[closeIdx] = '      </div>\r';
  lines.splice(closeIdx + 1, 0, '    </AppLayout>\r');
  
  console.log('✅ Added AppLayout wrapper and spinner to loading state');
} else {
  console.log('⚠️  Could not find closing div');
}

// Join and save
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('💾 File saved!');
