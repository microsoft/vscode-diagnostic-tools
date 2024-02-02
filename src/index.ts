import * as vscode from "vscode";
import { DiffEditorHelpers } from "./DiffEditorHelpers";
import { DiffJsonViewer } from "./DiffJsonViewer";

export function activate(context: vscode.ExtensionContext) {
	new DiffEditorHelpers();
	new DiffJsonViewer(context);
	if (process.env.TARGET !== "web") {
		new (require('./MergeEditorHelpers') as typeof import("./MergeEditorHelpers")).MergeEditorHelpers();
		new (require('./DebuggerScripts') as typeof import("./DebuggerScripts")).DebuggerScripts();
	}
}
