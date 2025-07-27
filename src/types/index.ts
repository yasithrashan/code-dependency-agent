export interface FileInfo {
    path: string;
    imports: ImportInfo[];
    exports: ExportInfo[];
}

export interface ImportInfo {
    names: string[];
    type: 'default' | 'named' | 'namespace' | 'side-effect';
    isTypeOnly?: boolean;
}

export interface ExportInfo {
    names: string;
    type: 'default' | 'named' | 'namespace' | 'function' | 'class' | 'interface' | 'type';  // Fixed: fucntion → function, imterface → interface
    isTypeOnly?: boolean;
}

export interface Dependency {
    from: string;
    to: string;
    type: 'import' | 'export';
    importType: 'named' | 'default' | 'namespace' | 'side-effect';
    names: string[];
    isTypeOnly: boolean;
}

export interface AnalysisResult {
    files: FileInfo[];
    dependencies: Dependency[];
    summary: {
        totalFiles: number;
        totalDependencies: number;
    };
}