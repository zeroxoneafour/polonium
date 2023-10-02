// global.ts - Initialize "global" variables

import { Workspace, Options, Api } from "extern/kwin";
import { Objects } from "extern/qml";

import Controller from "controller";

export class GlobalVariables
{
    static workspace: Workspace;
    static options: Options;
    static kwinApi: Api;
    static qmlObjects: Objects;
    static init(ctrl: Controller): void
    {
        this.workspace = ctrl.workspace;
        this.options = ctrl.options;
        this.kwinApi = ctrl.kwinApi;
        this.qmlObjects = ctrl.qmlObjects;
    }
}

export const Workspace = GlobalVariables.workspace;
export const Options = GlobalVariables.options;
export const KwinApi = GlobalVariables.kwinApi;
export const QmlObjects = GlobalVariables.qmlObjects;