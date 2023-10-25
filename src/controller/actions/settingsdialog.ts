// actions/settingsdialog.ts - Actions related to signals coming from the settings dialog

import { Controller } from "../";
import { EngineConfig, IEngineConfig } from "../../engine";
import { Desktop, IDesktop } from "../../driver";

export function saveSettings(this: Controller, settings: IEngineConfig, desktop: IDesktop)
{
    this.manager.setEngineConfig(settings, new Desktop(desktop));
}

export function removeSettings(this: Controller, desktop: IDesktop)
{
    this.manager.setEngineConfig(new EngineConfig(), new Desktop(desktop));
}
