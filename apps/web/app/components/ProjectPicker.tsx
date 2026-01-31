"use client";

import { Button } from "@/components/ui/button";

interface ProjectPickerProps {
  onSelect: (handle: FileSystemDirectoryHandle) => void;
  disabled?: boolean;
}

export function ProjectPicker({ onSelect, disabled }: ProjectPickerProps) {
  const handleClick = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "read",
      });
      onSelect(handle);
    } catch (err) {
      // User cancelled the picker - this is not an error
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      throw err;
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled} size="lg">
      Select Project Folder
    </Button>
  );
}
