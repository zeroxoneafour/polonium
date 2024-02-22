// actions/settingsdialog.ts - Actions related to signals coming from the settings dialog

import { Controller } from "../";
import { EngineConfig } from "../../engine";
import { Desktop, StringDesktop } from "../desktop";

export class SettingsDialogManager {
    private ctrl: Controller;
    constructor(ctrl: Controller) {
        this.ctrl = ctrl;
    }
    saveSettings(
        settings: EngineConfig,
        desktop: StringDesktop,
    ): void {
        this.ctrl.manager.setEngineConfig(this.ctrl.desktopFactory.createDesktopFromStrings(desktop), settings);
    }

    removeSettings(desktop: StringDesktop): void {
        const desktopObj = new Desktop(desktop);
        this.manager.setEngineConfig(desktopObj, new EngineConfig());
        this.dbusController.removeSettings(desktopObj.toString());
    }
}
