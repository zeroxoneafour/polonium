import { Workspace, KWin, ShortcutHandler, DBusCall } from "kwin-api/qml";
import { Activity, Options, Output, VirtualDesktop } from "kwin-api";
import { QTimer, Console, Signal, QObject, Qt } from "kwin-api/qt";
import { TilingEngineType } from "../engine";

export interface QmlApi {
    workspace: Workspace;
    options: Options;
    kwin: KWin;
    console: Console;
    qt: Qt;
}

export interface QmlObjects {
    root: QObject;
    eventTimer: QTimer;
    shortcuts: Shortcuts;
    settings: Settings;
    dbus: DBus;
}

export interface Shortcuts {
    toggleActiveTiling(): ShortcutHandler;

    setEngineBTree(): ShortcutHandler;
    setEngineHalf(): ShortcutHandler;

    activateAbove(): ShortcutHandler;
    activateBelow(): ShortcutHandler;
    activateLeft(): ShortcutHandler;
    activateRight(): ShortcutHandler;

    placeAbove(): ShortcutHandler;
    placeBelow(): ShortcutHandler;
    placeLeft(): ShortcutHandler;
    placeRight(): ShortcutHandler;

    resizeUp(): ShortcutHandler;
    resizeDown(): ShortcutHandler;
    resizeLeft(): ShortcutHandler;
    resizeRight(): ShortcutHandler;

    toggleSettingsMenu(): ShortcutHandler;
}

export interface Settings extends QObject {
    visible: boolean;
    show(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
        engineType: TilingEngineType,
        engineSettings: object,
    ): void;
    hide(): void;
    saveSettings: Signal<
        (
            desktop: VirtualDesktop,
            activity: Activity,
            output: Output,
            engineType: TilingEngineType | undefined,
            engineSettings: object | undefined,
        ) => void
    >;
    resetSettings: Signal<
        (desktop: VirtualDesktop, activity: Activity, output: Output) => void
    >;
}

export interface DBus extends QObject {
    getSettings(): DBusCall;
    setSettings(): DBusCall;
    resetSettings(): DBusCall;
}
