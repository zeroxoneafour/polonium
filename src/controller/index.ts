import { Options, Output, VirtualDesktop, Window, Activity } from "kwin-api";
import { Event, PostEvent, simplifyEvents, simplifyPostEvents } from "./event";
import { QmlApi, QmlObjects } from "../extern";
import { Workspace, KWin, Qt } from "kwin-api/qml";
import { WorkspaceHandler, WindowHandler, ShortcutsHandler } from "./handlers";
import { Queue } from "../util/queue";
import { Console } from "./console";
import { Driver } from "../driver";
import { QTimer } from "kwin-api/qt";
import { Config } from "./config";
import { SettingsHandler } from "./handlers/settings";

class Controller {
    private workspace: Workspace;
    private options: Options;
    private kwin: KWin;
    private qmlObjects: QmlObjects;

    private eventQueue: Queue<Event> = new Queue();
    private postEventQueue: Queue<PostEvent> = new Queue();
    private eventTimer: QTimer;
    private processingEvents: boolean = false;

    private drivers: Map<DesktopIdentifier, Driver> = new Map();

    private windowHandlers: Map<Window, WindowHandler> = new Map();
    private workspaceHandler: WorkspaceHandler | null = null;
    private shortcutsHandler: ShortcutsHandler | null = null;
    private settingsHandler: SettingsHandler;

    constructor(qmlApi: QmlApi, qmlObjects: QmlObjects) {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwin = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.eventTimer = qmlObjects.root.createTimer();
        this.eventTimer.interval = config().rebuildDelay;
        this.eventTimer.repeat = false;
        this.eventTimer.triggered.connect(this.processEvents.bind(this));

        this.settingsHandler = new SettingsHandler(this.qmlObjects.settings);
        this.updateDrivers();
    }

    // call this after to prevent issues with workspaceHandler before the object is officially constructed
    initHandlers() {
        this.workspaceHandler = new WorkspaceHandler(this.workspace);
        this.shortcutsHandler = new ShortcutsHandler(
            this.workspace,
            this.qmlObjects.shortcuts,
        );
    }

    queueEvent(ev: Event) {
        // dont add events if processing because processing itself causes a lot of signals to trigger
        if (this.processingEvents) return;
        this.eventQueue.push(ev);
        this.eventTimer.start();
    }

    queuePostEvent(ev: PostEvent) {
        if (this.processingEvents) return;
        this.postEventQueue.push(ev);
        this.eventTimer.start();
    }

    private processEvents() {
        this.processingEvents = true;
        const queue = simplifyEvents(this.eventQueue);
        console().debug("Handling", queue.size, "event(s)");
        const rebuild = queue.size != 0;
        while (!queue.isEmpty) {
            this.handleEvent(queue.pop()!);
        }
        if (rebuild) {
            for (const output of this.workspace.screens) {
                console().debug("Rebuilding for output", output.name);
                this.drivers
                    .get(
                        desktopId(
                            this.workspace.currentDesktop,
                            this.workspace.currentActivity,
                            output,
                        ),
                    )
                    ?.buildLayout();
            }
        }
        const postQueue = simplifyPostEvents(this.postEventQueue);
        console().debug("Handling", postQueue.size, "post event(s)");
        while (!postQueue.isEmpty) {
            this.handlePostEvent(postQueue.pop()!);
        }
        this.eventQueue = new Queue<Event>();
        this.postEventQueue = new Queue<PostEvent>();
        this.processingEvents = false;
    }

    private handleEvent(ev: Event) {
        console().debug("handling event", ev.t);
        switch (ev.t) {
            case "tileWindow": {
                console().log(
                    "adding window",
                    ev.window.resourceClass,
                    "to desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                    "and activity",
                    ev.activity,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.addWindow(ev.window);
                break;
            }
            case "untileWindow": {
                if (
                    ev.output == undefined ||
                    ev.desktop == undefined ||
                    ev.activity == undefined
                )
                    break;
                console().log(
                    "removing window",
                    ev.window.resourceClass,
                    "from desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                    "and activity",
                    ev.activity,
                );
                const driver = this.drivers.get(
                    desktopId(ev.desktop, ev.activity, ev.output),
                );
                if (driver !== undefined && driver.windowMap.has(ev.window)) {
                    driver.removeWindow(ev.window);
                }
                break;
            }
            case "updateDrivers": {
                this.updateDrivers();
                break;
            }
            case "rebuildDesktops": {
                // we rebuild them anyway after any event has been registered, this is a blank event that guarantees a rebuild
                break;
            }
            // call untileWindow before this
            case "removeWindow": {
                // sometimes this may say "destroying window undefined" but thats ok
                console().log("destroying window", ev.window.resourceClass);
                this.windowHandlers.delete(ev.window);
                break;
            }
            case "placeWindow": {
                console().log(
                    "placing window",
                    ev.window.resourceClass,
                    "in tile at",
                    ev.tile.absoluteGeometry,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.placeWindow(ev.window, ev.tile, ev.direction);
                break;
            }
            case "updateTileCount": {
                console().log(
                    "updating tile count for desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.updateTiles();
                break;
            }
            case "changeEngine": {
                console().log(
                    "changing engine type/settings for desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                );
                const driver = this.drivers.get(
                    desktopId(ev.desktop, ev.activity, ev.output),
                );
                if (driver === undefined) break;
                driver.changeTilingEngine(ev.engineType, ev.engineSettings);
                if (this.settingsHandler.isVisible()) {
                    this.showSettingsHandler(driver);
                }
                break;
            }
            case "resetEngine": {
                console().log(
                    "resetting to default engine settings for desktop",
                    ev.desktop.name,
                    "and activity",
                    ev.activity,
                    "on output",
                    ev.output.name,
                );
                const driver = this.drivers.get(
                    desktopId(ev.desktop, ev.activity, ev.output),
                );
                if (driver === undefined) break;
                driver.resetTilingEngine();
                if (this.settingsHandler.isVisible()) {
                    this.showSettingsHandler(driver);
                }
                break;
            }
        }
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
            case "updateTileSizes": {
                console().log(
                    "updating tile sizes for desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.updateTiles();
                break;
            }
            case "toggleSettingsMenu": {
                console().log("toggling settings menu");
                if (this.settingsHandler.isVisible()) {
                    this.settingsHandler.hide();
                } else {
                    this.showSettingsHandler(
                        this.drivers.get(
                            desktopId(ev.desktop, ev.activity, ev.output),
                        ),
                    );
                }
                break;
            }
        }
    }

    private parseDesktopId(
        id: DesktopIdentifier,
    ): [VirtualDesktop?, Activity?, Output?] {
        const parsed = JSON.parse(id);
        const desktop = this.workspace.desktops.find((d) => d.id === parsed.d);
        const activity = this.workspace.activities.includes(parsed.s)
            ? parsed.s
            : undefined;
        const output = this.workspace.screens.find((s) => s.name === parsed.o);
        return [desktop, activity, output];
    }

    private updateDrivers() {
        for (const id of this.drivers.keys()) {
            const [desktop, activity, output] = this.parseDesktopId(id);
            if (!desktop || !activity || !output) {
                if (config().preserveOldDrivers && this.drivers.has(id)) {
                    this.drivers.get(id)!.active = false;
                } else {
                    this.drivers.delete(id);
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
        for (const [desktop, activity, output] of allDesktops) {
            const id = desktopId(desktop, activity, output);
            const driver = this.drivers.get(id);
            const rootTile = this.workspace.rootTile(output, desktop);
            if (driver === undefined) {
                const driver = new Driver(
                    rootTile,
                    desktop,
                    activity,
                    output,
                    config().defaultEngine,
                );
                this.drivers.set(id, driver);
            } else if (!driver.active) {
                driver.active = true;
                driver.refreshDriver(rootTile, desktop, activity, output);
            }
        }
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
    controllerObj.initHandlers();
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
    return `{"o":"${output.name}","a":"${activity}","d":"${desktop.id}"}`;
}
