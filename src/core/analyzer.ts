import { simpleGit } from "simple-git";
import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import * as ts from "typescript";
import type { AnalysisResult, FileInfo, Dependency } from "./types.ts";

export async function analyzeRepo(repoUrl: string, branch: string): Promise<AnalysisResult> {
    // clone repository
    const tempDir = `/tmp/code-analysis-${Date.now()}`;
    const git = simpleGit();

    console.log(`Cloning repository ${repoUrl} into ${tempDir}`);
    await git.clone(repoUrl, tempDir, ["--branch", branch, "--single-branch"]);

    console.log(`Analyzing repository ${repoUrl} on branch ${branch}`);

    // Find source files
    const files = await findSourceFiles(tempDir);
    console.log(`Found ${files.length} source files`);

    // Analyze each file
    const fileInfos: FileInfo[] = [];
    const dependencies: Dependency[] = [];

    for (const file of files) {
        const info = await analyzeFile(file, tempDir);
        fileInfos.push(info);

        // Create Dependencies
        info.imports.forEach(importPath => {
            dependencies.push({
                from: info.path,
                to: importPath
            });
        });
    }

    return {
        files: fileInfos,
        dependencies,
        summary: {
            totalFiles: fileInfos.length,
            totalDependencies: dependencies.length
        }
    };
}

async function findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
        const items = await readdir(currentDir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = join(currentDir, item.name);

            if (item.isDirectory()) {
                // skip common directories
                if (!["node_modules", "dist", "build", ".git"].includes(item.name)) {
                    await scan(fullPath);
                }
            } else if (item.isFile()) {
                if (/\.(ts|tsx|js|jsx)$/.test(item.name) && !item.name.endsWith('.d.ts')) {
                    files.push(fullPath);
                }
            }
        }
    }

    await scan(dir);
    return files;
}

async function analyzeFile(filePath: string, repoDir: string): Promise<FileInfo> {
    try {
        const content = await readFile(filePath, "utf-8");

        // Parse TypeScript with AST
        const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true
        );

        const imports: string[] = [];
        const exports: string[] = [];

        // Visit all nodes in the AST
        function visit(node: ts.Node) {
            // Find Imports
            if (ts.isImportDeclaration(node)) {
                const importPath = getImportPath(node);
                if (importPath) imports.push(importPath);
            }
            // Find exports
            if (ts.isExportDeclaration(node) || hasExportModifier(node)) {
                const exportName = getExportName(node);
                if (exportName) exports.push(exportName);
            }

            ts.forEachChild(node, visit);
        }

        visit(sourceFile);

        return {
            path: relative(repoDir, filePath),
            imports: [...new Set(imports)],
            exports: [...new Set(exports)],
        };

    } catch (error) {
        const errorMsg = (error instanceof Error) ? error.message : String(error);
        console.warn(`Could not parse ${filePath}: ${errorMsg}`);
        return {
            path: relative(repoDir, filePath),
            imports: [],
            exports: [],
        };
    }
}

function getImportPath(node: ts.ImportDeclaration): string | null {
    if (ts.isStringLiteral(node.moduleSpecifier)) {
        const path = node.moduleSpecifier.text;
        // Only local imports
        if (path.startsWith('.') || path.startsWith('/')) {
            return path;
        }
    }
    return null;
}

function getExportName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
        return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
        return node.name.text;
    }
    if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (declaration && ts.isIdentifier(declaration.name)) {
            return declaration.name.text;
        }
    }
    return null;
}

function hasExportModifier(node: ts.Node): boolean {
    // Only nodes that can have modifiers (e.g., declarations)
    const maybeHasModifiers = node as ts.Node & { modifiers?: ts.NodeArray<ts.Modifier> };
    return maybeHasModifiers.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
}