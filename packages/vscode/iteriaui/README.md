# JSON Tree Editor

A vscode extension to preview and edit JSON documents in a simple tree view, based on <https://jsoneditoronline.org>.
##
To start open the command pallete and type `json`.
`View>Command Palette> JSON Tree Editor: Start JSON editor session`

When a JSON file is opened in a standard vscode editor, you'll also find a `{}` icon in the right part of the editor's
top title bar to directly open JSON Tree Editor.

You can also make a right click upon a JSON file in the tree explorer, where you'll find a
**Start JSON Tree Editor session** item that will open both standard editor and JSON Tree Editor side by side.

## Contributions

- Tree view code provided by [jsoneditor](https://github.com/josdejong/jsoneditor)
- Explorer context menu item and titlebar icon provided by [vertcitron](https://github.com/vertcitron)
- Original project by [sunmorgus](https://github.com/sunmorgus/vscode-json-editor)

## Release Notes

### 1.0.200602

- Corrected some naming inconsistancies

### 1.0.0

- Forked from v.0.2.3 of VSCode JSON Editor by Sunmorgus
- Added Explorer context menu item and titlebar icon (Issue #13 from original project)
- Updated to the latest jsoneditor release (9.0.0 published on 05/24/2020)
- Beautify CSS and JS files from JSON Editor Online files.
- Extension will now detect the active theme type and match it. (Issue #6 and several others from original project)
    - If theme type changes (light to dark, dark to light, high Contrast stays dark) a message asking you to
        close and reopen the extension.
- Changed from vscode-resource to Webview.asWebviewUri per Microsoft request (Issue #21 from original project)
- Updated VS Code NPM Module allowing for better API compatability
- Updated Readme, change log, etc.
