import fs from 'fs';
import path from 'path';
import { PWARedirect } from './pwa-redirect';

export default async function RootPage() {
  // Read the landing page HTML from public folder
  const landingPath = path.join(process.cwd(), 'public', 'landing.html');
  const landingHTML = fs.readFileSync(landingPath, 'utf-8');
  
  // Serve the landing page directly at siteproc.com
  // PWARedirect will automatically redirect to /dashboard if opened as installed app
  return (
    <>
      <PWARedirect />
      <div dangerouslySetInnerHTML={{ __html: landingHTML }} />
    </>
  );
}
