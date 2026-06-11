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

class Controller {
    workspace: Workspace;
    options: Options;
    kwin: KWin;
    qmlObjects: QmlObjects;

    eventQueue: Queue<Event> = new Queue();
    postEventQueue: Queue<PostEvent> = new Queue();
    eventTimer: QTimer;
    processingEvents: boolean = false;

    drivers: Map<DesktopIdentifier, Driver> = new Map();
    windowHandlers: Map<Window, WindowHandler> = new Map();
    workspaceHandler: WorkspaceHandler;

    constructor(qmlApi: QmlApi, qmlObjects: QmlObjects) {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwin = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.eventTimer = qmlObjects.root.createTimer();
        this.eventTimer.interval = config().rebuildDelay;
        this.eventTimer.repeat = false;
        this.eventTimer.triggered.connect(this.processEvents.bind(this));

        this.workspaceHandler = new WorkspaceHandler(this.workspace);
        new ShortcutsHandler(this.workspace, this.qmlObjects.shortcuts);
        this.updateDrivers();
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

    processEvents() {
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

    handleEvent(ev: Event) {
        console().debug("handling event", ev.t);
        switch (ev.t) {
            case "tileWindow":
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
            case "untileWindow":
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
            case "updateDrivers":
                this.updateDrivers();
                break;
            case "rebuildDesktops":
                // we rebuild them anyway after any event has been registered, this is a blank event that guarantees a rebuild
                break;
            // call untileWindow before this
            case "removeWindow":
                // sometimes this may say "destroying window undefined" but thats ok
                console().log("destroying window", ev.window.resourceClass);
                this.windowHandlers.delete(ev.window);
                break;
            case "placeWindow":
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
            case "updateTiles":
                console().log(
                    "updating tiles for desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.updateTiles();
                break;
            case "changeEngine":
                console().log(
                    "changing engine type/settings for desktop",
                    ev.desktop.name,
                    "on output",
                    ev.output.name,
                );
                this.drivers
                    .get(desktopId(ev.desktop, ev.activity, ev.output))
                    ?.changeTilingEngine(ev.engineType, ev.engineSettings);
                break;
        }
    }

    handlePostEvent(ev: PostEvent) {
        console().debug("handling post event", ev.t);
        switch (ev.t) {
            case "setWindowProperties":
                if (!windowExists(ev.window)) break;
                console().log(
                    "setting properties for window",
                    ev.window.resourceClass,
                );
                if (ev.fullscreen !== undefined)
                    ev.window.fullScreen = ev.fullscreen;
                if (ev.noBorder !== undefined) ev.window.noBorder = ev.noBorder;
        }
    }

    parseDesktopId(
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

    updateDrivers() {
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
        for (const output of this.workspace.screens) {
            for (const activity of this.workspace.activities) {
                for (const desktop of this.workspace.desktops) {
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
                        driver.refreshDriver(
                            rootTile,
                            desktop,
                            activity,
                            output,
                        );
                    }
                }
            }
        }
    }
}

let controller: Controller;
let consoleObj: Console;
let configObj: Config;
let qtObject: Qt;

export function initializeController(qmlApi: QmlApi, qmlObjects: QmlObjects) {
    configObj = new Config(qmlApi.kwin);
    consoleObj = new Console(qmlApi.console);
    qtObject = qmlApi.qt;
    console().debug("config -", JSON.stringify(config()));
    controller = new Controller(qmlApi, qmlObjects);
    console().log("controller initialized. Welcome to Polonium!");
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

// controller should exist at all points other than right after initialization
// also it creates everything that would call this, so logically it should exist(?)
export function queueEvent(ev: Event): void {
    controller.queueEvent(ev);
}
export function queuePostEvent(ev: PostEvent): void {
    controller.queuePostEvent(ev);
}

export function getWindowHandler(window: Window): WindowHandler | undefined {
    return controller.windowHandlers.get(window);
}

export function createWindowHandler(window: Window): WindowHandler {
    console().log("registering window", window.resourceClass);
    const handler = new WindowHandler(window, controller.workspace);
    controller.windowHandlers.set(window, handler);
    return handler;
}

// sometimes the window can be destroyed before rebuild but the ref will still exist, so make sure it exists before calling stuff on it
export function windowExists(window: Window): boolean {
    return controller.workspace.windows.includes(window);
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
