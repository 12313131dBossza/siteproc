const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('📖 Reading file...');
console.log(`File length: ${content.length} characters`);

// 1. Add AppLayout import
if (!content.includes("import { AppLayout }")) {
  content = content.replace(
    /(import \{ useParams, useRouter \} from 'next\/navigation')/,
    "$1\nimport { AppLayout } from '@/components/app-layout'"
  );
  console.log('✅ Added AppLayout import');
} else {
  console.log('⚠️  AppLayout import already exists');
}

// 2. Wrap loading state in AppLayout - improved spinner
const loadingOld = `  if (!id) return null\r
  if (!project) return (\r
    <div className="p-6">\r
      {error ? (\r
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">\r
          <div className="font-medium mb-1">Couldn't load project</div>\r
          <div className="text-sm">{error}</div>\r
        </div>\r
      ) : (\r
        <div>Loading…</div>\r
      )}\r
    </div>\r
  )`;

const loadingNew = `  if (!id) return null\r
  if (!project) return (\r
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
  )`;

if (content.includes(loadingOld)) {
  content = content.replace(loadingOld, loadingNew);
  console.log('✅ Wrapped loading state in AppLayout with spinner');
} else {
  console.log('⚠️  Loading state already modified or pattern not found');
}

// 3. Wrap main return in AppLayout
const returnOld = `  return (\r
    <Boundary>\r
    <div className="max-w-7xl mx-auto p-6 space-y-6">`;

const returnNew = `  return (\r
    <AppLayout>\r
      <Boundary>\r
        <div className="max-w-7xl mx-auto p-6 space-y-6">`;

if (content.includes(returnOld)) {
  content = content.replace(returnOld, returnNew);
  console.log('✅ Wrapped main return start in AppLayout');
} else {
  console.log('⚠️  Main return start already modified or pattern not found');
}

// Close the wrapping at the end
const closeOld = `    </div>\r
    </Boundary>\r
  )\r
}`;

const closeNew = `        </div>\r
      </Boundary>\r
    </AppLayout>\r
  )\r
}`;

if (content.includes(closeOld)) {
  content = content.replace(closeOld, closeNew);
  console.log('✅ Closed AppLayout wrapper properly');
} else {
  console.log('⚠️  Closing wrapper already modified or pattern not found');
}

// Write the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('💾 File saved successfully!');
console.log(`\n✨ Project detail page now has AppLayout wrapper with sidebar!`);
