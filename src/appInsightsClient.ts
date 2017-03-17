"use strict";
import * as vscode from "vscode";
import appInsights = require("applicationinsights");

export class AppInsightsClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        if (this._enableTelemetry) {
            this._client.trackEvent(eventName, properties);
        }
    }

    private static _client = appInsights.getClient("57f3261a-e6ea-4c31-a0e9-95d3d1138025");
    private static _enableTelemetry = vscode.workspace.getConfiguration("platformio").get<boolean>("enableTelemetry");
}
