"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const parse5 = require("parse5");
const fs = require("fs");
const parser = require("prettier-plugin-svelte");
const getLast = (arr) => arr[arr.length - 1];
function getNodeHelper(path, count) {
    const stackIndex = getNodeStackIndexHelper(path.stack, count);
    return stackIndex === -1 ? null : path.stack[stackIndex];
}
function getNodeStackIndexHelper(stack, count) {
    for (let i = stack.length - 1; i >= 0; i -= 2) {
        const value = stack[i];
        if (value && !Array.isArray(value) && --count < 0) {
            return i;
        }
    }
    return -1;
}
class FastPath {
    constructor(value) {
        this.stack = [value];
    }
    // The name of the current property is always the penultimate element of
    // this.stack, and always a String.
    getName() {
        const { stack } = this;
        const { length } = stack;
        if (length > 1) {
            return stack[length - 2];
        }
        // Since the name is always a string, null is a safe sentinel value to
        // return if we do not know the name of the (root) value.
        /* istanbul ignore next */
        return null;
    }
    // The value of the current property is always the final element of
    // this.stack.
    getValue() {
        return getLast(this.stack);
    }
    getNode(count = 0) {
        return getNodeHelper(this, count);
    }
    getParentNode(count = 0) {
        return getNodeHelper(this, count + 1);
    }
    // Temporarily push properties named by string arguments given after the
    // callback function onto this.stack, then call the callback with a
    // reference to this (modified) FastPath object. Note that the stack will
    // be restored to its original state after the callback is finished, so it
    // is probably a mistake to retain a reference to the path.
    call(callback, ...names) {
        const { stack } = this;
        const { length } = stack;
        let value = getLast(stack);
        for (const name of names) {
            value = value[name];
            stack.push(name, value);
        }
        const result = callback(this);
        stack.length = length;
        return result;
    }
    callParent(callback, count = 0) {
        const stackIndex = getNodeStackIndexHelper(this.stack, count + 1);
        const parentValues = this.stack.splice(stackIndex + 1);
        const result = callback(this);
        this.stack.push(...parentValues);
        return result;
    }
    // Similar to FastPath.prototype.call, except that the value obtained by
    // accessing this.getValue()[name1][name2]... should be array-like. The
    // callback will be called with a reference to this path object for each
    // element of the array.
    each(callback, ...names) {
        const { stack } = this;
        const { length } = stack;
        let value = getLast(stack);
        for (const name of names) {
            value = value[name];
            stack.push(name, value);
        }
        for (let i = 0; i < value.length; ++i) {
            if (i in value) {
                stack.push(i, value[i]);
                // If the callback needs to know the value of i, call
                // path.getName(), assuming path is the parameter name.
                callback(this);
                stack.length -= 2;
            }
        }
        stack.length = length;
    }
    // Similar to FastPath.prototype.each, except that the results of the
    // callback function invocations are stored in an array and returned at
    // the end of the iteration.
    map(callback, ...names) {
        const { stack } = this;
        const { length } = stack;
        let value = getLast(stack);
        for (const name of names) {
            value = value[name];
            stack.push(name, value);
        }
        const result = new Array(value.length);
        for (let i = 0; i < value.length; ++i) {
            if (i in value) {
                stack.push(i, value[i]);
                result[i] = callback(this, i);
                stack.length -= 2;
            }
        }
        stack.length = length;
        return result;
    }
    /**
     * @param {...(
     *   | ((node: any, name: string | null, number: number | null) => boolean)
     *   | undefined
     * )} predicates
     */
    match(...predicates) {
        let stackPointer = this.stack.length - 1;
        let name = null;
        let node = this.stack[stackPointer--];
        for (const predicate of predicates) {
            if (node === undefined) {
                return false;
            }
            // skip index/array
            let number = null;
            if (typeof name === "number") {
                number = name;
                name = this.stack[stackPointer--];
                node = this.stack[stackPointer--];
            }
            if (predicate && !predicate(node, name, number)) {
                return false;
            }
            name = this.stack[stackPointer--];
            node = this.stack[stackPointer--];
        }
        return true;
    }
}
exports.FastPath = FastPath;
//import { SupportLanguage, Parser, Printer } from 'prettier';
//import { configurationSettings } from './globals/enums';
class JsonEditorPanel {
    constructor(extensionPath, column, theme) {
        this.scriptTextSave = [];
        this.scriptNodeSave = {};
        this._disposables = [];
        this._extensionPath = extensionPath;
        this._currentEditor = vscode.window.activeTextEditor;
        this._panel = vscode.window.createWebviewPanel(JsonEditorPanel.viewType, "JSON Tree Editor", column, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this._extensionPath, "jsoneditor")),
            ],
        });
        this._panel.webview.html = this.getHtmlForWebview(this._extensionPath, theme);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage((message) => {
            if (this._currentEditor) {
                this._currentEditor.edit((editBuilder) => {
                    const range = new vscode.Range(this._currentEditor.document.positionAt(0), this._currentEditor.document.positionAt(this._currentEditor.document.getText().length));
                    let html = parse5.serialize(JSON.parse(message.json));
                    //TODO dynamicky: Match every script using regex, this will return an array
                    // cycle the matched array and paste the text between them (index based)
                    html = html.replace(/<script[^>]*>.*?<\/script>/g, '<script>' + this.scriptTextSave[0] + '</script>');
                    editBuilder.replace(range, html);
                });
            }
        });
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        vscode.workspace.onDidSaveTextDocument(() => this.onDocumentChanged());
        vscode.window.onDidChangeActiveColorTheme(() => this.colorThemeKindChange(theme));
        this.colorThemeKindChange(theme);
        this.onActiveEditorChanged();
    }
    // tslint:disable-next-line:function-name
    static CreateOrShow(extensionPath) {
        const column = vscode.ViewColumn.Beside;
        //const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(this.extensionPrefix);
        //const theme: string = config.get(configurationSettings.theme);
        const theme = {
            [vscode.ColorThemeKind.Light]: "light",
            [vscode.ColorThemeKind.Dark]: "dark",
            [vscode.ColorThemeKind.HighContrast]: "dark",
        }[vscode.window.activeColorTheme.kind];
        if (JsonEditorPanel.currentPanel) {
            JsonEditorPanel.currentPanel._panel.reveal(column);
        }
        else {
            JsonEditorPanel.currentPanel = new JsonEditorPanel(extensionPath, column, theme);
        }
    }
    dispose() {
        JsonEditorPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    filterNodes(documentFragment) {
        const removeParentNode = (obj) => {
            Object.keys(obj).forEach(key => (key === 'parentNode') && delete obj[key] ||
                (obj[key] && typeof obj[key] === 'object') && removeParentNode(obj[key]));
            return obj;
        };
        delete documentFragment.nodeName;
        removeParentNode(documentFragment.childNodes);
        this.scriptNodeSave = documentFragment.childNodes.filter(function (obj) {
            return obj.tagName === 'script';
        });
        this.scriptNodeSave.map(node => this.scriptTextSave.push(node.childNodes[0].value));
        documentFragment.childNodes[0].childNodes[0].value = '';
        //documentFragment.childNodes[0].childNodes
        /*documentFragment.childNodes = documentFragment.childNodes.filter(function( obj ) {
          return obj.tagName !== 'script';
        }); */
        //TODO need this to be dynamic
        //const folderPath = vscode.workspace.rootPath+'/src/pages/';
        //this.createFiles(folderPath, 'script.txt', JSON.stringify(this.scriptTextSave));
        return documentFragment;
    }
    doFormat(input) {
        const folderPath = vscode.workspace.rootPath + '/src/pages/About/table.svelte';
        let ast = parser.parsers.svelte.parse(input);
        const locStart = parser.parsers.svelte.locStart;
        const locEnd = parser.parsers.svelte.locEnd;
        let options = {
            "svelteSortOrder": "scripts-styles-markup",
            "svelteStrictMode": true,
            "svelteBracketNewLine": true,
            "svelteAllowShorthand": false,
            "originalText": input,
            locStart,
            locEnd
        };
        let fastP = new FastPath(ast);
        let temp = parser.printers['svelte-ast'].print(fastP, options, console.log);
        console.log(temp);
    }
    createFiles(path, fileName, data) {
        fs.writeFile(path + '/' + fileName, data, err => {
            if (err) {
                return console.log(err);
            }
            console.log('Success');
        });
    }
    getJson() {
        let json = "";
        let documentFragment = "";
        if (this._currentEditor) {
            json = this._currentEditor.document.getText();
            this.doFormat(json);
            //documentFragment = parse5.parseFragment(json);
            //json = this.filterNodes(documentFragment);
        }
        json = JSON.stringify(json);
        return json;
    }
    colorThemeKindChange(theme) {
        const themenew = {
            [vscode.ColorThemeKind.Light]: "light",
            [vscode.ColorThemeKind.Dark]: "dark",
            [vscode.ColorThemeKind.HighContrast]: "dark",
        }[vscode.window.activeColorTheme.kind];
        if (themenew != theme) {
            vscode.window.showInformationMessage("Theme type change detected. Please close and reopen extension.");
        }
    }
    onActiveEditorChanged() {
        if (vscode.window.activeTextEditor) {
            this._currentEditor = vscode.window.activeTextEditor;
            const json = this.getJson();
            this._panel.webview.postMessage({ json: json });
        }
    }
    onDocumentChanged() {
        const json = this.getJson();
        this._panel.webview.postMessage({ json: json });
    }
    getHtmlForWebview(extensionPath, theme) {
        const mainScriptPathOnDisk = vscode.Uri.file(path.join(extensionPath, "jsoneditor", "main.js"));
        const mainScriptUri = mainScriptPathOnDisk.with({
            scheme: "vscode-resource",
        });
        const scriptPathOnDisk = vscode.Uri.file(path.join(extensionPath, "jsoneditor", "jsoneditor.min.js"));
        const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });
        const cssPathOnDisk = vscode.Uri.file(path.join(extensionPath, "jsoneditor", "jsoneditor.min.css"));
        const cssUri = cssPathOnDisk.with({ scheme: "vscode-resource" });
        const cssDarkPathOnDisk = vscode.Uri.file(path.join(extensionPath, "jsoneditor", "jsoneditor.dark.min.css"));
        const cssDarkUri = cssDarkPathOnDisk.with({ scheme: "vscode-resource" });
        const darkTheme = theme === "dark"
            ? `<link href="${cssDarkUri}" rel="stylesheet" type="text/css">`
            : "";
        return `
        <!DOCTYPE HTML>
        <html>
        <head>
            <!-- when using the mode "code", it's important to specify charset utf-8 -->
            <meta http-equiv="Content-Type" content="text/html;charset=utf-8">

            <link href="${cssUri}" rel="stylesheet" type="text/css">
            ${darkTheme}
            <script src="${scriptUri}"></script>
        </head>
        <body>
            <div id="jsoneditor"></div>

            <script src="${mainScriptUri}"></script>
        </body>
        </html>
        `;
    }
}
JsonEditorPanel.viewType = "jsonEditor";
exports.JsonEditorPanel = JsonEditorPanel;
//# sourceMappingURL=JsonEditorPanel.js.map