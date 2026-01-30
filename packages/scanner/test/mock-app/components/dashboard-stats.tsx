// This is a server component (no client directive)
// But when imported by a client component, it becomes part of the client bundle

export function DashboardStats() {
  return (
    <div>
      <h2>Stats</h2>
      <p>Some statistics here</p>
    </div>
  );
}
