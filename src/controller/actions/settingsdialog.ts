// actions/settingsdialog.ts - Actions related to signals coming from the settings dialog

import { Controller } from "../";
import { EngineConfig } from "../../engine";
import { StringDesktop } from "../desktop";

export class SettingsDialogManager {
    private ctrl: Controller;
    constructor(ctrl: Controller) {
        this.ctrl = ctrl;
    }
    
    
    saveSettings(
        settings: EngineConfig,
        desktop: StringDesktop,
    ): void {
        this.ctrl.driverManager.setEngineConfig(this.ctrl.desktopFactory.createDesktopFromStrings(desktop), settings);
    }

    removeSettings(desktop: StringDesktop): void {
        const desktopObj = this.ctrl.desktopFactory.createDesktopFromStrings(desktop);
        this.ctrl.driverManager.removeEngineConfig(desktopObj);
        this.ctrl.dbusManager.removeSettings(desktopObj.toString());
    }
}
