import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Disposable, extensions, FileSystemWatcher, Uri, window, workspace } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { IIdeData } from "./IIdeData";
import { Utility } from "./utility";

export class IncludePath implements Disposable {
    private _disposables: Disposable[] = [];
    private _autoUpdateIncludesEnabled: boolean = false;
    private _debounceTimer: NodeJS.Timer;
    private _autoUpdateIncludesDisposables: Disposable[] = [];
    private _folderList: Set<string>;

    constructor() {
        workspace.onDidChangeConfiguration(() => this.configureAutoUpdateIncludes(), this, this._disposables);
        this.configureAutoUpdateIncludes();
    }

    public dispose(): void {
        this.disposeAutoUpdateIncludes();
        this._disposables.forEach((disposable: Disposable) => disposable.dispose());
    }

    public addIncludePath(silent?: boolean): void {
        try {
            let idedata = execSync("platformio run --target idedata", { encoding: "utf8", cwd: workspace.rootPath });
            let result = /{\s*"cxx_path".+}/.exec(idedata);
            if (result) {
                let idedataJson = JSON.parse(result[0]);
                this.addIncludePathToFile(idedataJson);
            } else {
                if (!silent) {
                    this.showErrorToAddIncludePath();
                }

                return;
            }

            if (!silent) {
                window.showInformationMessage("Add Include Path to c_cpp_properties.json successfully.");
            }
        } catch (ex) {
            if (!silent) {
                this.showErrorToAddIncludePath();
            }
        } finally {
            if (!silent) {
                AppInsightsClient.sendEvent("addIncludePath");
            }
        }
    }

    private configureAutoUpdateIncludes(): void {
        const cppExtension = extensions.getExtension("ms-vscode.cpptools");
        if (cppExtension) {
            const autoUpdateIncludes = workspace.getConfiguration("platformio").get<boolean>("autoUpdateIncludes");
            if (autoUpdateIncludes && !this._autoUpdateIncludesEnabled) {
                this.buildFolderList();
                const configFilePath = path.join(workspace.rootPath, ".vscode", "c_cpp_properties.json");
                if (!Utility.fileExistsSync(configFilePath)) {
                    this.addIncludePath(true);
                }

                // Watch .piolibdeps and lib folders
                const fileSystemWatcher: FileSystemWatcher = workspace.createFileSystemWatcher("**/{.piolibdeps,lib}/**");
                this._autoUpdateIncludesDisposables.push(fileSystemWatcher);
                fileSystemWatcher.onDidCreate((e: Uri) => this.fileSystemDidCreate(e), this, this._autoUpdateIncludesDisposables);

                // Watch platformio.ini file
                const iniFileWatcher: FileSystemWatcher = workspace.createFileSystemWatcher("**/platformio.ini");
                this._autoUpdateIncludesDisposables.push(iniFileWatcher);
                iniFileWatcher.onDidChange((e: Uri) => this.addIncludePath(true), this, this._autoUpdateIncludesDisposables);
                iniFileWatcher.onDidCreate((e: Uri) => this.addIncludePath(true), this, this._autoUpdateIncludesDisposables);
            }

            if (!autoUpdateIncludes && this._autoUpdateIncludesEnabled) {
                this._folderList = undefined;
                this.disposeAutoUpdateIncludes();
            }

            this._autoUpdateIncludesEnabled = autoUpdateIncludes;
        }
    }

    private fileSystemDidCreate(e: Uri): void {
        let parent = this.getParentFolder(e.path);
        if (!this._folderList.has(parent)) {
            this._folderList.add(parent);
            this.debounceChanges();
        }
    }

    private getParentFolder(path: string): string {
        let reg = path.match(/^(.+)\/([^/]+)$/);
        return reg[1];
    }

    private buildFolderList(): void {
        workspace.findFiles("**").then((value: Uri[]) => {
            this._folderList = new Set<string>();
            value.forEach((element: Uri) => this._folderList.add(this.getParentFolder(element.path)));
        });
    }

    private debounceChanges(): void {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this.foldersDidChange(), 5000);
    }

    private foldersDidChange(): void {
        this.buildFolderList();
        this.addIncludePath(true);
    }

    private disposeAutoUpdateIncludes(): void {
        this._autoUpdateIncludesDisposables.forEach((disposable: Disposable) => disposable.dispose());
        this._autoUpdateIncludesDisposables = [];
        clearTimeout(this._debounceTimer);
    }

    private addIncludePathToFile(ideData: IIdeData): void {
        const configFilePath = path.join(workspace.rootPath, ".vscode", "c_cpp_properties.json");
        const configFileDir = path.dirname(configFilePath);
        if (!Utility.directoryExistsSync(configFileDir)) {
            fs.mkdirSync(configFileDir);
        }

        let configFileContent = {
            WARNING: "This file was generated by the PlatformIO extension. Changes to this file will be lost when it is regenerated.",
            configurations: [
                {
                    name: Utility.getCppConfigPlatform(),
                    includePath: Utility.normalizePaths(ideData.includes),
                    defines: ideData.defines,
                    browse: {
                        path: Utility.normalizePaths(ideData.includes),
                        limitSymbolsToIncludedHeaders: false,
                        databaseFilename: "${workspaceRoot}/.vscode/browse.vc.db",
                    },
                },
            ],
        };

        fs.writeFileSync(configFilePath, JSON.stringify(configFileContent, null, 4));
    }

    private showErrorToAddIncludePath() {
        window.showWarningMessage("Failed to add Include Path to c_cpp_properties.json.");
    }
}
