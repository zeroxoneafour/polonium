// controller.ts - Main controller object of the script

import * as Kwin from "../extern/kwin";
import * as Qml from "../extern/qml";

import Log, { init as initLog } from "../util/log";
import Config, { init as initConfig } from "../util/config";

import { DriverManager, Desktop } from "../driver";

import * as BasicActions from "./actions/basic";
import * as Shortcuts from "./actions/shortcuts";
import * as SettingsDialog from "./actions/settingsdialog";

export class Controller
{
    workspace: Kwin.Workspace;
    options: Kwin.Options;
    kwinApi: Kwin.Api;
    qmlObjects: Qml.Objects;

    manager: DriverManager = new DriverManager(this);
    
    get currentDesktop(): Desktop
    {
        return new Desktop(
            {
                screen: this.workspace.activeScreen,
                activity: this.workspace.currentActivity,
                desktop: this.workspace.currentDesktop,
            }
        );
    }

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects)
    {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwinApi = qmlApi.kwin;
        this.qmlObjects = qmlObjects;
    }
    
    private initGlobals(): void
    {
        initConfig(this);
        initLog(this);
    }
    
    private bindSignals(): void
    {
        this.workspace.clientAdded.connect(BasicActions.clientAdded.bind(this));
        this.workspace.clientRemoved.connect(BasicActions.clientRemoved.bind(this));
        this.workspace.currentDesktopChanged.connect(BasicActions.currentDesktopChange.bind(this));
        this.manager.hookRootTiles();
        this.workspace.numberScreensChanged.connect(this.manager.hookRootTiles);
        
        this.qmlObjects.settings.saveSettings.connect(SettingsDialog.saveSettings.bind(this));
        this.qmlObjects.settings.removeSettings.connect(SettingsDialog.removeSettings.bind(this));
    }
    
    private bindShortcuts(): void
    {
        const rs = this.kwinApi.registerShortcut;
        rs("PoloniumRetileWindow", "Polonium: Untile/Retile Window", "Meta+Shift+Space", Shortcuts.retileWindow.bind(this));
        rs("PoloniumOpenSettings", "Polonium: Open Settings Dialog", "Meta+|", Shortcuts.openSettingsDialog.bind(this));
    }
    
    init(): void
    {
        this.initGlobals();
        Log.debug("Globals initialized");
        Log.debug("Config set to", JSON.stringify(Config));
        this.bindSignals();
        Log.debug("Signals bound");
        this.bindShortcuts();
        Log.debug("Shortcuts bound");
    }
}
