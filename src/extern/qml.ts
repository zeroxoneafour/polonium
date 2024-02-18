// qml.d.ts - Declarations for external QML methods

import {
    QmlWorkspace as Workspace,
    Options,
    QmlKWin as KwinApi,
    QTimer,
    DBusCall,
    Signal,
} from "kwin-api";
import { IEngineConfig } from "../engine";

export interface Api {
    workspace: Workspace;
    options: Options;
    kwin: KwinApi;
}

export interface Objects {
    root: Root;
    settings: Settings;
    shortcuts: Shortcuts;
    dbus: DBus;
}

export interface Root {
    printQml(s: string): void;
    createTimer(): QTimer;
}

export interface Settings {
    isVisible(): boolean;
    show(): void;
    hide(): void;
    saveAndHide(): void;
    setSettings(s: IEngineConfig): void;
    saveSettings: Signal<(settings: IEngineConfig, desktop: IDesktop) => void>;
    removeSettings: Signal<(desktop: IDesktop) => void>;
}

export interface Shortcuts {
    
}

export interface DBus {
    getSettings: DBusCall;
    setSettings: DBusCall;
    removeSettings: DBusCall;
}