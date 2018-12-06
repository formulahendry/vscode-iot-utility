"use strict";
import * as vscode from "vscode";
import { IncludePath } from "./includePath";
import { PlatformIO } from "./platformio";

export function activate(context: vscode.ExtensionContext) {
    let platformio = new PlatformIO();
    context.subscriptions.push(platformio);
    let includePath = new IncludePath();
    context.subscriptions.push(includePath);

    context.subscriptions.push(vscode.commands.registerCommand("platformio.build", () => {
        platformio.build();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.upload", () => {
        platformio.upload();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.openSerialMonitor", () => {
        platformio.openSerialMonitor();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.buildUploadAndOpenSerialMonitor", () => {
        platformio.buildUploadAndOpenSerialMonitor();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.searchLibrary", () => {
        platformio.searchLibrary();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.installLibrary", () => {
        includePath.isEnabled = false;
        platformio.installLibrary();
        includePath.addIncludePath(true);
        includePath.isEnabled = true;
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.openTerminal", () => {
        platformio.openTerminal();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.discoverDevice", () => {
        platformio.discoverDevice();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("platformio.addIncludePath", () => {
        includePath.addIncludePath();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        platformio.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
