const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing loading state...');

// Replace the loading return with AppLayout-wrapped version with better spinner
content = content.replace(
  /  if \(!project\) return \(\r?\n    <div className="p-6">\r?\n      \{error \? \(\r?\n        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">\r?\n          <div className="font-medium mb-1">Couldn't load project<\/div>\r?\n          <div className="text-sm">\{error\}<\/div>\r?\n        <\/div>\r?\n      \) : \(\r?\n        <div>Loading…<\/div>\r?\n      \)\}\r?\n    <\/div>\r?\n  \)/,
  `  if (!project) return (\r
    <AppLayout>\r
      <div className="p-6">\r
        {error ? (\r
          <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">\r
            <div className="font-medium mb-1">Couldn't load project</div>\r
            <div className="text-sm">{error}</div>\r
          </div>\r
        ) : (\r
          <div className="flex items-center justify-center min-h-[60vh]">\r
            <div className="text-center space-y-3">\r
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>\r
              <div className="text-gray-600">Loading project details...</div>\r
            </div>\r
          </div>\r
        )}\r
      </div>\r
    </AppLayout>\r
  )`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed loading state with AppLayout and beautiful spinner!');
