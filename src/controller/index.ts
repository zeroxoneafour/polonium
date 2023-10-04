// controller.ts - Main controller object of the script

import * as Kwin from "../extern/kwin";
import * as Qml from "../extern/qml";

import Log from "../util/log";
import Config from "../util/config";

import { GlobalVariables, Workspace } from "../common";
import { DriverManager } from "../driver";

import * as BasicActions from "./actions/basic";

export default class Controller
{
    manager: DriverManager = new DriverManager();

    constructor(qmlApi: Qml.Api, qmlObjects: Qml.Objects)
    {
        GlobalVariables.init(qmlApi, qmlObjects);
    }
    
    private bindSignals(): void
    {
        Workspace.clientAdded.connect(BasicActions.clientAdded.bind(this));
        Workspace.clientRemoved.connect(BasicActions.clientRemoved.bind(this));
    }
    
    init(): void
    {
        this.bindSignals();
        Log.debug("Signals binded");
    }
}
