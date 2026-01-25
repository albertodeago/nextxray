type AnalyzedComponent = {
  isClientComponent: boolean;
  parentComponent: string | null;
  importedComponents: string[];
};

/**
 * Given a file content as a string, analyze it and TODO:
 */
export const scan = (code: string): AnalyzedComponent => {
  const isClientComponent =
    code.includes('"use client"') || code.includes("'use client'");

  return {
    isClientComponent,
    parentComponent: null,
    importedComponents: [],
  };
};
