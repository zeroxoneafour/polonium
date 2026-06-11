import { Workspace, KWin, ShortcutHandler, Qt } from "kwin-api/qml";
import { Options } from "kwin-api";
import { QTimer, Console } from "kwin-api/qt";

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
}
