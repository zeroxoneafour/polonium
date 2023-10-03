// global.ts - Initialize "global" variables

import * as Kwin from "extern/kwin";
import { Api, Objects } from "extern/qml";

export class GlobalVariables
{
    static workspace: Kwin.Workspace;
    static options: Kwin.Options;
    static kwinApi: Kwin.Api;
    static qmlObjects: Objects;
    static init(qmlApi: Api, qmlObjects: Objects): void
    {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwinApi = qmlApi.api;
        this.qmlObjects = qmlObjects;
    }
}

export const Workspace = GlobalVariables.workspace;
export const Options = GlobalVariables.options;
export const KwinApi = GlobalVariables.kwinApi;
export const QmlObjects = GlobalVariables.qmlObjects;
