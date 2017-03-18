"use strict";
import * as vscode from "vscode";
import { PlatformIO } from "./platformio";

export function activate(context: vscode.ExtensionContext) {
    let platformio = new PlatformIO();

    context.subscriptions.push(vscode.commands.registerCommand("platformio.build", () => {
        platformio.build();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.upload", () => {
        platformio.upload();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.openSerialMonitor", () => {
        platformio.openSerialMonitor();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.searchLibrary", () => {
        platformio.searchLibrary();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        platformio.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
