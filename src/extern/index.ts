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
    shortcuts: Shortcuts;
    settings: Settings;
    dbus: DBus;
}

export interface Shortcuts {
    getToggleActiveTiling(): ShortcutHandler;

    getSetEngineBTree(): ShortcutHandler;
    getSetEngineHalf(): ShortcutHandler;

    getActivateAbove(): ShortcutHandler;
    getActivateBelow(): ShortcutHandler;
    getActivateLeft(): ShortcutHandler;
    getActivateRight(): ShortcutHandler;

    getPlaceAbove(): ShortcutHandler;
    getPlaceBelow(): ShortcutHandler;
    getPlaceLeft(): ShortcutHandler;
    getPlaceRight(): ShortcutHandler;

    getResizeUp(): ShortcutHandler;
    getResizeDown(): ShortcutHandler;
    getResizeLeft(): ShortcutHandler;
    getResizeRight(): ShortcutHandler;

    getToggleSettingsMenu(): ShortcutHandler;
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
