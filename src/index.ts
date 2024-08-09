import * as vscode from "vscode";
import { DiffEditorHelpers } from "./DiffEditorHelpers";
import { DiffJsonViewer } from "./DiffJsonViewer";
import { ExposeVsCodeApiFeature } from "./exposeVsCodeApiFeature";

export function activate(context: vscode.ExtensionContext) {
	new DiffEditorHelpers();
	new DiffJsonViewer(context);
	new ExposeVsCodeApiFeature();
	if (process.env.TARGET !== "web") {
		new (require('./MergeEditorHelpers') as typeof import("./MergeEditorHelpers")).MergeEditorHelpers();
		new (require('./DebuggerScripts') as typeof import("./DebuggerScripts")).DebuggerScripts();
	}
}
