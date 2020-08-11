"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function getData() {
    return `<script>
	const endpoint = 'https://countries.trevorblades.com/'
	const promise = fetch(endpoint).then(response => response.json())
</script>

{#await promise}
	<p>...waiting</p>
{:then data}
	{#each data.__schema.types as type}
	 <p>{type.name}</p>	
	 {/each}
{:catch error}
	<p>An error occurred!</p>
{/await}`;
}
function createDirectories(pathname) {
    const dirName = path.resolve();
    pathname = pathname.replace(/^\.*\/|\/?[^\/]+\.[a-z]+|\/$/g, '');
    fs.mkdir(path.resolve(dirName, pathname), { recursive: true }, e => {
        if (e) {
            return console.log(e);
        }
        else {
            console.log('Success');
        }
    });
}
function createFiles(path, fileName) {
    fs.writeFile(path + '/' + fileName, getData(), err => {
        if (err) {
            return console.log(err);
        }
        console.log('Success');
    });
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "iteriaui" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.addPage', () => {
        // The code you place here will be executed every time your command is executed
        const wsedit = new vscode.WorkspaceEdit();
        const asd = vscode.window.showInputBox({ placeHolder: 'Enter page name' }).then((input) => {
            const folderPath = vscode.workspace.rootPath + '/src/pages/' + input;
            createDirectories(folderPath);
            createFiles(folderPath, 'index.svelte');
            vscode.workspace.applyEdit(wsedit);
            vscode.window.showInformationMessage('New page created');
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map