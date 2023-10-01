// global.ts - Global definitions

import * as Qml from "extern/qml";
import * as Kwin from "extern/kwin";

export class Global
{
    static workspace: Kwin.Workspace;
    static options: Kwin.Options;
    static api: Kwin.Api;
    static qmlObjects: Qml.Objects;
    
    static init(api: Qml.Api, objects: Qml.Objects)
    {
        this.workspace = api.workspace;
        this.options = api.options;
        this.api = api.api;
        this.qmlObjects = objects;
    }
}

export const workspace = Global.workspace;
export const options = Global.options;
export const api = Global.api;
export const qmlObjects = Global.qmlObjects;
