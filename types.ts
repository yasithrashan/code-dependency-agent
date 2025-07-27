export interface FileInfo {
    path: string;
    imports: string[];
    exports: string[];
}

export interface Dependency {
    from: string;
    to: string;
}

export interface AnalysisResult {
    files: FileInfo[];
    dependencies: Dependency[];
    summary: {
        totalFiles: number;
        totalDependencies: number;
    };
}