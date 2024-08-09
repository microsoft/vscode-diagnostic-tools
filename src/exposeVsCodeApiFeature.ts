import * as vscode from "vscode";
import path = require("path");

export class ExposeVsCodeApiFeature {
    constructor() {
        (globalThis as any).vscode = vscode;
    }
}
