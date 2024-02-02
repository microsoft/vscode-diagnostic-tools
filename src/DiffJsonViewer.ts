import * as vscode from "vscode";

export class DiffJsonViewer {
	constructor(context: vscode.ExtensionContext) {
		vscode.window.registerCustomEditorProvider(
			"diffJsonViewer",
			{
				async resolveCustomTextEditor(document, webviewPanel, _token) {
					const webviewRoot = vscode.Uri.joinPath(
						context.extensionUri,
						"webview"
					);
					webviewPanel.webview.options = {
						enableScripts: true,
						localResourceRoots: [webviewRoot],
					};

					const script = webviewPanel.webview.asWebviewUri(
						vscode.Uri.joinPath(webviewRoot, "/src/script.js")
					);
					const monacoEditorCore = webviewPanel.webview.asWebviewUri(
						vscode.Uri.joinPath(
							webviewRoot,
							"/node_modules/monaco-editor/"
						)
					);

					webviewPanel.webview.html = `
                    <style>
                        body, html {
                            height: 100%;
                        }
                    </style>
                    <script src="${monacoEditorCore}/min/vs/loader.js"></script>
                    <script>
                        require.config({ paths: { vs: '${monacoEditorCore}/min/vs' } });
                    </script>
                    <script src="${script}"></script>
                `;

					interface DiffJsonDocument {
						diffs: unknown;
						moves: unknown;
						languageId: string;
						originalFileName: string | undefined;
						modifiedFileName: string | undefined;

						original:
							| { content: string; fileName: string }
							| undefined;
						modified:
							| { content: string; fileName: string }
							| undefined;
					}

					async function update() {
						const doc = JSON.parse(
							document.getText()
						) as DiffJsonDocument;

						let originalDocument = "";
						let modifiedDocument = "";
						let originalPath: string | undefined;

						if (doc.originalFileName) {
							originalPath = doc.originalFileName;
							const modifiedDoc =
								await vscode.workspace.openTextDocument(
									vscode.Uri.joinPath(
										document.uri,
										"..",
										doc.modifiedFileName!
									)
								);
							const originalDoc =
								await vscode.workspace.openTextDocument(
									vscode.Uri.joinPath(
										document.uri,
										"..",
										doc.originalFileName!
									)
								);
							originalDocument = originalDoc.getText();
							modifiedDocument = modifiedDoc.getText();
						} else {
							originalPath = doc.original?.fileName;
							originalDocument = doc.original!.content;
							modifiedDocument = doc.modified!.content;
						}

						function guessLanguage(path: string): string {
							const ext = path.split(".").pop();
							if (ext === "js") {
								return "javascript";
							}
							if (ext === "tst") {
								return "typescript";
							}
							return "text";
						}

						await webviewPanel.webview.postMessage({
							type: "loadData",
							originalDocument: originalDocument,
							modifiedDocument: modifiedDocument,
							diffs: doc.diffs,
							moves: doc.moves,
							languageId: originalPath
								? guessLanguage(originalPath)
								: undefined,
						});
					}

					const subscription =
						vscode.workspace.onDidChangeTextDocument((e) => {
							if (e.document === document) {
								update();
							}
						});
					webviewPanel.onDidDispose(() => {
						subscription.dispose();
					});

					webviewPanel.webview.onDidReceiveMessage(
						async (message) => {
							const m = message as { type: "ready" };

							if (m.type === "ready") {
								update();
							}
						}
					);
				},
			},
			{
				supportsMultipleEditorsPerDocument: true,
				webviewOptions: { retainContextWhenHidden: true },
			}
		);
	}
}
