"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { PioTerminal } from "./pioTerminal";

export class PlatformIO {
    private _pioTerminal: PioTerminal;

    constructor() {
        this._pioTerminal = new PioTerminal();
        this.createStatusBarItems();
    }

    public build(): void {
        this._pioTerminal.showAndRun("platformio run");
        AppInsightsClient.sendEvent("build");
    }

    public upload(): void {
        this._pioTerminal.showAndRun("platformio run --target upload");
        AppInsightsClient.sendEvent("upload");
    }

    public openSerialMonitor(): void {
        this._pioTerminal.showAndRun("platformio device monitor");
        AppInsightsClient.sendEvent("openSerialMonitor");
    }

    public searchLibrary(): void {
        let query = "CANCELED";
        vscode.window.showInputBox({
            prompt: "Search for PlatformIO Library",
            placeHolder: "Type query to search",
        }).then((input: string) => {
            if (input !== undefined) {
                query = input;
                this._pioTerminal.showAndRun(`platformio lib search ${query}`);
            }
            AppInsightsClient.sendEvent("searchLibrary", { query });
        });
    }

    public installLibrary(): void {
        let library = "CANCELED";
        vscode.window.showInputBox({
            prompt: "Install PlatformIO Library",
            placeHolder: "Type library id or name to install",
        }).then((input: string) => {
            if (input !== undefined) {
                library = input;
                this._pioTerminal.showAndRun(`platformio lib install ${library}`);
            }
            AppInsightsClient.sendEvent("installLibrary", { library });
        });
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        this._pioTerminal.onDidCloseTerminal(closedTerminal);
    }

    private createStatusBarItems(): void {
        let openSerialMonitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
        openSerialMonitorStatusBarItem.command = "platformio.openSerialMonitor";
        openSerialMonitorStatusBarItem.text = "$(plug) Serial Monitor";
        openSerialMonitorStatusBarItem.tooltip = "Open Serial Monitor";
        openSerialMonitorStatusBarItem.show();

        let searchLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        searchLibraryStatusBarItem.command = "platformio.searchLibrary";
        searchLibraryStatusBarItem.text = "$(search) Library";
        searchLibraryStatusBarItem.tooltip = "Search PlatformIO Library";
        searchLibraryStatusBarItem.show();

        let installLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        installLibraryStatusBarItem.command = "platformio.installLibrary";
        installLibraryStatusBarItem.text = "$(cloud-download)";
        installLibraryStatusBarItem.tooltip = "Install PlatformIO Library";
        installLibraryStatusBarItem.show();
    }
}
