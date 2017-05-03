"use strict";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { PioTerminal } from "./pioTerminal";
import { Utility } from "./utility";

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
        let baudRate = vscode.workspace.getConfiguration("platformio").get<number>("baudRate");
        this._pioTerminal.showAndRun(`platformio device monitor --baud ${baudRate}`);
        AppInsightsClient.sendEvent("openSerialMonitor", { baudRate: baudRate.toString() });
    }

    public buildUploadAndOpenSerialMonitor(): void {
        this.build();
        this.upload();
        this.openSerialMonitor();
        AppInsightsClient.sendEvent("buildUploadAndOpenSerialMonitor");
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

    public openTerminal(): void {
        let showHelpInfo = vscode.workspace.getConfiguration("platformio").get<boolean>("showHelpInfo");
        if (showHelpInfo) {
            this._pioTerminal.showAndRun("platformio --help");
        } else {
            this._pioTerminal.show();
        }
        AppInsightsClient.sendEvent("openTerminal", { showHelpInfo: showHelpInfo.toString() });
    }

    public addIncludePath(): void {
        try {
            let idedata = execSync("platformio run --target idedata", { encoding: "utf8", cwd: vscode.workspace.rootPath });
            let result = /{\s*"cxx_path".+}/.exec(idedata);
            if (result) {
                let idedataJson = JSON.parse(result[0]);
                let includes = idedataJson.includes;
                this.addIncludePathToFile(includes);
            } else {
                this.showErrorToAddIncludePath();
                return;
            }
            vscode.window.showInformationMessage("Add Include Path to c_cpp_properties.json successfully.");
        } catch (ex) {
            this.showErrorToAddIncludePath();
        } finally {
            AppInsightsClient.sendEvent("addIncludePath");
        }
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        this._pioTerminal.onDidCloseTerminal(closedTerminal);
    }

    private addIncludePathToFile(includes: string[]): void {
        const configFilePath = path.join(vscode.workspace.rootPath, ".vscode", "c_cpp_properties.json");
        const configFileDir = path.dirname(configFilePath);
        let configFileContent = null;
        if (!Utility.fileExistsSync(configFilePath)) {
            if (!Utility.directoryExistsSync(configFileDir)) {
                fs.mkdirSync(configFileDir);
            }
            configFileContent = {};
        } else {
            configFileContent = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
        }

        configFileContent.configurations = configFileContent.configurations || [];
        let configSection = null;
        configFileContent.configurations.forEach((section) => {
            if (section.name === Utility.getCppConfigPlatform()) {
                configSection = section;
                configSection.browse = configSection.browse || {};
                configSection.browse.limitSymbolsToIncludedHeaders = configSection.browse.limitSymbolsToIncludedHeaders || false;
            }
        });

        if (!configSection) {
            configSection = {
                name: Utility.getCppConfigPlatform(),
                includePath: [],
                browse: { limitSymbolsToIncludedHeaders: false },
            };
            configFileContent.configurations.push(configSection);
        }

        includes.forEach((childLibPath) => {
            childLibPath = path.resolve(path.normalize(childLibPath));
            if (configSection.includePath && configSection.includePath.length) {
                for (const existingPath of configSection.includePath) {
                    if (childLibPath === path.resolve(path.normalize(existingPath))) {
                        return;
                    }
                }
            } else {
                configSection.includePath = [];
            }
            configSection.includePath.push(childLibPath);
        });

        fs.writeFileSync(configFilePath, JSON.stringify(configFileContent, null, 4));
    }

    private showErrorToAddIncludePath() {
        vscode.window.showWarningMessage("Failed to add Include Path to c_cpp_properties.json.");
    }

    private createStatusBarItems(): void {
        let openSerialMonitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        openSerialMonitorStatusBarItem.command = "platformio.openSerialMonitor";
        openSerialMonitorStatusBarItem.text = "$(plug) Serial Monitor";
        openSerialMonitorStatusBarItem.tooltip = "Open Serial Monitor";
        openSerialMonitorStatusBarItem.show();

        let searchLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
        searchLibraryStatusBarItem.command = "platformio.searchLibrary";
        searchLibraryStatusBarItem.text = "$(search) Library";
        searchLibraryStatusBarItem.tooltip = "Search PlatformIO Library";
        searchLibraryStatusBarItem.show();

        let installLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        installLibraryStatusBarItem.command = "platformio.installLibrary";
        installLibraryStatusBarItem.text = "$(cloud-download)";
        installLibraryStatusBarItem.tooltip = "Install PlatformIO Library";
        installLibraryStatusBarItem.show();

        let openTerminalStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        openTerminalStatusBarItem.command = "platformio.openTerminal";
        openTerminalStatusBarItem.text = "$(terminal)";
        openTerminalStatusBarItem.tooltip = "Open PlatformIO Terminal";
        openTerminalStatusBarItem.show();
    }
}
