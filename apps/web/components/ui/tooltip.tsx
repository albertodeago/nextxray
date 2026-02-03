"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Show below if not enough space above
      setPosition(rect.top < 200 ? "bottom" : "top");
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className ?? ""}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 w-72 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ${
            position === "top"
              ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
              : "top-full left-1/2 mt-2 -translate-x-1/2"
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
