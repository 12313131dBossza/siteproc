const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Total lines:', lines.length);
console.log('Starting fix...\n');

// Find line 142: if (!project) return (
const loadingLineIdx = lines.findIndex(line => line.includes('if (!project) return ('));
console.log('Loading return found at line:', loadingLineIdx + 1);

if (loadingLineIdx !== -1) {
  // Line 143 should be: <div className="p-6">
  // We need to insert <AppLayout> before it and change indentation
  
  // Insert <AppLayout> at line 143
  lines.splice(loadingLineIdx + 1, 0, '    <AppLayout>');
  
  // Line 144 (was 143) needs to change from <div className="p-6"> to have extra indent
  const divLineIdx = loadingLineIdx + 2; // After insertion
  lines[divLineIdx] = '      ' + lines[divLineIdx].trim();
  
  // Find the line with just <div>Loading…</div> and replace with spinner
  for (let i = divLineIdx; i < divLineIdx + 15; i++) {
    if (lines[i].includes('<div>Loading…</div>')) {
      console.log('Found Loading… at line', i + 1);
      // Replace with spinner
      const indent = '          ';
      lines.splice(i, 1,
        indent + '<div className="flex items-center justify-center min-h-[60vh]">',
        indent + '  <div className="text-center space-y-3">',
        indent + '    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>',
        indent + '    <div className="text-gray-600">Loading project details...</div>',
        indent + '  </div>',
        indent + '</div>'
      );
      break;
    }
  }
  
  // Find the closing </div> before ) and add </AppLayout>
  for (let i = loadingLineIdx + 1; i < loadingLineIdx + 25; i++) {
    if (lines[i].trim() === '</div>' && lines[i + 1] && lines[i + 1].includes(')')) {
      console.log('Found closing div at line', i + 1);
      // Change indent and add AppLayout close
      lines[i] = '      </div>';
      lines.splice(i + 1, 0, '    </AppLayout>');
      break;
    }
  }
  
  console.log('✅ Fixed loading state!');
}

// Save
const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('💾 Saved successfully!\n');
