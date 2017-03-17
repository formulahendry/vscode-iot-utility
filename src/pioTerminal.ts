"use strict";
import * as vscode from "vscode";

export class PioTerminal {
    private _terminal: vscode.Terminal;

    constructor() {
        this._terminal = vscode.window.createTerminal("PlatformIO");
    }

    public showAndRun(text: string): void {
        if (this._terminal === null) {
            this._terminal = vscode.window.createTerminal("PlatformIO");
        }
        this._terminal.show();
        this._terminal.sendText(text);
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        if (this._terminal === closedTerminal) {
            this._terminal = null;
        }
    }
}
