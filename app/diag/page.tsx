export default function DiagPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasUrl = !!supabaseUrl;
  
  return (
    <div style={{ padding: '60px', fontFamily: 'monospace', lineHeight: 2 }}>
      <h1 style={{ color: '#2ecc71' }}>✔ SERVER IS ALIVE</h1>
      <hr />
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <p><strong>Environment Check:</strong></p>
        <ul>
          <li>NEXT_PUBLIC_SUPABASE_URL: {hasUrl ? 'LOADED ✅' : 'NOT FOUND ❌'}</li>
          <li>Current Time: {new Date().toLocaleTimeString()}</li>
          <li>Next.js Version: 15+</li>
        </ul>
      </div>
      <p style={{ marginTop: '20px', color: '#6c757d' }}>
        If you can see this page at <code>/diag</code>, it means the main <code>app/layout.tsx</code> is the cause of the 500 error.
      </p>
    </div>
  );
}
