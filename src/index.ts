import * as vscode from "vscode";
import { DiffEditorHelpers } from "./DiffEditorHelpers";
import { MergeEditorHelpers } from "./MergeEditorHelpers";
import { DiffJsonViewer } from "./DiffJsonViewer";

export function activate(context: vscode.ExtensionContext) {
	new DiffEditorHelpers();
	new MergeEditorHelpers();
	new DiffJsonViewer(context);
}
