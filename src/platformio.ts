"use strict";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Disposable } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { PioTerminal } from "./pioTerminal";
import { Utility } from "./utility";

export class PlatformIO implements Disposable {
    private _pioTerminal: PioTerminal;
    private _autoUpdateIncludesEnabled: boolean = false;
    private _debounceTimer: NodeJS.Timer;
    private _autoUpdateIncludesDisposables: Disposable[] = [];
    private _disposables: Disposable[] = [];

    constructor() {
        this._pioTerminal = new PioTerminal();
        this.createStatusBarItems();
        vscode.workspace.onDidChangeConfiguration(() => this.configureAutoUpdateIncludes(), this, this._disposables);
        this.configureAutoUpdateIncludes();
    }

    public dispose(): void {
        this.disposeAutoUpdateIncludes();
        this._disposables.forEach((disposable: vscode.Disposable) => disposable.dispose());
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

    public addIncludePath(silent?: boolean): void {
        try {
            let idedata = execSync("platformio run --target idedata", { encoding: "utf8", cwd: vscode.workspace.rootPath });
            let result = /{\s*"cxx_path".+}/.exec(idedata);
            if (result) {
                let idedataJson = JSON.parse(result[0]);
                let includes = idedataJson.includes;
                this.addIncludePathToFile(includes);
            } else {
                if (!silent) {
                    this.showErrorToAddIncludePath();
                }

                return;
            }

            if (!silent) {
                vscode.window.showInformationMessage("Add Include Path to c_cpp_properties.json successfully.");
            }
        } catch (ex) {
            if (!silent) {
                this.showErrorToAddIncludePath();
            }
        } finally {
            AppInsightsClient.sendEvent("addIncludePath");
        }
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        this._pioTerminal.onDidCloseTerminal(closedTerminal);
    }

    private configureAutoUpdateIncludes(): void {
        const autoUpdateIncludes = vscode.workspace.getConfiguration("platformio").get<boolean>("autoUpdateIncludes");
        if (autoUpdateIncludes && !this._autoUpdateIncludesEnabled) {
            const fileSystemWatcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**");
            this._autoUpdateIncludesDisposables.push(fileSystemWatcher);
            fileSystemWatcher.onDidCreate((e: vscode.Uri) => this.fileSystemDidChange(e), this, this._autoUpdateIncludesDisposables);
            fileSystemWatcher.onDidDelete((e: vscode.Uri) => this.fileSystemDidChange(e), this, this._autoUpdateIncludesDisposables);
            const iniFileWatcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/platformio.ini");
            this._autoUpdateIncludesDisposables.push(iniFileWatcher);
            iniFileWatcher.onDidChange((e: vscode.Uri) => this.addIncludePath(true), this, this._autoUpdateIncludesDisposables);
            iniFileWatcher.onDidCreate((e: vscode.Uri) => this.addIncludePath(true), this, this._autoUpdateIncludesDisposables);
        }

        if (!autoUpdateIncludes && this._autoUpdateIncludesEnabled) {
            this.disposeAutoUpdateIncludes();
        }

        this._autoUpdateIncludesEnabled = autoUpdateIncludes;
    }

    private fileSystemDidChange(e: vscode.Uri) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.addIncludePath(true), 5000);
    }

    private disposeAutoUpdateIncludes(): void {
        this._autoUpdateIncludesDisposables.forEach((disposable: vscode.Disposable) => disposable.dispose());
        this._autoUpdateIncludesDisposables = [];
        clearTimeout(this._debounceTimer);
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
        let openSerialMonitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
        this._disposables.push(openSerialMonitorStatusBarItem);
        openSerialMonitorStatusBarItem.command = "platformio.openSerialMonitor";
        openSerialMonitorStatusBarItem.text = "$(plug) Serial Monitor";
        openSerialMonitorStatusBarItem.tooltip = "Open Serial Monitor";
        openSerialMonitorStatusBarItem.show();

        let searchLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4);
        this._disposables.push(searchLibraryStatusBarItem);
        searchLibraryStatusBarItem.command = "platformio.searchLibrary";
        searchLibraryStatusBarItem.text = "$(search) Library";
        searchLibraryStatusBarItem.tooltip = "Search PlatformIO Library";
        searchLibraryStatusBarItem.show();

        let installLibraryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        this._disposables.push(installLibraryStatusBarItem);
        installLibraryStatusBarItem.command = "platformio.installLibrary";
        installLibraryStatusBarItem.text = "$(cloud-download)";
        installLibraryStatusBarItem.tooltip = "Install PlatformIO Library";
        installLibraryStatusBarItem.show();

        let openTerminalStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
        this._disposables.push(openTerminalStatusBarItem);
        openTerminalStatusBarItem.command = "platformio.openTerminal";
        openTerminalStatusBarItem.text = "$(terminal)";
        openTerminalStatusBarItem.tooltip = "Open PlatformIO Terminal";
        openTerminalStatusBarItem.show();

        let buildUploadAndOpenSerialMonitorStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
        this._disposables.push(buildUploadAndOpenSerialMonitorStatusBarItem);
        buildUploadAndOpenSerialMonitorStatusBarItem.command = "platformio.buildUploadAndOpenSerialMonitor";
        buildUploadAndOpenSerialMonitorStatusBarItem.text = " $(arrow-right) ";
        buildUploadAndOpenSerialMonitorStatusBarItem.tooltip = "Build, Upload and Open Serial Monitor";
        buildUploadAndOpenSerialMonitorStatusBarItem.show();
    }
}
