// qml.d.ts - Declarations for external QML methods

import { Workspace, Options, Api as KwinApi } from "./kwin";
import { QTimer, DBusCall } from "./qt";

export interface Api
{
    workspace: Workspace;
    options: Options;
    api: KwinApi;
}

export interface Objects
{
    root: Root;
}

export interface Root
{
    print(s: string): void;
    createTimer(): QTimer;
    createDBusCall(): DBusCall;
}
