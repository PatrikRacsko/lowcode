"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const parse5 = require("parse5");
//import { configurationSettings } from './globals/enums';
class JsonEditorPanel {
    constructor(extensionPath, column, theme) {
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
                    const html = parse5.serialize(JSON.parse(message.json));
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
        let innerArray = [];
        let outerArray = [];
        documentFragment.childNodes.forEach((element) => {
            if (element.childNodes && element.childNodes.length > 0) {
                element.childNodes.forEach((element) => {
                    if (element.parentNode) {
                        delete element.parentNode;
                    }
                });
                //innerArray.push(element.childNodes);
            }
            if (element.parentNode) {
                delete element.parentNode;
            }
            /*element[String(element.tagName)] = {
             childNodes: innerArray
           }
           outerArray.push()
           innerArray = []; */
        });
        delete documentFragment.nodeName;
        //console.log(documentFragment);
        return documentFragment;
    }
    getJson() {
        let json = "";
        let documentFragment = "";
        if (this._currentEditor) {
            json = this._currentEditor.document.getText();
            documentFragment = parse5.parseFragment(json);
            json = this.filterNodes(documentFragment);
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