const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the exact loading section
const before = `  if (!id) return null
  if (!project) return (
    <div className="p-6">`;

const after = `  if (!id) return null
  if (!project) return (
    <AppLayout>
      <div className="p-6">`;

if (content.includes(before)) {
  content = content.replace(before, after);
  console.log('✅ Step 1: Added <AppLayout> after return (');
  
  // Now find and fix the closing
  const closePattern = `      )}
    </div>
  )

  const variance = Number(rollup?.variance || 0)`;
  
  const closeReplacement = `      )}
      </div>
    </AppLayout>
  )

  const variance = Number(rollup?.variance || 0)`;
  
  if (content.includes(closePattern)) {
    content = content.replace(closePattern, closeReplacement);
    console.log('✅ Step 2: Added closing </AppLayout>');
  }
  
  // Fix the loading spinner
  const loadingOld = `      ) : (
        <div>Loading…</div>
      )}`;
  
  const loadingNew = `      ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <div className="text-gray-600">Loading project details...</div>
            </div>
          </div>
        )}`;
  
  if (content.includes(loadingOld)) {
    content = content.replace(loadingOld, loadingNew);
    console.log('✅ Step 3: Added beautiful loading spinner');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n💾 File saved successfully!');
  console.log('✨ Project detail page now has AppLayout on loading state!\n');
} else {
  console.log('❌ Pattern not found');
}
