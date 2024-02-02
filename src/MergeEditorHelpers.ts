import * as vscode from "vscode";
import { spawn } from "child_process";

const gitPlaygroundPathKey =
	"vscode-diagnostic-tools.merge-editor.git-repo-target-path";

export class MergeEditorHelpers {
	constructor() {
		vscode.commands.registerCommand(
			"vscode-diagnostic-tools.open-folder-in-merge-editor-initial",
			async (...args) => {
				const uri = args[0];
				await vscode.commands.executeCommand(
					"merge.dev.loadContentsFromFolder",
					{
						folderUri: uri,
						resultState: "initial",
					}
				);
			}
		);

		vscode.commands.registerCommand(
			"vscode-diagnostic-tools.open-folder-in-merge-editor-current",
			async (...args) => {
				vscode.window.showErrorMessage("Not implemented yet");
				const uri = args[0];
				await vscode.commands.executeCommand(
					"merge.dev.loadContentsFromFolder",
					{
						folderUri: uri,
						resultState: "current",
					}
				);
			}
		);

		vscode.commands.registerCommand(
			"vscode-diagnostic-tools.reproduce-conflict-in-playground",
			async (...args) => {
				try {
					const uri = args[0];

					let gitPlaygroundPath = vscode.workspace
						.getConfiguration()
						.get<string>(gitPlaygroundPathKey);

					if (!gitPlaygroundPath) {
						vscode.window.showErrorMessage(
							`Setting "${gitPlaygroundPathKey}" must be configured!`
						);
						return;
					}

					gitPlaygroundPath = gitPlaygroundPath.replace(
						"${workspaceFolder}",
						vscode.workspace.workspaceFolders![0].uri.toString()
					);

					const playgroundUri = vscode.Uri.parse(gitPlaygroundPath);
					let ls: [string, vscode.FileType][] | undefined = undefined;
					try {
						ls = await vscode.workspace.fs.readDirectory(
							playgroundUri
						);
					} catch (e) {
						// directory does not exist
					}
					if (ls && ls.length > 0) {
						const hasGit = ls.some(
							([name, type]) => name === ".git"
						);
						const hasTarget = ls.some(([name, type]) =>
							name.startsWith("target")
						);
						if (!hasGit || !hasTarget) {
							vscode.window.showErrorMessage(
								"Cannot delete playground folder"
							);
							return;
						}
						for (const item of ls) {
							await vscode.workspace.fs.delete(
								vscode.Uri.joinPath(playgroundUri, item[0]),
								{
									recursive: true,
									useTrash: true,
								}
							);
						}
					}

					const targetDirLs = await vscode.workspace.fs.readDirectory(
						uri
					);
					function findFile(prefix: string): {
						uri: vscode.Uri;
						suffix: string;
					} {
						const fileName = targetDirLs.find(([fileName]) =>
							fileName.startsWith(prefix)
						);
						if (!fileName) {
							throw new Error("File not found");
						}
						return {
							uri: vscode.Uri.joinPath(uri, fileName[0]),
							suffix: fileName[0].substring(prefix.length),
						};
					}

					const paths = {
						input1: findFile("input1"),
						input2: findFile("input2"),
						base: findFile("base"),
					};

					await vscode.workspace.fs.createDirectory(playgroundUri);

					const context = { cwd: playgroundUri.fsPath };
					await execGitCmd(["init"], context);
					const playgroundTargetFile = vscode.Uri.joinPath(
						playgroundUri,
						`target${paths.base.suffix}`
					);

					await vscode.workspace.fs.writeFile(
						playgroundTargetFile,
						await vscode.workspace.fs.readFile(paths.base.uri)
					);

					await execGitCmd(["add", "*"], context);
					await execGitCmd(
						[
							"-c",
							"commit.gpgsign=false",
							"commit",
							"-m",
							"add initial version",
						],
						context
					);

					await execGitCmd(["checkout", "-b", "theirs"], context);
					await vscode.workspace.fs.writeFile(
						playgroundTargetFile,
						await vscode.workspace.fs.readFile(paths.input2.uri)
					);
					await execGitCmd(["add", "*"], context);
					await execGitCmd(
						[
							"-c",
							"commit.gpgsign=false",
							"commit",
							"-m",
							"add their version",
						],
						context
					);

					await execGitCmd(["checkout", "main"], context);
					await vscode.workspace.fs.writeFile(
						playgroundTargetFile,
						await vscode.workspace.fs.readFile(paths.input1.uri)
					);
					await execGitCmd(["add", "*"], context);
					await execGitCmd(
						[
							"-c",
							"commit.gpgsign=false",
							"commit",
							"-m",
							"add our version",
						],
						context
					);

					await execGitCmd(["merge", "theirs"], context);

					vscode.window.showInformationMessage(
						"Successfully reproduced the conflict!"
					);
				} catch (e: any) {
					vscode.window.showErrorMessage(e);
				}
			}
		);
	}
}

function execGitCmd(args: string[], context: { cwd: string }) {
	return new Promise((resolve, reject) => {
		const commandExecuter = spawn("git", args, { cwd: context.cwd });
		let stdOutData = "";
		let stderrData = "";

		commandExecuter.stdout.on("data", (data) => (stdOutData += data));
		commandExecuter.stderr.on("data", (data) => (stderrData += data));
		commandExecuter.on("close", (code) =>
			code != 0
				? reject(stderrData.toString())
				: resolve(stdOutData.toString())
		);
	});
}
