// dbuscontroller.ts - Controller for dbus interactions

import { Controller } from "./";
import { DBusCall } from "../extern/qt";
import { EngineConfig, IEngineConfig, TilingEngine } from "../engine";
import Log from "../util/log";

export class DBusController
{
    private existsCall: DBusCall;
    private existsCallback(this: DBusController)
    {
        this.dbusConnected = true;
        Log.debug("DBus connected");
    }

    private setSettingsCall: DBusCall;

    private getSettingsCall: DBusCall;
    private getSettingsCallback(this: DBusController, setEngineConfig: (cfg: IEngineConfig) => void, args: any[])
    {
        if (args[1].length == 0)
        {
            return;
        }
        let config: IEngineConfig = JSON.parse(args[1]);
        setEngineConfig(config);
    }
    private removeSettingsCall: DBusCall;

    dbusConnected: boolean = false;
    constructor(ctrl: Controller)
    {
        this.existsCall = ctrl.qmlObjects.root.createDBusCall();
        this.setSettingsCall = ctrl.qmlObjects.root.createDBusCall();
        this.getSettingsCall = ctrl.qmlObjects.root.createDBusCall();
        this.removeSettingsCall = ctrl.qmlObjects.root.createDBusCall();
        for (const service of [this.existsCall, this.setSettingsCall, this.getSettingsCall, this.removeSettingsCall])
        {
            service.service = "org.polonium.SettingSaver";
            service.path = "/saver";
            service.dbusInterface = "org.polonium.SettingSaver";
        }
        this.existsCall.method = "Exists";
        this.setSettingsCall.method = "SetSettings";
        this.getSettingsCall.method = "GetSettings";
        this.removeSettingsCall.method = "RemoveSettings";
        
        this.existsCall.finished.connect(this.existsCallback.bind(this));
        this.existsCall.call();
    }

    setSettings(desktop: string, config: IEngineConfig): void
    {
        if (!this.dbusConnected)
        {
            return;
        }
        const stringConfig = JSON.stringify(config);
        Log.debug("Setting settings over dbus for desktop", desktop, "to", stringConfig);
        this.setSettingsCall.arguments = [desktop, stringConfig];
        this.setSettingsCall.call();
    }
    
    getSettings(desktop: string, fn: (cfg: IEngineConfig) => void): void
    {
        if (!this.dbusConnected)
        {
            return;
        }
        Log.debug("Getting settings over dbus for desktop", desktop);
        this.getSettingsCall.finished.connect(this.getSettingsCallback.bind(this, fn));
        this.getSettingsCall.arguments = [desktop];
        this.getSettingsCall.call();
    }

    removeSettings(desktop: string): void
    {
        if (!this.dbusConnected)
        {
            return;
        }
        Log.debug("Removing settings over dbus for desktop", desktop);
        this.removeSettingsCall.arguments = [desktop];
        this.removeSettingsCall.call();
    }
}