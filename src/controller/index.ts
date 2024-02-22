// controller.ts - Main controller object of the script

import * as Kwin from "kwin-api";
import * as Qml from "../extern/qml";

import { Log } from "../util/log";
import { Config } from "../util/config";

import { DriverManager, Desktop } from "../driver";

import { Dbus } from "./actions/dbus";
import * as BasicActions from "./actions/basic";
import * as Shortcuts from "./actions/shortcuts";
import * as SettingsDialog from "./actions/settingsdialog";
import { DesktopFactory } from "./desktop";
import { WindowExtensions, WorkspaceExtensions } from "./extensions";

export class Controller {
    workspace: Kwin.QmlWorkspace;
    options: Kwin.Options;
    kwinApi: Kwin.QmlKWin;
    qmlObjects: Qml.Objects;
    
    desktopFactory: DesktopFactory;

    manager: DriverManager;
    
    logger: Log;
    config: Config;
    
    workspaceExtensions: WorkspaceExtensions;
    windowExtensions: Map<Kwin.Window, WindowExtensions> = new Map();

    get currentDesktop(): Desktop {
        return new Desktop({
            screen: this.workspace.activeScreen,
            activity: this.workspace.currentActivity,
            desktop: this.workspace.currentDesktop,
        });
    }

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects) {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwinApi = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.desktopFactory = new DesktopFactory(this.workspace);

        this.config = new Config(this.kwinApi);
        this.logger = new Log(this.config, this.qmlObjects.root);
        
        this.workspaceExtensions = new WorkspaceExtensions(this.workspace);
    }

    private bindSignals(): void {
        this.workspace.c        this.workspace.clientAdded.connect(BasicActions.clientAdded.bind(this));
lientAdded.connect(BasicActions.clientAdded.bind(this));
        this.workspace.clientRemoved.connect(
            BasicActions.clientRemoved.bind(this),
        );
        this.workspace.currentDesktopChanged.connect(
            BasicActions.currentDesktopChange.bind(this),
        );
        this.manager.hookRootTiles();
        this.workspace.numberScreensChanged.connect(this.manager.hookRootTiles);
        this.workspace.clientActivated.connect(
            BasicActions.clientActivated.bind(this),
        );

        this.qmlObjects.settings.saveSettings.connect(
            SettingsDialog.saveSettings.bind(this),
        );
        this.qmlObjects.settings.removeSettings.connect(
            SettingsDialog.removeSettings.bind(this),
        );
    }

    private bindShortcuts(): void {
        const rs = this.kwinApi.registerShortcut;
        rs(
            "PoloniumRetileWindow",
            "Polonium: Untile/Retile Window",
            "Meta+Shift+Space",
            Shortcuts.retileWindow.bind(this),
        );
        rs(
            "PoloniumOpenSettings",
            "Polonium: Open Settings Dialog",
            "Meta+|",
            Shortcuts.openSettingsDialog.bind(this),
        );

        rs(
            "PoloniumFocusLeft",
            "Polonium: Focus Left",
            "Meta+H",
            Shortcuts.focus.bind(this, Shortcuts.Direction.Left),
        );
        rs(
            "PoloniumInsertLeft",
            "Polonium: Insert Left",
            "Meta+Shift+H",
            Shortcuts.insert.bind(this, Shortcuts.Direction.Left),
        );

        rs(
            "PoloniumFocusAbove",
            "Polonium: Focus Above",
            "Meta+K",
            Shortcuts.focus.bind(this, Shortcuts.Direction.Above),
        );
        rs(
            "PoloniumInsertAbove",
            "Polonium: Insert Above",
            "Meta+Shift+K",
            Shortcuts.insert.bind(this, Shortcuts.Direction.Above),
        );

        rs(
            "PoloniumFocusBelow",
            "Polonium: Focus Below",
            "Meta+J",
            Shortcuts.focus.bind(this, Shortcuts.Direction.Below),
        );
        rs(
            "PoloniumInsertBelow",
            "Polonium: Insert Below",
            "Meta+Shift+J",
            Shortcuts.insert.bind(this, Shortcuts.Direction.Below),
        );

        rs(
            "PoloniumFocusRight",
            "Polonium: Focus Right",
            "Meta+L",
            Shortcuts.focus.bind(this, Shortcuts.Direction.Right),
        );
        rs(
            "PoloniumInsertRight",
            "Polonium: Insert Right",
            "Meta+Shift+L",
            Shortcuts.insert.bind(this, Shortcuts.Direction.Right),
        );
    }

    init(): void {
        this.initGlobals();
        Log.debug("Globals initialized");
        Log.debug("Config set to", JSON.stringify(Config));
        this.bindSignals();
        Log.debug("Signals bound");
        this.bindShortcuts();
        Log.debug("Shortcuts bound");
    }
}
