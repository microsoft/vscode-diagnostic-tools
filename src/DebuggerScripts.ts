/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { watch } from "fs";
import * as vscode from "vscode";

export class DebuggerScripts {
	constructor() {
		const managedSessions = new Map<
			vscode.DebugSession,
			ManagedDebugSession
		>();

		const scriptManager = new ScriptManager();

		vscode.debug.onDidStartDebugSession((e) => {
			const session = new ManagedDebugSession(e, scriptManager);
			managedSessions.set(e, session);
		});
		vscode.debug.onDidTerminateDebugSession((e) => {
			const session = managedSessions.get(e);
			if (session) {
				session.dispose();
				managedSessions.delete(e);
			}
		});

		const session = vscode.debug.activeDebugSession;
		if (session) {
			managedSessions.set(
				session,
				new ManagedDebugSession(session, scriptManager)
			);
		}
	}
}

interface LaunchConfigExtension {
	["vscode-diagnostic-tools.debuggerScripts"]?: string[];
}

interface ScriptModule {
	run?: RunFunction;
}

const nodeJsRequire = eval('require'); // CodeQL [SM04509] This is to prevent webpack from rewriting "require", because we really want the nodejs require function here.

class HotScript<T> {
	private _timeout: NodeJS.Timeout | undefined;

	private readonly _watcher = watch(this.moduleId, {}, () => {
		if (this._timeout) {
			clearTimeout(this._timeout);
		}
		this._timeout = setTimeout(() => {
			this._reload();
		}, 100);
	});

	private _exports: T | undefined;
	public exports(): T | undefined {
		return this._exports;
	}

	private readonly _watchers = new Set<() => void>();

	constructor(public readonly moduleId: string) {
		this._reload();
	}

	onExportsChanged(watcher: () => void): IDisposable {
		this._watchers.add(watcher);
		return {
			dispose: () => {
				this._watchers.delete(watcher);
			},
		};
	}

	private _reload() {
		delete nodeJsRequire.cache[this.moduleId];
		try {
			this._exports = nodeJsRequire(this.moduleId);
			for (const watcher of this._watchers) {
				watcher();
			}
		} catch (e) {
			console.error(e);
		}
	}

	dispose() {
		delete nodeJsRequire.cache[this.moduleId];
		this._watcher.close();
	}
}

class HotScriptReference<T> {
	constructor(
		private readonly _script: HotScript<T>,
		public readonly dispose: () => void
	) { }

	public onExportsChanged(watcher: () => void): IDisposable {
		return this._script.onExportsChanged(watcher);
	}

	public get exports(): T | undefined {
		return this._script.exports();
	}
}

class ScriptManager {
	private readonly _scripts = new Map<
		string,
		{ script: HotScript<any>; counter: number }
	>();

	public load<T>(path: string): HotScriptReference<T> {
		const moduleId = nodeJsRequire.resolve(path);

		let script = this._scripts.get(moduleId);
		if (!script) {
			script = {
				script: new HotScript(moduleId),
				counter: 0,
			};
			this._scripts.set(moduleId, script);
		}
		script.counter++;
		return new HotScriptReference(script.script, () => {
			script!.counter--;
			if (script!.counter === 0) {
				script!.script.dispose();
				this._scripts.delete(moduleId);
			}
		});
	}
}

class ManagedDebugSession {
	private readonly _disposables: IDisposable[] = [];
	private readonly _debugSessionApi = createDebugSession(this._session);

	constructor(
		private readonly _session: vscode.DebugSession,
		private readonly _scriptManager: ScriptManager
	) {
		const config: LaunchConfigExtension = {};
		let s: vscode.DebugSession | undefined = _session;
		while (s) {
			Object.assign(config, config, s.configuration);
			s = s.parentSession;
		}

		const debuggerScripts =
			config["vscode-diagnostic-tools.debuggerScripts"];
		if (debuggerScripts) {
			const scripts = debuggerScripts.flatMap((path) =>
				resolvePaths(path, this._session.workspaceFolder)
			);
			for (const script of scripts) {
				const scriptRef =
					this._scriptManager.load<ScriptModule>(script);
				this._disposables.push(scriptRef);

				let scriptDisposable:
					| IDisposable
					| Promise<IDisposable>
					| undefined = undefined;
				function disposeScriptDisposables() {
					const d = scriptDisposable;
					if (!d) {
						return;
					}
					if ("dispose" in d) {
						d.dispose();
					} else {
						d.then((d) => d.dispose());
					}
				}
				this._disposables.push({
					dispose: () => disposeScriptDisposables(),
				});

				const runScript = async () => {
					if (!scriptRef.exports) {
						return;
					}
					if (!scriptRef.exports.run) {
						console.error(
							`'${script}' does not export a 'run' function!`
						);
						return;
					}

					disposeScriptDisposables();
					try {
						scriptDisposable = scriptRef.exports.run(
							this._debugSessionApi,
							{ vscode: vscode }
						);
						await scriptDisposable;
					} catch (e) {
						console.error(`Error while loading '${script}': ${e}`);
					}
				};

				this._disposables.push(
					scriptRef.onExportsChanged(() => {
						runScript();
					})
				);
				runScript();
			}
		}
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}
		this._disposables.length = 0;
	}
}

function resolvePaths(
	path: string,
	workspaceFolder: vscode.WorkspaceFolder | undefined
): string[] {
	const tpl = new StringTemplate(path);
	const resolvedPath = tpl.evaluate({
		workspaceFolder: () => {
			if (!workspaceFolder) {
				throw new Error(
					`Cannot get workspace folder - '${path}' cannot be evaluated!`
				);
			}
			return workspaceFolder.uri.fsPath;
		},
	});
	return [resolvedPath];
}

export class StringTemplate {
	constructor(private readonly template: string) { }

	evaluate(data: Record<string, () => string>): string {
		return this.template.replace(/\$\{([a-zA-Z0-9]+)\}/g, (substr, grp1) =>
			data[grp1]()
		);
	}
}

function createDebugSession(vscodeSession: vscode.DebugSession): IDebugSession {
	class DebugSessionImpl implements IDebugSession {
		async evalJs<T extends any[], TResult>(
			body: (...args: T) => TResult,
			...args: T
		): Promise<TResult> {
			const expression = `JSON.stringify((${body.toString()})(${args
				.map((arg) => JSON.stringify(arg))
				.join(",")}))`;

			const reply = await vscodeSession.customRequest("evaluate", {
				expression: expression,
				frameId: undefined,
				context: "copy",
			});

			if (typeof reply.result === "string") {
				return JSON.parse(reply.result);
			}
			return undefined as any;
		}

		async eval(expression: string): Promise<void> {
			const reply = await vscodeSession.customRequest("evaluate", {
				expression: expression,
				frameId: undefined,
				context: "copy",
			});
		}

		get name(): string {
			return vscodeSession.name;
		}
	}

	// By doing it like this, we prevent users to access the underlying session.
	return new DebugSessionImpl();
}
