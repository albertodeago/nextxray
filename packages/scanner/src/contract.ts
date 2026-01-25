import { AnalyzedComponent } from "./types.js";

export type ScanResult = {
  // The absolute path or unique identifier of the file
  id: string;
  // Raw scanner output
  metadata: AnalyzedComponent;
  // Resolved children graph pointers
  children: {
    // The component name as used in the parent (e.g. "Button")
    params: {
      name: string;
      source: string;
    };
    // The resolved ID of the child module
    childId: string;
  }[];
};

export interface ScannerHost {
  /**
   * Reads the content of a file.
   * @param path Absolute path or unique identifier.
   */
  readFile(path: string): Promise<string>;

  /**
   * Resolves an import source string to a file path/ID.
   * @param source The import string (e.g. "./button" or "next/dynamic")
   * @param importer The absolute path of the file importing it
   */
  resolve(source: string, importer: string): Promise<string | null>;
}
