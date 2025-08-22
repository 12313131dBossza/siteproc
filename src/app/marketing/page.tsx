export default function Marketing() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">SiteProc — Procurement & Field Coordination for Small Contractors</h1>
        <p className="text-gray-600">Fewer mistakes. Faster approvals. Ironclad proof.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-1">Fewer mistakes</h3>
          <p className="text-sm text-gray-600">Standard RFQs and POs keep pricing and scope aligned.</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-1">Faster approvals</h3>
          <p className="text-sm text-gray-600">Public links for supplier quotes and CO approvals.</p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold mb-1">Ironclad proof</h3>
          <p className="text-sm text-gray-600">Photos, signatures, and audit logs with every delivery.</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Pricing</h2>
        <p className="text-gray-700">$49–$99/mo depending on team size. Month-to-month.</p>
        <div className="mt-3 flex gap-3">
          <a href="/rfqs/new" className="px-4 py-2 bg-black text-white rounded">Start Free Pilot</a>
          <a href="mailto:sales@siteproc.example" className="px-4 py-2 border rounded">Contact Sales</a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">90-second demo script</h2>
        <ol className="list-decimal ml-5 space-y-1 text-gray-700 text-sm">
          <li>Create a job and RFQ with 2 items.</li>
          <li>Send RFQ — supplier uses public link to submit quote.</li>
          <li>Select winner — PO number generated and PDF ready.</li>
          <li>On site, receive delivery with photos and signature (offline works).</li>
          <li>Submit a change order and approve via email link.</li>
          <li>Export expenses/POs to CSV for accounting.</li>
        </ol>
      </section>
    </main>
  )
}
