"use client";

export function Button({ children }: { children: React.ReactNode }) {
  return <button onClick={() => alert("clicked")}>{children}</button>;
}
