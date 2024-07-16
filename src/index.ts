import * as vscode from "vscode";
import { DiffEditorHelpers } from "./DiffEditorHelpers";
import { DiffJsonViewer } from "./DiffJsonViewer";
import { DebugExtensionHostFeature } from "./debugExtensionHost";

export function activate(context: vscode.ExtensionContext) {
	new DiffEditorHelpers();
	new DiffJsonViewer(context);
	new DebugExtensionHostFeature(context);
	if (process.env.TARGET !== "web") {
		new (require('./MergeEditorHelpers') as typeof import("./MergeEditorHelpers")).MergeEditorHelpers();
		new (require('./DebuggerScripts') as typeof import("./DebuggerScripts")).DebuggerScripts();
	}
}
