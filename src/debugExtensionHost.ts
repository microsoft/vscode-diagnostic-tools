import { spawn } from "child_process";
import path = require("path");
import { commands, debug, env, ExtensionContext } from "vscode";
import * as vscode from "vscode";

export class DebugExtensionHostFeature {
    constructor(context: ExtensionContext) {
        const data = context.globalState.get('attachToProcessId') as Data | undefined;
        if (data) {
            (async () => {
                vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Attaching to Extension Host" }, async () => {
                    context.globalState.update('attachToProcessId', undefined);
                    console.log("Attaching to Extension Host");
                    await debug.startDebugging(undefined, {
                        type: 'node',
                        request: 'attach',
                        name: 'Attach to Extension Host',
                        port: data.port,
                        "outFiles": [
                            "!**/node_modules/**",
                            "**/*.(m|c|)js",
                        ],
                    });
                });
            })();
        }

        commands.registerCommand("vscode-diagnostic-tools.debug-extension-host", async () => {
            const result = (await commands.executeCommand("workbench.extensions.action.debugExtensionHost", { dryRun: true })) as { inspectPorts: { port: number, host: string }[] };

            if (!result) {
                vscode.window.showErrorMessage("Failed to get inspect ports.");
                return;
            }

            await context.globalState.update('attachToProcessId', {
                port: result.inspectPorts[0].port,
                host: result.inspectPorts[0].host,
            } as Data);

            console.log('debugExtensionHost result:', result);
            commands.executeCommand('vscode.newWindow', { reuseWindow: false });

            (globalThis as any).vscodeApi = vscode;
        });
    }
}

interface Data {
    port: number;
    host: string,
}