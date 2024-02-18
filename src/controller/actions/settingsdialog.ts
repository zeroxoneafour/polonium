// actions/settingsdialog.ts - Actions related to signals coming from the settings dialog

import { Controller } from "../";
import { EngineConfig, IEngineConfig } from "../../engine";
import { Desktop, IDesktop } from "../../driver";

export function saveSettings(
    this: Controller,
    settings: IEngineConfig,
    desktop: IDesktop,
) {
    this.manager.setEngineConfig(new Desktop(desktop), settings);
}

export function removeSettings(this: Controller, desktop: IDesktop) {
    const desktopObj = new Desktop(desktop);
    this.manager.setEngineConfig(desktopObj, new EngineConfig());
    this.dbusController.removeSettings(desktopObj.toString());
}
