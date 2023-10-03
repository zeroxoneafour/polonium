// controller.ts - Main controller object of the script

import * as Kwin from "extern/kwin";
import * as Qml from "extern/qml";

import Log from "util/log";
import Config from "util/config";

import { LogCreator } from "util/log";
import { ConfigCreator } from "util/config";
import { GlobalVariables, Workspace } from "common/index";

import { Desktop } from "driver/index";
import { DriverManager } from "driver";

export default class Controller
{
    manager: DriverManager = new DriverManager();

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects)
    {
        GlobalVariables.init(qmlApi, qmlObjects);
    }
    
    private createGlobals(): void
    {
        LogCreator.init();
        ConfigCreator.init();
    }
    
    private bindSignals(): void
    {
        Workspace.
    }
    
    init(): void
    {
        this.createGlobals();
        Log.debug("Globals created");
        this.bindSignals();
        Log.debug("Signals binded");
    }
}
