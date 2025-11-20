import fs from 'fs';
import path from 'path';

export default async function RootPage() {
  // Read the landing page HTML from public folder
  const landingPath = path.join(process.cwd(), 'public', 'landing.html');
  const landingHTML = fs.readFileSync(landingPath, 'utf-8');
  
  // Serve the landing page directly at siteproc.com
  return (
    <div dangerouslySetInnerHTML={{ __html: landingHTML }} />
  );
}
