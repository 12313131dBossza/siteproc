const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Starting fix...\n');

// 1. Add AppLayout import if not present
if (!content.includes("import { AppLayout }")) {
  const importLine = "import { useParams, useRouter } from 'next/navigation'";
  const newImport = importLine + "\nimport { AppLayout } from '@/components/app-layout'";
  content = content.replace(importLine, newImport);
  console.log('✅ Added AppLayout import');
} else {
  console.log('✓ AppLayout import already present');
}

// 2. Wrap the loading state with AppLayout
const loadingPattern = `if (!project) return (
    <div className="p-6">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Couldn't load project</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : (
        <div>Loading…</div>
      )}
    </div>
  )`;

const loadingReplacement = `if (!project) return (
    <AppLayout>
      <div className="p-6">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 text-red-700 p-3">
            <div className="font-medium mb-1">Couldn't load project</div>
            <div className="text-sm">{error}</div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <div className="text-gray-600">Loading project details...</div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )`;

if (content.includes(loadingPattern)) {
  content = content.replace(loadingPattern, loadingReplacement);
  console.log('✅ Wrapped loading state in AppLayout with spinner');
} else {
  console.log('⚠️  Loading state pattern not found - checking alternatives...');
  // Try with different whitespace
  const count = (content.match(/if \(!project\) return/g) || []).length;
  console.log(`   Found ${count} occurrences of loading pattern`);
}

// 3. Wrap main return with AppLayout
const returnPattern = `return (
    <Boundary>
    <div className="max-w-7xl mx-auto p-6 space-y-6">`;

const returnReplacement = `return (
    <AppLayout>
      <Boundary>
        <div className="max-w-7xl mx-auto p-6 space-y-6">`;

if (content.includes(returnPattern)) {
  content = content.replace(returnPattern, returnReplacement);
  console.log('✅ Wrapped main return in AppLayout');
} else {
  console.log('✓ Main return already wrapped or pattern not found');
}

// 4. Close the main AppLayout wrapper
const closePattern = `</div>
    </Boundary>
  )
}

function KPI(`;

const closeReplacement = `</div>
      </Boundary>
    </AppLayout>
  )
}

function KPI(`;

if (content.includes(closePattern)) {
  content = content.replace(closePattern, closeReplacement);
  console.log('✅ Closed AppLayout wrapper');
} else {
  console.log('✓ Close wrapper already in place or pattern not found');
}

// Save
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n💾 File saved successfully!');
console.log('✨ Project detail page now has AppLayout on both loading and main states!\n');
