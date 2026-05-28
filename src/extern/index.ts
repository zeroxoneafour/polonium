import { Workspace, KWin, ShortcutHandler } from "kwin-api/qml";
import { Console, Options } from "kwin-api";
import { QTimer } from "kwin-api/qt";

export interface QmlApi {
    workspace: Workspace;
    options: Options;
    kwin: KWin;
    console: Console;
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
}