require(['vs/editor/editor.main'], function () {
    document.body.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
            <span>LCS Length: <span id="lcsText">10</span></span>
            <div id="container" style="flex: 1"></div>
        </div>
    `;

    /**
     * @type {import("monaco-editor-core")}
     */
    const m = monaco;

    const changeEmitter = new m.Emitter();
    /**
     * @type import("monaco-editor-core").editor.LineRangeMapping[]
     */
    let changes = [];
debugger;
    const diffEditor = m.editor.createDiffEditor(document.getElementById('container'), {
        automaticLayout: true,
        ignoreTrimWhitespace: false,
        experimental: {
            useVersion2: true,
        },
        diffAlgorithm: {
            onDidChange: changeEmitter.event,
            computeDiff: () => {
                let d = {
					identical: false,
					quitEarly: false,
					changes: changes,
				};
                console.log('compute');
				return d;
            }
        },
    });

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

    window.addEventListener('message', e => {
        /**
         * @type {{
         *    kind: 'loadData';
         *    originalDocument: string;
         *    modifiedDocument: string;
         *    diffs: {
         *          originalRange: string;
         *          modifiedRange: string;
         *          innerChanges: {
         *              originalRange: string;
         *              modifiedRange: string;
         *          }[];
         *    }[]
         * }}
         */
        const message = e.data;

        originalModel.setValue(message.originalDocument);
        modifiedModel.setValue(message.modifiedDocument);

        function parseLineRange(str) {
            const [start, end] = str.slice(1, -1).split(',');
            return new m.editor.LineRange(+start, +end);
        }

        function parseRange(str) {
            const [startPos, endPos] = str.slice(1, -1).split('->');
            const [startLineNumber, startColumn] = startPos.split(',');
            const [endLineNumber, endColumn] = endPos.split(',');
            
            return new m.Range(
                +startLineNumber,
                +startColumn,
                +endLineNumber,
                +endColumn
            );  
        }

        changes = message.diffs.map(d => new m.editor.LineRangeMapping(
            parseLineRange(d.originalRange),
            parseLineRange(d.modifiedRange),
            d.innerChanges ? d.innerChanges.map(c => new m.editor.RangeMapping(
                parseRange(c.originalRange),
                parseRange(c.modifiedRange)
            )) : undefined
        ));

        function lineRangeToRange(lineRange) {
            return new m.Range(
                lineRange.startLineNumber,
                1,
                lineRange.endLineNumber,
                1
            );
        }

        const allInnerChanges = changes.flatMap(c => c.innerChanges || new m.editor.RangeMapping(lineRangeToRange(c.originalRange), lineRangeToRange(c.modifiedRange)));
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
