// qml.d.ts - Declarations for external QML methods

import {
    QmlWorkspace as Workspace,
    Options,
    QmlKWin as KwinApi,
    QTimer,
    DBusCall,
    Signal,
} from "kwin-api";
import { EngineConfig } from "../engine";
import { StringDesktop } from "../controller/desktop";

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
    setSettings(s: EngineConfig): void;
    saveSettings: Signal<(settings: EngineConfig, desktop: StringDesktop) => void>;
    removeSettings: Signal<(desktop: StringDesktop) => void>;
}

export interface Shortcuts {
    
}

export interface DBus {
    getSettings: DBusCall;
    setSettings: DBusCall;
    removeSettings: DBusCall;
    exists: DBusCall;
}