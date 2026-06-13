import { Workspace, KWin, ShortcutHandler, Qt } from "kwin-api/qml";
import { Activity, Options, Output, VirtualDesktop } from "kwin-api";
import { QTimer, Console, Signal } from "kwin-api/qt";
import { TilingEngineType } from "../engine";

export interface QmlApi {
    workspace: Workspace;
    options: Options;
    kwin: KWin;
    console: Console;
    qt: Qt;
}

export interface QmlObjects {
    root: Root;
    shortcuts: Shortcuts;
    settings: Settings;
}

export interface Root {
    createTimer(): QTimer;
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

export interface Settings {
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
