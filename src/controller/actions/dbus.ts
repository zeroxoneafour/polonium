// dbuscontroller.ts - Controller for dbus interactions

import { Controller } from "../index";
import { EngineConfig } from "../../engine";
import { Log } from "../../util/log";
import { DBusCall } from "kwin-api/qml";

export class DBusManager {
    isConnected: boolean = false;
    private logger: Log;
    private existsCall: DBusCall;
    private getSettingsCall: DBusCall;
    private setSettingsCall: DBusCall;
    private removeSettingsCall: DBusCall;
    
    constructor(ctrl: Controller) {
        this.logger = ctrl.logger;
        const dbus = ctrl.qmlObjects.dbus;
        
        this.existsCall = dbus.getExists();
        this.getSettingsCall = dbus.getGetSettings();
        this.setSettingsCall = dbus.getSetSettings();
        this.removeSettingsCall = dbus.getRemoveSettings();
        
        this.existsCall.finished.connect(this.existsCallback.bind(this));
        this.existsCall.call();
    }
    
    private existsCallback() {
        this.isConnected = true;
        this.logger.debug("DBus connected");
    }
    
    private getSettingsCallback(
        setEngineConfig: (cfg: EngineConfig) => void,
        args: any[]
    ): void {
        if (args[1].length == 0) {
            return;
        }
        let config: EngineConfig = JSON.parse(args[1]);
        setEngineConfig(config);
    }

    setSettings(desktop: string, config: EngineConfig): void {
        if (!this.isConnected) {
            return;
        }
        const stringConfig = JSON.stringify(config);
        this.logger.debug(
            "Setting settings over dbus for desktop",
            desktop,
            "to",
            stringConfig,
        );
        this.setSettingsCall.arguments = [desktop, stringConfig];
        this.setSettingsCall.call();
    }

    getSettings(desktop: string, fn: (cfg: EngineConfig) => void): void {
        if (!this.isConnected) {
            return;
        }
        this.logger.debug("Getting settings over dbus for desktop", desktop);
        this.getSettingsCall.finished.connect(
            this.getSettingsCallback.bind(this, fn),
        );
        this.getSettingsCall.arguments = [desktop];
        this.getSettingsCall.call();
    }

    removeSettings(desktop: string): void {
        if (!this.isConnected) {
            return;
        }
        this.logger.debug("Removing settings over dbus for desktop", desktop);
        this.removeSettingsCall.arguments = [desktop];
        this.removeSettingsCall.call();
    }
}
