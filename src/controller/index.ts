// controller.ts - Main controller object of the script

import * as Kwin from "../extern/kwin";
import * as Qml from "../extern/qml";

import Log from "../util/log";
import { init as initLog } from "../util/log";
import Config from "../util/config";
import { init as initConfig } from "../util/config";

import { DriverManager, Desktop } from "../driver";

import * as BasicActions from "./actions/basic";

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
    }
    
    init(): void
    {
        this.initGlobals();
        Log.debug("Globals initialized");
        this.bindSignals();
        Log.debug("Signals bound");
    }
}
