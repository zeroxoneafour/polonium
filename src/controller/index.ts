import {
    Output,
    VirtualDesktop,
    Window,
    Activity,
    ClientAreaOption,
} from "kwin-api";
import { Event, PostEvent, simplifyEvents, simplifyPostEvents } from "./event";
import { QmlApi, QmlObjects } from "../extern";
import { Workspace } from "kwin-api/qml";
import {
    WorkspaceHandler,
    WindowHandler,
    ShortcutsHandler,
    SettingsHandler,
    DBusHandler,
} from "./handlers";
import { Queue } from "../util";
import { Console } from "./console";
import { Driver } from "../driver";
import { QTimer, Qt } from "kwin-api/qt";
import { Config } from "./config";

class Controller {
    private workspace: Workspace;
    private qmlObjects: QmlObjects;

    private eventQueue: Queue<Event> = new Queue();
    private postEventQueue: Queue<PostEvent> = new Queue();
    private eventTimer: QTimer;
    private processingEvents: boolean = false;

    private drivers: Map<DesktopIdentifier, Driver> = new Map();

    private windowHandlers: Map<Window, WindowHandler> = new Map();
    private workspaceHandler: WorkspaceHandler;
    private shortcutsHandler: ShortcutsHandler;
    private settingsHandler: SettingsHandler;
    private dbusHandler: DBusHandler | null = null;

    constructor(qmlApi: QmlApi, qmlObjects: QmlObjects) {
        this.workspace = qmlApi.workspace;
        //this.options = qmlApi.options;
        //this.kwin = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.eventTimer = this.qmlObjects.eventTimer;
        this.eventTimer.interval = config().rebuildDelay;
        this.eventTimer.repeat = false;
        this.eventTimer.triggered.connect(this.processEvents.bind(this));

        if (config().useDBusSaver) {
            this.dbusHandler = new DBusHandler(this.qmlObjects.dbus);
        }
        this.settingsHandler = new SettingsHandler(this.qmlObjects.settings);
        this.workspaceHandler = new WorkspaceHandler(this.workspace);
        this.shortcutsHandler = new ShortcutsHandler(
            this.workspace,
            this.qmlObjects.shortcuts,
        );
        this.updateDrivers();
    }

    queueEvent(ev: Event, forcePush: boolean = false) {
        // dont add events if processing because processing itself causes a lot of signals to trigger
        if (this.processingEvents && !forcePush) return;
        this.eventQueue.push(ev);
        this.eventTimer.start();
    }

    queuePostEvent(ev: PostEvent, forcePush: boolean = false) {
        if (this.processingEvents && !forcePush) return;
        this.postEventQueue.push(ev);
        this.eventTimer.start();
    }

    private processEvents() {
        this.processingEvents = true;
        const queue = simplifyEvents(this.eventQueue);
        this.eventQueue = new Queue<Event>();
        console().debug("Handling", queue.size, "event(s)");
        const rebuildDesktops = new Set<DesktopIdentifier>();
        while (!queue.isEmpty) {
            const ev = queue.pop();
            if (ev === undefined) {
                break;
            }
            const desktops = this.handleEvent(ev);
            for (const desktop of desktops) {
                rebuildDesktops.add(desktop);
            }
        }
        for (const id of rebuildDesktops) {
            const [_desktop, activity, _output] = this.parseDesktopId(id);
            // dont rebuild for other activities because tiles are shared between them
            if (activity !== this.workspace.currentActivity) {
                continue;
            }
            console().debug("Rebuilding for desktop id", id);
            if (this.drivers.has(id)) {
                this.drivers.get(id)?.buildLayout();
            } else {
                console().error("no driver found for desktop id", id);
            }
        }
        const postQueue = simplifyPostEvents(this.postEventQueue);
        this.postEventQueue = new Queue<PostEvent>();
        console().debug("Handling", postQueue.size, "post event(s)");
        while (!postQueue.isEmpty) {
            this.handlePostEvent(postQueue.pop()!);
        }
        this.processingEvents = false;
    }

    // returns a list of desktopIdentifiers that need a rebuild
    // one event returning yes guarantees a rebuild
    private handleEvent(ev: Event): DesktopIdentifier[] {
        console().debug("handling event", ev.t);
        switch (ev.t) {
            case "tileWindow": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log(
                    "adding window",
                    ev.window.resourceClass,
                    "to desktop",
                    id,
                );
                this.getDriver(id)?.addWindow(ev.window, ev.tile, ev.direction);
                return [id];
            }
            case "untileWindow": {
                if (
                    ev.output == undefined ||
                    ev.desktop == undefined ||
                    ev.activity == undefined
                )
                    break;
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log(
                    "removing window",
                    ev.window.resourceClass,
                    "from desktop",
                    id,
                );
                // this doesn't use getDriver because it's plausible that untileWindow could be called when the driver has been removed.
                // in any case if the driver didn't already exist then removing the window from a new one wouldn't change anything.
                const driver = this.drivers.get(id);
                if (driver !== undefined && driver.windowMap.has(ev.window)) {
                    driver.removeWindow(ev.window);
                }
                return [id];
            }
            case "updateDrivers": {
                return this.updateDrivers();
            }
            case "rebuildDesktops": {
                const ids = [];
                for (const desktop of this.workspace.desktops) {
                    for (const output of this.workspace.screens) {
                        const id = desktopId(
                            desktop,
                            this.workspace.currentActivity,
                            output,
                        );
                        // make sure the driver exists and if it doesnt try to create it
                        if (this.getDriver(id) !== undefined) {
                            ids.push(id);
                        }
                    }
                }
                return ids;
            }
            // call untileWindow before this
            case "removeWindow": {
                // sometimes this may say "destroying window undefined" but thats ok
                console().log("destroying window", ev.window.resourceClass);
                this.windowHandlers.delete(ev.window);
                return [];
            }
            case "placeWindow": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log(
                    "placing window",
                    ev.window.resourceClass,
                    "in tile at",
                    ev.tile.absoluteGeometry,
                );
                this.getDriver(id)?.placeWindow(
                    ev.window,
                    ev.tile,
                    ev.direction,
                );
                return [id];
            }
            case "windowActivated": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                if (this.getDriver(id)?.windowActivated(ev.window)) {
                    return [id];
                }
                return [];
            }
            case "updateTiles": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log("updating tiles for desktop", id);
                const driver = this.getDriver(id);
                if (driver === undefined) break;
                // sometimes changing tiles updates engine settings so make sure to send out for dbus
                const before = JSON.stringify(
                    driver.tilingEngine.getEngineSettings(),
                );
                driver.updateTiles();
                const after = driver.tilingEngine.getEngineSettings();
                if (before !== JSON.stringify(after)) {
                    this.dbusHandler?.setSettings(
                        ev.desktop,
                        ev.activity,
                        ev.output,
                        driver.tilingEngine.engineType,
                        after,
                    );
                }
                return ev.rebuild ? [id] : [];
            }
            case "changeEngine": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log(
                    "changing engine type/settings for desktop id",
                    id,
                );
                const driver = this.getDriver(id);
                if (driver === undefined) return [];
                const engine = driver.tilingEngine.engineType;
                const settings = JSON.stringify(
                    driver.tilingEngine.getEngineSettings(),
                );
                driver.changeTilingEngine(ev.engineType, ev.engineSettings);
                // only rebuild if something changed
                if (
                    engine === driver.tilingEngine.engineType &&
                    settings ===
                        JSON.stringify(driver.tilingEngine.getEngineSettings())
                ) {
                    return [];
                }
                if (this.settingsHandler.isVisible()) {
                    this.showSettingsHandler(driver);
                }
                if (ev.noDBusUpdate === undefined || !ev.noDBusUpdate) {
                    this.dbusHandler?.setSettings(
                        ev.desktop,
                        ev.activity,
                        ev.output,
                        driver.tilingEngine.engineType,
                        driver.tilingEngine.getEngineSettings(),
                    );
                }
                return [id];
            }
            case "resetEngine": {
                const id = desktopId(ev.desktop, ev.activity, ev.output);
                console().log(
                    "resetting to default engine settings for desktop id",
                    id,
                );
                const driver = this.getDriver(id);
                if (driver === undefined) return [];
                const engine = driver.tilingEngine.engineType;
                const settings = JSON.stringify(
                    driver.tilingEngine.getEngineSettings(),
                );
                driver.resetTilingEngine();
                // reset dbus handler regardless of if anything changes
                this.dbusHandler?.resetSettings(
                    ev.desktop,
                    ev.activity,
                    ev.output,
                );
                if (
                    engine === driver.tilingEngine.engineType &&
                    settings ===
                        JSON.stringify(driver.tilingEngine.getEngineSettings())
                ) {
                    return [];
                }
                if (this.settingsHandler.isVisible()) {
                    this.showSettingsHandler(driver);
                }
                return [id];
            }
        }
        // this should never be reached
        console().warn("event type", ev.t, "not handled");
        return [];
    }

    private handlePostEvent(ev: PostEvent) {
        console().debug("handling post event", ev.t);
        switch (ev.t) {
            case "setWindowProperties": {
                if (!this.windowExists(ev.window)) break;
                console().log(
                    "setting properties for window",
                    ev.window.resourceClass,
                );
                if (ev.fullscreen !== undefined) {
                    ev.window.fullScreen = ev.fullscreen;
                }
                if (ev.noBorder !== undefined) {
                    ev.window.noBorder = ev.noBorder;
                }
                break;
            }
            case "toggleSettingsMenu": {
                console().log("toggling settings menu");
                if (this.settingsHandler.isVisible()) {
                    this.settingsHandler.hide();
                } else {
                    this.showSettingsHandler(
                        this.getDriver(ev.desktop, ev.activity, ev.output),
                    );
                }
                break;
            }
        }
    }

    parseDesktopId(
        id: DesktopIdentifier,
    ): [VirtualDesktop?, Activity?, Output?] {
        let parsed;
        try {
            parsed = JSON.parse(id);
        } catch (_) {
            return [undefined, undefined, undefined];
        }
        const desktop = this.workspace.desktops.find((d) => d.id === parsed.d);
        const activity = this.workspace.activities.find((a) => a === parsed.a);
        const output = this.workspace.screens.find((s) => s.name === parsed.o);
        return [desktop, activity, output];
    }

    // gets a driver, if it doesn't exist then it calls updateDrivers and tries to get it again.
    // if it still doesn't exist, then it returns undefined.
    private getDriver(
        desktop: VirtualDesktop | DesktopIdentifier,
        activity?: Activity,
        output?: Output,
    ): Driver | undefined {
        let id;
        if (typeof desktop === "string") {
            id = desktop;
        } else if (activity !== undefined && output !== undefined) {
            id = desktopId(desktop, activity, output);
        } else {
            console().error("Invalid call to getDriver");
            return undefined;
        }
        let driver = this.drivers.get(id);
        if (driver !== undefined) return driver;
        console().warn(
            "driver not found for id",
            id,
            "updating drivers and trying again",
        );
        this.updateDrivers();
        driver = this.drivers.get(id);
        if (driver === undefined) {
            console().error("driver was still not found for id", id);
        }
        return driver;
    }

    // returns list of desktopIds to rebuild
    private updateDrivers(): DesktopIdentifier[] {
        for (const id of this.drivers.keys()) {
            const [desktop, activity, output] = this.parseDesktopId(id);
            if (!desktop || !activity || !output) {
                console().debug("deactivating driver", id);
                const driver = this.drivers.get(id);
                if (driver !== undefined) {
                    driver.active = false;
                }
            }
        }
        const allDesktops: [VirtualDesktop, Activity, Output][] = [];
        for (const output of this.workspace.screens) {
            for (const activity of this.workspace.activities) {
                for (const desktop of this.workspace.desktops) {
                    allDesktops.push([desktop, activity, output]);
                }
            }
        }
        const ret = [];
        for (const [desktop, activity, output] of allDesktops) {
            const id = desktopId(desktop, activity, output);
            const driver = this.drivers.get(id);
            const rootTile = this.workspace.rootTile(output, desktop);
            if (driver === undefined) {
                console().debug("adding driver", id);
                const driver = new Driver(
                    rootTile,
                    desktop,
                    activity,
                    output,
                    config().defaultEngine,
                );
                this.drivers.set(id, driver);
                this.dbusHandler?.getSettings(desktop, activity, output);
                ret.push(id);
            } else if (!driver.active) {
                console().debug("reactivating driver", id);
                driver.active = true;
                driver.refreshDriver(rootTile, desktop, activity, output);
                ret.push(id);
            }
        }
        return ret;
    }

    private showSettingsHandler(driver: Driver | undefined) {
        if (driver === undefined) return;
        const engineType = driver.tilingEngine.engineType;
        const engineSettings = driver.tilingEngine.getEngineSettings();
        this.settingsHandler.show(
            driver.desktop,
            driver.activity,
            driver.output,
            engineType,
            engineSettings,
        );
    }

    createWindowHandler(window: Window): WindowHandler {
        console().log("registering window", window.resourceClass);
        const handler = new WindowHandler(window, this.workspace);
        this.windowHandlers.set(window, handler);
        return handler;
    }

    getWindowHandler(window: Window): WindowHandler | undefined {
        return this.windowHandlers.get(window);
    }

    // sometimes the window can be destroyed before rebuild but the ref will still exist, so make sure it exists before calling stuff on it
    windowExists(window: Window): boolean {
        return this.workspace.windows.includes(window);
    }
}

let controllerObj: Controller;
let consoleObj: Console;
let configObj: Config;
let qtObject: Qt;

export function initializeController(qmlApi: QmlApi, qmlObjects: QmlObjects) {
    configObj = new Config(qmlApi.kwin);
    consoleObj = new Console(qmlApi.console);
    qtObject = qmlApi.qt;
    console().debug("config -", JSON.stringify(config()));
    controllerObj = new Controller(qmlApi, qmlObjects);
    console().log("controller initialized. Welcome to Polonium!");
}

// controller should exist at all points other than right after initialization
// also it creates everything that would call this, so logically it should exist(?)
export function controller(): Controller {
    return controllerObj;
}
export function console(): Console {
    return consoleObj;
}
export function config(): Config {
    return configObj;
}
export function qt(): Qt {
    return qtObject;
}

// js can only map off of concrete types (ex. strings)
type DesktopIdentifier = string;
export function desktopId(
    desktop: VirtualDesktop,
    activity: Activity,
    output: Output,
): DesktopIdentifier {
    return `{"d":"${desktop.id}","a":"${activity}","o":"${output.name}"}`;
}
