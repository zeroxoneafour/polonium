import { Activity, Output, VirtualDesktop } from "kwin-api";
import { console, controller as ctrl, desktopId } from "..";
import { TilingEngineType } from "../../engine";
import { DBus as DBusQml } from "../../extern";

interface SettingsBundle {
    engineType?: TilingEngineType;
    engineSettings?: object;
}

function settingsBundle(
    engineType: TilingEngineType,
    engineSettings: object,
): string {
    const bundle = {
        engineType: engineType,
        engineSettings: engineSettings,
    };
    return JSON.stringify(bundle);
}

export class DBusHandler {
    private dbusQml: DBusQml;

    constructor(dbusQml: DBusQml) {
        this.dbusQml = dbusQml;
        dbusQml
            .getSettings()
            .finished.connect(this.getSettingsCallback.bind(this));
    }

    getSettings(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ): void {
        console().debug("getSettings called");
        this.dbusQml.getSettings().arguments = [
            desktopId(desktop, activity, output),
        ];
        this.dbusQml.getSettings().call();
    }

    private getSettingsCallback([
        desktopIdStr,
        settingsBundleStr,
    ]: any[]): void {
        console().debug(
            "getSettings dbus callback activated -",
            desktopIdStr,
            settingsBundleStr,
        );
        try {
            const desktopId = ctrl().parseDesktopId(desktopIdStr as string);
            if (desktopId.some((x) => x === undefined)) return;
            const settingsBundle = JSON.parse(
                settingsBundleStr as string,
            ) as SettingsBundle;
            ctrl().queueEvent(
                {
                    t: "changeEngine",
                    desktop: desktopId[0]!,
                    activity: desktopId[1]!,
                    output: desktopId[2]!,
                    engineType: settingsBundle.engineType,
                    engineSettings: settingsBundle.engineSettings,
                    noDBusUpdate: true,
                },
                true,
            );
        } catch (e) {
            console().error(e);
        }
    }

    setSettings(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
        engineType: TilingEngineType,
        engineSettings: object,
    ): void {
        console().debug("setSettings called");
        this.dbusQml.setSettings().arguments = [
            desktopId(desktop, activity, output),
            settingsBundle(engineType, engineSettings),
        ];
        this.dbusQml.setSettings().call();
    }

    resetSettings(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ): void {
        console().debug("resetSettings called");
        this.dbusQml.resetSettings().arguments = [
            desktopId(desktop, activity, output),
        ];
        this.dbusQml.resetSettings().call();
    }
}
