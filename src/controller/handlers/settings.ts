import { Activity, Output, VirtualDesktop } from "kwin-api";
import { Settings as SettingsQml } from "../../extern";
import { TilingEngineType } from "../../engine";
import { console, controller as ctrl } from "..";
import { Display } from "../event";

export class SettingsHandler {
    private settingsQml: SettingsQml;

    constructor(settingsQml: SettingsQml) {
        this.settingsQml = settingsQml;

        this.settingsQml.saveSettings.connect(this.saveSettings.bind(this));
        this.settingsQml.resetSettings.connect(this.resetSettings.bind(this));
    }

    show(
        display: Display,
        engineType: TilingEngineType,
        engineSettings: object,
    ): void {
        console().debug("showing settings");
        this.settingsQml.show(
            display.desktop,
            display.activity,
            display.output,
            engineType,
            engineSettings,
        );
    }

    hide(): void {
        this.settingsQml.hide();
    }

    isVisible(): boolean {
        return this.settingsQml.visible;
    }

    private saveSettings(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
        engineType: TilingEngineType | undefined,
        engineSettings: object | undefined,
    ) {
        ctrl().queueEvent({
            t: "changeEngine",
            display: new Display(desktop, activity, output),
            engineType: engineType,
            engineSettings: engineSettings,
        });
    }

    private resetSettings(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ) {
        ctrl().queueEvent({
            t: "resetEngine",
            display: new Display(desktop, activity, output),
        });
    }
}
