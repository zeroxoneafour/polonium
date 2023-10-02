// controller.ts - Main controller object of the script

import * as Kwin from "extern/kwin";
import * as Qml from "extern/qml";

import Log from "util/log";
import Config from "util/config";

import { Desktop } from "engines";
import { EngineManager } from "engines/manager";

export default class Controller
{
    workspace: Kwin.Workspace;
    options: Kwin.Options;
    kwinApi: Kwin.Api;
    qmlObjects: Qml.Objects;
    
    log: Log;
    config: Config;
    
    engineManager: EngineManager;

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects)
    {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwinApi = qmlApi.api;
        this.qmlObjects = qmlObjects;
        
        this.log = new Log(this);
        this.config = new Config(this);
    }
    
    private initStaticProperties(): void
    {
        Desktop.initStatic(this);
    }
    init(): void
    {
        this.initStaticProperties();
        this.log.info("Polonium initialized!");
    }
}
