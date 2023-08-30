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
                            "/node_modules/monaco-editor-core/"
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
                        originalFileName: string | undefined;
                        modifiedFileName: string | undefined;
    
                        original: { content: string } | undefined;
                        modified: { content: string } | undefined;
                    }
    
                    async function update() {
                        const doc = JSON.parse(
                            document.getText()
                        ) as DiffJsonDocument;
    
                        let originalDocument = "";
                        let modifiedDocument = "";
    
                        if (doc.originalFileName) {
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
                            originalDocument = doc.original!.content;
                            modifiedDocument = doc.modified!.content;
                        }
    
                        await webviewPanel.webview.postMessage({
                            type: "loadData",
                            originalDocument: originalDocument,
                            modifiedDocument: modifiedDocument,
                            diffs: doc.diffs,
                        });
                    }
    
                    const subscription = vscode.workspace.onDidChangeTextDocument(
                        (e) => {
                            if (e.document === document) {
                                update();
                            }
                        }
                    );
                    webviewPanel.onDidDispose(() => {
                        subscription.dispose();
                    });
    
                    webviewPanel.webview.onDidReceiveMessage(async (message) => {
                        const m = message as { type: "ready" };
    
                        if (m.type === "ready") {
                            update();
                        }
                    });
                },
            },
            {
                supportsMultipleEditorsPerDocument: true,
                webviewOptions: { retainContextWhenHidden: true },
            }
        );
    }
}