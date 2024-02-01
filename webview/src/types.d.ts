interface DiffingResult {
	original: { content: string; fileName: string };
	modified: { content: string; fileName: string };

	diffs: IDetailedDiff[];
	moves?: IMoveInfo[];
}

interface IDetailedDiff {
	originalRange: string; // [startLineNumber, endLineNumberExclusive)
	modifiedRange: string; // [startLineNumber, endLineNumberExclusive)
	innerChanges: IDiff[] | null;
}

interface IDiff {
	originalRange: string; // [1,18 -> 1,19]
	modifiedRange: string; // [1,18 -> 1,19]
}

interface IMoveInfo {
	originalRange: string; // [startLineNumber, endLineNumberExclusive)
	modifiedRange: string; // [startLineNumber, endLineNumberExclusive)

	changes: IDetailedDiff[];
}
