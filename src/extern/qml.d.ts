// qml.d.ts - Declarations for external QML methods

import { Workspace, Options, Api as KwinApi } from "./kwin";
import { QTimer, DBusCall } from "./qt";

export interface Api
{
    workspace: Workspace;
    options: Options;
    kwin: KwinApi;
}

export interface Objects
{
    root: Root;
}

export interface Root
{
    printQml(s: string): void;
    createTimer(): QTimer;
    createDBusCall(): DBusCall;
}
