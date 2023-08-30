# VS Code Development Diagnostic Tools

This extension helps testing and developing various features (such as the merge and diff editor) in VS Code by providing some diagnostic/development features.

The target audience of this extension are developers working on VS Code itself or users that file bugs for VS Code.

## Commands

### Diagnose Diff Editor: Report Bug

Use this command to quickly report a bug for the diff editor.
It will pre-fill the GitHub form to create an issue in the vscode repository.
The pre-filled form includes a link to the monaco editor playground.
If you only want to share a fragment of the diff, select text on either side before invoking this command.

### Diagnose Diff Editor: Open In Monaco Editor Playground

Use this command to open the current diff in the monaco editor playground.
Used for the report bug functionality.

## Context Menus

### In `merge-conflict` folders: Reproduce Conflict In Playground

This commands expects the folder to contain the files `base.ext`, `input1.ext`, and `input2.ext` (`ext` being some file extension, e.g. `ts`).
Invoking the command creates a git conflict in a given folder, where input2 is merged into input1 and base being the common base.

### In `merge-conflict` folders: Open Folder In Merge Editor

This command expects the folder to contain the files `base.ext`, `input1.ext`, and `input2.ext` (`ext` being some file extension, e.g. `ts`).
Invoking the command opens the merge editor for the given files.

## Custom Editors

### Diff JSON Viewer

This viewer is used to display the diffs produced by the [VS Code diff snapshot tests](https://github.com/microsoft/vscode/blob/2af3045474f52bad8f14f01b09acfd5912e7fb5a/src/vs/editor/test/node/diffing/fixtures/random-match-2/advanced.expected.diff.json).

![Screenshot](docs/diff-json-viewer-screenshot.png)

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
