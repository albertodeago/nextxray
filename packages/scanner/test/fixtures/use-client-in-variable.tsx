const directive = "use client";

export function ServerComponent() {
  console.log(directive);
  return <div>Server</div>;
}
