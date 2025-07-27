import { Command } from "commander";
import chalk from "chalk";
import { analyzeRepo } from "./analyzer.ts";
import { askGemini } from "./gemini-services.ts";

const program = new Command();

program
    .name('code-dependency-agent')
    .description('Intelligent code dependency analyzer using TypeScript AST and Gemini AI for repository insights')
    .version('1.0.0');
program
    .command('analyze')
    .description('Analyze a GitHub repository')
    .argument('<repo-url>', 'GitHub repository URL')
    .option('-b, --branch <branch>', 'Branch to analyze', 'main')
    .action(async (repoUrl: string, options: { branch: string }) => {
        try {
            console.log(chalk.blue(` Analyzing ${repoUrl} (${options.branch})...`));

            const result = await analyzeRepo(repoUrl, options.branch);

            console.log(chalk.green('\n Analysis Complete!'));
            console.log(` Files: ${result.summary.totalFiles}`);
            console.log(` Dependencies: ${result.summary.totalDependencies}`);

            // Show top dependencies
            console.log(chalk.yellow('\n Dependencies:'));
            result.dependencies.slice(0, 8).forEach(dep => {
                console.log(`  ${dep.from} → ${dep.to}`);
            });

            // Show main files
            const mainFiles = result.files
                .sort((a, b) => (b.imports.length + b.exports.length) - (a.imports.length + a.exports.length))
                .slice(0, 5);

            console.log(chalk.yellow('\n Main Files:'));
            mainFiles.forEach(file => {
                console.log(`  ${file.path} (${file.imports.length}↓ ${file.exports.length}↑)`);
            });

        } catch (error) {
            if (error instanceof Error) {
                console.error(chalk.red('Error:'), error.message);
            } else {
                console.error(chalk.red('Error:'), error);
            }
        }
    });

// Ask command
program
    .command('ask')
    .description('Ask AI about the codebase')
    .argument('<question>', 'Your question')
    .option('-r, --repo <repo-url>', 'GitHub repository URL')
    .action(async (question: string, options: { repo?: string }) => {
        try {
            if (!options.repo) {
                console.error(chalk.red('Please provide --repo <url>'));
                return;
            }

            console.log(chalk.blue(` Analyzing ${options.repo}...`));

            // Analyze first
            const analysis = await analyzeRepo(options.repo, 'main');

            console.log(chalk.blue(` Asking: "${question}"`));

            // Ask AI
            const answer = await askGemini(question, analysis);

            console.log(chalk.green('\n Answer:'));
            console.log(answer);

        } catch (error) {
            if (error instanceof Error) {
                console.error(chalk.red(' Error:'), error.message);
            } else {
                console.error(chalk.red(' Error:'), error);
            }
        }
    });

program.parse();
