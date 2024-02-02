/// <reference path="./types.d.ts" />

require(['vs/editor/editor.main'], function () {
	document.body.innerHTML = `
		<div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
			<span>LCS Length: <span id="lcsText">10</span></span>
			<div id="container" style="flex: 1"></div>
		</div>
	`;

	/**
	 * @type {import("monaco-editor")}
	 */
	const m = monaco;

	class MyDiffProviderFactoryService {
		createDiffProvider(editor, options) {
			return {
				onDidChange: changeEmitter.event,
				async computeDiff(original, modified, options, token) {
					let d = {
						identical: false,
						quitEarly: false,
						changes: changes,
						moves: moves,
					};
					return d;
				}
			}
		}
	}
	const standaloneServices = require("vs/editor/standalone/browser/standaloneServices");
	standaloneServices.StandaloneServices.initialize({
		'diffProviderFactoryService': new MyDiffProviderFactoryService(),
	});


	const changeEmitter = new m.Emitter();
	let changes = [];
	let moves = [];

	const diffEditor = m.editor.createDiffEditor(document.getElementById('container'), {
		automaticLayout: true,
		ignoreTrimWhitespace: false,
		hideUnchangedRegions: {
			enabled: true,
		},
		experimental: {
			showMoves: true,
		}
	});

	m.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
	m.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });

	const originalModel = m.editor.createModel('', 'text');
	const modifiedModel = m.editor.createModel('', 'text');

	diffEditor.setModel({
		original: originalModel,
		modified: modifiedModel
	});

	const api = acquireVsCodeApi();
	api.postMessage({
		type: 'ready'
	});

	const { RangeMapping, DetailedLineRangeMapping, LineRangeMapping } = require('vs/editor/common/diff/rangeMapping');
	const { Range } = require('vs/editor/common/core/range');
	const { LineRange } = require('vs/editor/common/core/lineRange');
	const { MovedText } = require('vs/editor/common/diff/linesDiffComputer');
	
	window.addEventListener('message', e => {
		/**
		 * @type {{
		 *    kind: 'loadData';
		 *    originalDocument: string;
		 *    modifiedDocument: string;
		 *    languageId?: string;
		 *    diffs: DiffingResult['diffs'];
		 * 	  moves: DiffingResult['moves'];
		 * }}
		 */
		const message = e.data;
		
		originalModel.setValue(message.originalDocument);
		modifiedModel.setValue(message.modifiedDocument);
		console.log(message.languageId);
		m.editor.setModelLanguage(originalModel, message.languageId ?? 'text');
		m.editor.setModelLanguage(modifiedModel, message.languageId ?? 'text');

		function parseLineRange(str) {
			const [start, end] = str.slice(1, -1).split(',');
			return new LineRange(+start, +end);
		}

		function parseRange(str) {
			const [startPos, endPos] = str.slice(1, -1).split('->');
			const [startLineNumber, startColumn] = startPos.split(',');
			const [endLineNumber, endColumn] = endPos.split(',');
			
			return new Range(
				+startLineNumber.trim().split(' ')[0],
				+startColumn.trim().split(' ')[0],
				+endLineNumber.trim().split(' ')[0],
				+endColumn.trim().split(' ')[0]
			);  
		}

		/**
		 * @param {IDetailedDiff}
		 */
		function toDetailedLineRangeMapping(d) {
			return new DetailedLineRangeMapping(
				parseLineRange(d.originalRange),
				parseLineRange(d.modifiedRange),
				d.innerChanges ? d.innerChanges.map(c => new RangeMapping(
					parseRange(c.originalRange),
					parseRange(c.modifiedRange)
				)) : undefined
			);
		}

		changes = message.diffs.map(toDetailedLineRangeMapping);
		moves = message.moves.map(m => new MovedText(
			new LineRangeMapping(parseLineRange(m.originalRange), parseLineRange(m.modifiedRange)),
			m.changes.map(d => toDetailedLineRangeMapping(d))
		));

		function lineRangeToRange(lineRange) {
			return new Range(
				lineRange.startLineNumber,
				1,
				lineRange.endLineNumber,
				1
			);
		}

		const allInnerChanges = changes.flatMap(c => c.innerChanges || new RangeMapping(lineRangeToRange(c.original), lineRangeToRange(c.modified)));
		let lcsLen = 0;
		
		for (let i = 0; i <= allInnerChanges.length; i++) {
			const previousInnerChange = allInnerChanges[i - 1];
			const innerChange = allInnerChanges[i];
			
			const startPosition = previousInnerChange ? previousInnerChange.originalRange.getEndPosition() : new m.Position(1, 1);
			const endPosition = innerChange ? innerChange.originalRange.getStartPosition() : new m.Position(originalModel.getLineCount() + 1, 1);

			const range = m.Range.fromPositions(startPosition, endPosition);
			const text = originalModel.getValueInRange(range);
			lcsLen += text.length;
		}

		document.getElementById('lcsText').innerText = lcsLen.toString();

		changeEmitter.fire();
	});
});
