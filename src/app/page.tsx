export default async function RootPage() {
  // Redirect to the standalone landing page in public folder
  // This landing page has all your custom styling and animations
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0; url=/landing.html" />
      </head>
      <body>
        <p>Redirecting to landing page...</p>
      </body>
    </html>
  );
}
