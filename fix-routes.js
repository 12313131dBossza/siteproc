const fs = require('fs');
const path = require('path');

// List of files that need fixing based on the grep results
const filesToFix = [
  'src/app/api/suppliers/[id]/route.ts',
  'src/app/api/cost-codes/[id]/route.ts', 
  'src/app/api/quotes/public/[token]/route.ts',
  'src/app/api/quotes/[id]/select/route.ts',
  'src/app/api/po/[id]/ping/route.ts',
  'src/app/api/po/[id]/void/route.ts',
  'src/app/api/po/[id]/resend/route.ts',
  'src/app/api/po/[id]/pdf/route.ts',
  'src/app/api/po/[id]/complete/route.ts',
  'src/app/api/rfqs/[id]/resend/route.ts',
  'src/app/api/rfqs/[id]/send/route.ts',
  'src/app/api/jobs/[id]/report/route.ts',
  'src/app/api/deliveries/[id]/route.ts',
  'src/app/api/deliveries/[id]/deliver/route.ts',
  'src/app/api/deliveries/[id]/photos/route.ts',
  'src/app/api/expenses/[id]/route.ts',
  'src/app/api/expenses/[id]/receipt/route.ts'
];

function fixRouteFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace destructured params with context: any
    content = content.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*([^,]+),\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]+\}\s*\}\s*\)/g,
      'export async function $1($2, context: any)'
    );
    
    // Replace multi-line versions
    content = content.replace(
      /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*([^,]+),\s*\n\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]+\}\s*\}\s*\n\s*\)/g,
      'export async function $1($2, context: any)'
    );
    
    // Replace params.id with context?.params?.id
    content = content.replace(/params\.id/g, 'context?.params?.id');
    
    // Replace params.token with context?.params?.token  
    content = content.replace(/params\.token/g, 'context?.params?.token');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

console.log('Fixing route handlers...');
filesToFix.forEach(fixRouteFile);
console.log('Done!');
