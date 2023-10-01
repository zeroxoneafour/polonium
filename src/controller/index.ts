// controller.ts - Main controller object of the script

import * as Qml from "extern/qml";

import Log from "util/log";
import Config from "util/config";
import { Global } from "util/global";

export default class Controller
{    
    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects)
    {
        Global.init(qmlApi, qmlObjects);
        Log.init();
        Config.init();
        Log.debug("Created globals");
    }
    
    init(): void
    {
        Log.info("Polonium initialized");
    }
}
