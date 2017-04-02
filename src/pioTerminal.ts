"use strict";
import * as vscode from "vscode";

export class PioTerminal {
    private _terminal: vscode.Terminal;

    constructor() {
        this._terminal = vscode.window.createTerminal("PlatformIO");
    }

    public show(): void {
        if (this._terminal === null) {
            this._terminal = vscode.window.createTerminal("PlatformIO");
        }
        this._terminal.show();
    }

    public showAndRun(text: string): void {
        this.show();
        this._terminal.sendText(text);
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        if (this._terminal === closedTerminal) {
            this._terminal = null;
        }
    }
}
