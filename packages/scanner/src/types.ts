// Types are here to avoid circular dependencies between different modules

export type AnalyzedComponent = {
  component: {
    name: string | null;
    exportType: "default" | "named" | null;
    isClientComponent: boolean;
  };
  importedComponents: {
    name: string;
    importedName: string;
    source: string;
    type: "default" | "named" | "namespace";
  }[];
  exports: {
    name: string;
    type: "default" | "named" | "namespace";
    reExport?: {
      source: string;
      importedName: string;
    };
  }[];
  localComponents: string[];
};

export type ScanContext = {
  exactImports: Map<
    string,
    {
      source: string;
      type: "default" | "named" | "namespace";
      importedName: string;
    }
  >;
  localDefinitions: Set<string>;
  usedJsxNames: Set<string>;
  exports: AnalyzedComponent["exports"];
  exportedComponent: {
    name: string | null;
    exportType: "default" | "named";
  } | null;
};
