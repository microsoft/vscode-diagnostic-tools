import * as vscode from "vscode";
import { LzmaCompressor } from "./lzmaCompressor";

export class DiffEditorHelpers {
	constructor() {
		vscode.commands.registerCommand(
			"vscode-diagnostic-tools.open-diff-in-monaco-editor-playground",
			async (...args) => {
				const url = await getMonacoEditorUrl();
				if (url) {
					await vscode.env.openExternal(vscode.Uri.parse(url));
				}
			}
		);

		vscode.commands.registerCommand(
			"vscode-diagnostic-tools.diff-editor-report-bug",
			async (...args) => {
				const monacoEditorUrl = await getMonacoEditorUrl();
				if (!monacoEditorUrl) {
					return;
				}
				const githubUrl = new URL(
					"https://github.com/microsoft/vscode/issues/new"
				);
				githubUrl.searchParams.set(
					"body",
					`## Description

<!-- Describe the bug and make sure the playground example demonstrates the problem and does not contain sensitive data -->
<!-- Please include a screenshot! -->

## Playground Example

[Monaco Editor Playground Repro](${monacoEditorUrl}) (click on "use latest dev" to verify a future bug-fix)\n`
				);
				githubUrl.searchParams.set("assignees", "hediet");
				githubUrl.searchParams.set("labels", "diff-editor");
				githubUrl.searchParams.set("template", "Blank issue");
				const uri = vscode.Uri.from({
					scheme: "https",
					authority: githubUrl.host,
					path: githubUrl.pathname,
					query: githubUrl.search,
				});
				await vscode.env.openExternal(githubUrl.toString() as any);
			}
		);
	}
}

async function getMonacoEditorUrl() {
	const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
	if (!activeTab) {
		vscode.window.showErrorMessage("No active tab");
		return;
	}

	const input = activeTab.input as {
		modified: vscode.Uri;
		original: vscode.Uri;
	};

	const mod = vscode.workspace.textDocuments.find(
		(doc) => doc.uri.toString() === input.modified.toString()
	);
	const orig = vscode.workspace.textDocuments.find(
		(doc) => doc.uri.toString() === input.original.toString()
	);

	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor || !mod || !orig) {
		vscode.window.showErrorMessage("No active text editor");
		return;
	}

	let modSelection: vscode.Range | undefined = undefined;
	let origSelection: vscode.Range | undefined = undefined;

	const selection = activeTextEditor.selection;
	if (!selection.isEmpty) {
		// assuming modified is selected
		modSelection = selection;
		const result: { destinationSelection: any } =
			await vscode.commands.executeCommand("diffEditor.switchSide", {
				dryRun: true,
			});
		const d = result.destinationSelection;
		origSelection = new vscode.Range(
			d.startLineNumber - 1,
			d.startColumn - 1,
			d.endLineNumber - 1,
			d.endColumn - 1
		);
	}

	if (
		activeTextEditor.document.uri.toString() === input.original.toString()
	) {
		const tmp = modSelection;
		modSelection = origSelection;
		origSelection = tmp;
	}

	const modText = mod.getText(modSelection);
	const origText = orig.getText(origSelection);
	const settings = JSON.stringify(
		{
			originalEditable: true,
			automaticLayout: true,
			useInlineViewWhenSpaceIsLimited: false,
			...vscode.workspace.getConfiguration("").get("diffEditor"),
		},
		undefined,
		"\t"
	);

	function toLiteralStringExpr(value: string): string {
		const str =
			"`" +
			value
				.replaceAll("\\", "\\\\")
				.replaceAll("$", "\\$")
				.replaceAll("`", "\\`") +
			"`";
		return str;
	}

	const lzmaCompressor = new LzmaCompressor<MonacoEditorPlaygroundState>();
	const lzmaEncoded = lzmaCompressor.encodeData<MonacoEditorPlaygroundState>({
		html: `<div id="container" style="height: 100%"></div>`,
		js: jsTemplate
			.replace("___modifiedValue___", toLiteralStringExpr(modText))
			.replace("___originalValue___", toLiteralStringExpr(origText))
			.replace("___settings___", settings.replaceAll("\n", "\n\t")),
		css: "",
	});

	const devVersion = await getLatestDevVersion();
	const url = `https://microsoft.github.io/monaco-editor/playground.html?source=v${devVersion}#${lzmaEncoded}`;
	return url;
}

interface MonacoEditorPlaygroundState {
	html: string;
	js: string;
	css: string;
}

const jsTemplate = `
const originalModel = monaco.editor.createModel(
	/* set from \`originalModel\`: */ ___originalValue___,
	"text/plain"
);
const modifiedModel = monaco.editor.createModel(
	/* set from \`modifiedModel\`: */ ___modifiedValue___,
	"text/plain"
);

const diffEditor = monaco.editor.createDiffEditor(
	document.getElementById("container"),
	___settings___
);
diffEditor.setModel({
	original: originalModel,
	modified: modifiedModel,
});
`;

async function getLatestDevVersion() {
	try {
		const data = (await (
			await (globalThis as any).fetch(
				"https://registry.npmjs.org/-/package/monaco-editor/dist-tags"
			)
		).json()) as { latest: string; next: string };
		return data.next;
	} catch (e) {
		const data = (await (
			await (globalThis as any).fetch(
				"https://cdn.jsdelivr.net/npm/monaco-editor@next/package.json"
			)
		).json()) as { version: string };
		return data.version;
	}
}
