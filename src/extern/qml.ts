// qml.d.ts - Declarations for external QML methods

import { Options } from "kwin-api";
import { Signal, QTimer } from "kwin-api/qt";
import { Workspace, KWin, DBusCall, ShortcutHandler } from "kwin-api/qml";
import { EngineConfig } from "../engine";
import { StringDesktop } from "../controller/desktop";

export interface Api {
    workspace: Workspace;
    options: Options;
    kwin: KWin;
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
    saveSettings: Signal<
        (settings: EngineConfig, desktop: StringDesktop) => void
    >;
    removeSettings: Signal<(desktop: StringDesktop) => void>;
}

export interface Shortcuts {
    getRetileWindow(): ShortcutHandler;
    getOpenSettings(): ShortcutHandler;

    getFocusAbove(): ShortcutHandler;
    getFocusBelow(): ShortcutHandler;
    getFocusLeft(): ShortcutHandler;
    getFocusRight(): ShortcutHandler;

    getInsertAbove(): ShortcutHandler;
    getInsertBelow(): ShortcutHandler;
    getInsertLeft(): ShortcutHandler;
    getInsertRight(): ShortcutHandler;

    getResizeAbove(): ShortcutHandler;
    getResizeBelow(): ShortcutHandler;
    getResizeLeft(): ShortcutHandler;
    getResizeRight(): ShortcutHandler;
}

export interface DBus {
    getGetSettings(): DBusCall;
    getSetSettings(): DBusCall;
    getRemoveSettings(): DBusCall;
    getExists(): DBusCall;
}
