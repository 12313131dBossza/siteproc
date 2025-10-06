const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'projects', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import after line 3
content = content.replace(
  /("use client"\nimport React.*\nimport \{ useParams.*\n)/,
  "$1import { AppLayout } from '@/components/app-layout'\n"
);

// 2. Wrap loading state
content = content.replace(
  /(if \(!project\) return \(\n    <div className="p-6">)/,
  `if (!project) return (\n    <AppLayout>\n      <div className="p-6">`
);

content = content.replace(
  /(<div>Loading…<\/div>\n      \)\}\n    <\/div>\n  \))/,
  `<div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading project details...</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )`
);

// 3. Wrap main return
content = content.replace(
  /(return \(\n    <Boundary>)/,
  `return (\n    <AppLayout>\n    <Boundary>`
);

content = content.replace(
  /(<\/div>\n    <\/Boundary>\n  \))/,
  `</div>\n    </Boundary>\n    </AppLayout>\n  )`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Successfully updated project detail page with AppLayout!');
