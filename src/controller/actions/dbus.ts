// dbuscontroller.ts - Controller for dbus interactions

import { Controller } from "../index";
import { EngineConfig } from "../../engine";
import { Log } from "../../util/log";
import { DBus } from "../../extern/qml";

export class DBusManager {
    isConnected: boolean = false;
    private dbus: DBus;
    private logger: Log;
    
    constructor(ctrl: Controller) {
        this.logger = ctrl.logger;
        this.dbus = ctrl.qmlObjects.dbus;
        this.dbus.exists.finished.connect(this.existsCallback);
        this.dbus.exists.call();
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
        this.dbus.setSettings.arguments = [desktop, stringConfig];
        this.dbus.setSettings.call();
    }

    getSettings(desktop: string, fn: (cfg: EngineConfig) => void): void {
        if (!this.isConnected) {
            return;
        }
        this.logger.debug("Getting settings over dbus for desktop", desktop);
        this.dbus.getSettings.finished.connect(
            this.getSettingsCallback.bind(this, fn),
        );
        this.dbus.getSettings.arguments = [desktop];
        this.dbus.getSettings.call();
    }

    removeSettings(desktop: string): void {
        if (!this.isConnected) {
            return;
        }
        this.logger.debug("Removing settings over dbus for desktop", desktop);
        this.dbus.removeSettings.arguments = [desktop];
        this.dbus.removeSettings.call();
    }
}