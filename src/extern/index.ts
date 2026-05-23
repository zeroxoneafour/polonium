import { Workspace, KWin } from "kwin-api/qml";
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
}

export interface Root {
    createTimer(): QTimer;
}