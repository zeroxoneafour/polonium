// controller.ts - Main controller object of the script

import { Options, Tile, Window } from "kwin-api";
import { Workspace, KWin } from "kwin-api/qml";
import * as Qml from "../extern/qml";

import { Log } from "../util/log";
import { Config } from "../util/config";

import { DriverManager } from "../driver";

import { DBusManager } from "./actions/dbus";
import { DesktopFactory } from "./desktop";
import { WindowExtensions, WorkspaceExtensions } from "./extensions";
import { ShortcutManager } from "./actions/shortcuts";
import { WindowHookManager } from "./actions/windowhooks";
import { SettingsDialogManager } from "./actions/settingsdialog";
import { WorkspaceActions } from "./actions/basic";
import { QTimer } from "kwin-api/qt";

export class Controller {
    workspace: Workspace;
    options: Options;
    kwinApi: KWin;
    qmlObjects: Qml.Objects;

    desktopFactory: DesktopFactory;

    driverManager: DriverManager;
    dbusManager: DBusManager;
    shortcutManager: ShortcutManager;
    windowHookManager: WindowHookManager;
    settingsDialogManager: SettingsDialogManager;
    workspaceActions: WorkspaceActions;

    logger: Log;
    config: Config;

    workspaceExtensions: WorkspaceExtensions;
    windowExtensions: Map<Window, WindowExtensions> = new Map();
    managedTiles: Set<Tile> = new Set();

    initTimer: QTimer;

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects) {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwinApi = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.desktopFactory = new DesktopFactory(this.workspace);

        this.config = new Config(this.kwinApi);
        this.logger = new Log(this.config, this.qmlObjects.root);
        this.logger.info("Polonium started!");
        if (!this.config.debug) {
            this.logger.info(
                "Polonium debug is DISABLED! Enable it and restart KWin before sending logs!",
            );
        }
        this.logger.debug("Config is", JSON.stringify(this.config));

        this.workspaceExtensions = new WorkspaceExtensions(this.workspace);

        this.dbusManager = new DBusManager(this);
        this.driverManager = new DriverManager(this);
        this.shortcutManager = new ShortcutManager(this);
        this.windowHookManager = new WindowHookManager(this);
        this.settingsDialogManager = new SettingsDialogManager(this);
        this.workspaceActions = new WorkspaceActions(this);

        // delayed init will help with some stuff
        this.initTimer = qmlObjects.root.createTimer();
        this.initTimer.interval = 1000;
        this.initTimer.triggered.connect(this.initCallback.bind(this));
        this.initTimer.repeat = false;
    }

    init(): void {
        this.initTimer.start();
    }

    private initCallback(): void {
        // hook into kwin after everything loads nicely
        this.workspaceActions.addHooks();
        this.driverManager.init();
    }
}
