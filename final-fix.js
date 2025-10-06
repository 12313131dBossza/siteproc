const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}\n`);

// Find the loading return line
let loadingIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'if (!project) return (') {
    loadingIdx = i;
    console.log(`Found loading return at line ${i + 1}`);
    break;
  }
}

if (loadingIdx === -1) {
  console.log('ERROR: Could not find loading return');
  process.exit(1);
}

// The next line should be: <div className="p-6">
// Insert <AppLayout> before it
lines.splice(loadingIdx + 1, 0, '    <AppLayout>');
console.log('✅ Inserted <AppLayout> at line', loadingIdx + 2);

// Change <div className="p-6"> to have extra indent
const divIdx = loadingIdx + 2;
lines[divIdx] = '  ' + lines[divIdx];
console.log('✅ Added indent to <div> line', divIdx + 1);

// Find the <div>Loading…</div> and replace with spinner (around line 150)
for (let i = divIdx; i < divIdx + 15; i++) {
  if (lines[i].includes('<div>Loading')) {
    console.log(`Found Loading text at line ${i + 1}, replacing...`);
    const indent = '          ';
    lines[i] = indent + '<div className="flex items-center justify-center min-h-[60vh]">';
    lines.splice(i + 1, 0,
      indent + '  <div className="text-center space-y-3">',
      indent + '    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>',
      indent + '    <div className="text-gray-600">Loading project details...</div>',
      indent + '  </div>',
      indent + '</div>'
    );
    console.log('✅ Added beautiful spinner');
    break;
  }
}

// Find closing </div> before ) and add </AppLayout>
for (let i = loadingIdx + 1; i < loadingIdx + 30; i++) {
  const line = lines[i].trim();
  const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
  
  if (line === '</div>' && nextLine === ')') {
    console.log(`Found closing at line ${i + 1}`);
    // Add extra indent to </div>
    lines[i] = '  ' + lines[i];
    // Insert </AppLayout> after
    lines.splice(i + 1, 0, '    </AppLayout>');
    console.log('✅ Added closing </AppLayout>');
    break;
  }
}

// Save
const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('\n💾 File saved!');
console.log('✨ Done! Project detail page now has AppLayout wrapper!\n');
