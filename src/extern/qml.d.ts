// qml.d.ts - Declarations for external QML methods

import { Workspace, Options, Api as KwinApi } from "./kwin";
import { QTimer, DBusCall, Signal } from "./qt";
import { IDesktop } from "../driver";
import { IEngineConfig } from "../engine";

export interface Api
{
    workspace: Workspace;
    options: Options;
    kwin: KwinApi;
}

export interface Objects
{
    root: Root;
    settings: Settings;
}

export interface Root
{
    printQml(s: string): void;
    createTimer(): QTimer;
    createDBusCall(): DBusCall;
}

export interface Settings
{
    isVisible(): boolean;
    show(): void;
    hide(): void;
    saveAndHide(): void;
    setSettings(s: IEngineConfig): void;
    saveSettings: Signal<(settings: IEngineConfig, desktop: IDesktop) => void>;
    removeSettings: Signal<(desktop: IDesktop) => void>;
}
