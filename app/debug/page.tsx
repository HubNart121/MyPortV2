export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🛠 Diagnostic Page</h1>
      <p>If you can see this, the Next.js server is running and basic routing works.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
