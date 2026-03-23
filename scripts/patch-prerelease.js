// @ts-check
'use strict';

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const buildNumber = process.argv[2];
if (!buildNumber) {
	console.error('Usage: node patch-prerelease.js <buildNumber>');
	process.exit(1);
}

const [major, minor] = packageJson.version.split('.');

// Build number format from Azure DevOps: yyyyMMdd.rev (e.g. 20231015.3)
// Use the revision portion as the patch number, replacing any existing patch
const patchStr = buildNumber.includes('.') ? buildNumber.split('.')[1] : buildNumber;
const patch = parseInt(patchStr, 10);

if (isNaN(patch)) {
	console.error(`Could not parse patch number from build number: ${buildNumber}`);
	process.exit(1);
}

packageJson.version = `${major}.${minor}.${patch}`;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
console.log(`Version patched to ${packageJson.version}`);
