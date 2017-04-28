"use strict";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";

export class Utility {
    public static fileExistsSync(filePath: string): boolean {
        try {
            return fs.statSync(filePath).isFile();
        } catch (e) {
            return false;
        }
    }

    public static directoryExistsSync(dirPath: string): boolean {
        try {
            return fs.statSync(dirPath).isDirectory();
        } catch (e) {
            return false;
        }
    }

    public static getCppConfigPlatform(): string {
        const plat = os.platform();
        if (plat === "linux") {
            return "Linux";
        } else if (plat === "darwin") {
            return "Mac";
        } else if (plat === "win32") {
            return "Win32";
        }
    }
}
