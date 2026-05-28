import { Options, Output, VirtualDesktop, Console as QmlConsole, Window } from "kwin-api";
import { Event, eventsAreParallel } from "./event";
import { QmlApi, QmlObjects } from "../extern";
import { Workspace, KWin } from "kwin-api/qml";
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
    eventTimer: QTimer;
    processingEvents: boolean = false;

    drivers: Map<DesktopIdentifier, Driver> = new Map();
    windowHandlers: Map<Window, WindowHandler> = new Map();

    constructor(qmlApi: QmlApi, qmlObjects: QmlObjects) {
        this.workspace = qmlApi.workspace;
        this.options = qmlApi.options;
        this.kwin = qmlApi.kwin;
        this.qmlObjects = qmlObjects;

        this.eventTimer = qmlObjects.root.createTimer();
        this.eventTimer.interval = config.rebuildDelay;
        this.eventTimer.repeat = false;
        this.eventTimer.triggered.connect(this.processEvents.bind(this));

        new WorkspaceHandler(this.workspace);
        new ShortcutsHandler(this.workspace, this.qmlObjects.shortcuts);
        this.updateDrivers();
    }

    queueEvent(ev: Event) {
        // dont add events if processing because processing itself causes a lot of signals to trigger
        if (this.processingEvents) return;
        this.eventQueue.push(ev);
        this.eventTimer.start();
    }

    processEvents() {
        this.processingEvents = true;
        const queue = this.simplifyEventQueue();
        console().log("Handling", queue.size, "event(s)");
        this.eventQueue = new Queue<Event>();
        while (!queue.isEmpty) {
            this.handleEvent(queue.pop()!);
        }
        for (const output of this.workspace.screens) {
            this.drivers.get(desktopId(output, this.workspace.currentDesktop))?.buildLayout();
        }
        this.processingEvents = false;
    }

    simplifyEventQueue(): Queue<Event> {
        // ultra simple simplifier - only cut out events that directly cancel each other out
        // also simplifies duplicate events for updateTiles as this typically generates mass duplicates
        // todo in future - simplify events on a per-desktop, per-output basis
        const events = [];
        while (!this.eventQueue.isEmpty) {
            events.push(this.eventQueue.pop()!);
        }
        const eventsRet = [...events];
        const updateTilesEventSet = new Set<string>();
        for (const ev of events) {
            switch (ev.t) {
                case "tileWindow":
                    const parallelEvent = events.find(e => (e.t === "untileWindow" && eventsAreParallel(ev, e)));
                    if (parallelEvent === undefined) break;
                    eventsRet.splice(eventsRet.indexOf(parallelEvent), 1);
                    eventsRet.splice(eventsRet.indexOf(ev), 1);
                    break;
                case "updateTiles":
                    const id = desktopId(ev.output, ev.desktop);
                    if (updateTilesEventSet.has(id)) {
                        eventsRet.splice(eventsRet.indexOf(ev), 1);
                    } else {
                        updateTilesEventSet.add(id);
                    }
                default: break;
            }
        }
        const queue = new Queue<Event>();
        queue.multipush(eventsRet);
        return queue;
    }

    handleEvent(ev: Event) {
        console().log("handling event", ev.t);
        switch(ev.t) {
            case "tileWindow":
                for (const desktop of ev.desktops) {
                    console().log("adding window", ev.window.resourceClass, "on desktop", desktop.name, "on output", ev.output.name);
                    this.drivers.get(desktopId(ev.output, desktop))?.addWindow(ev.window);
                }
                break;
            case "untileWindow":
                let desktops = ev.desktops;
                let output = ev.output;
                // window can be destroyed but ref is still "valid" (not null) so we have to check for that
                if (!windowExists(ev.window)) {
                    // have to get the desktops another way if the window is destroyed
                    const handler = getWindowHandler(ev.window);
                    // if the handler is undefined then dont remove it from anything idek how this would happen
                    if (handler == undefined) break;
                    desktops = handler.previousDesktops ?? [];
                    output = handler.previousOutput;
                }
                for (const desktop of desktops) {
                    console().log("removing window", ev.window.resourceClass, "from desktop", desktop.name, "on output", output.name);
                    this.drivers.get(desktopId(output, desktop))?.removeWindow(ev.window);
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
            case "windowActivated":
                break;
            case "placeWindow":
                console().log("placing window", ev.window.resourceClass, "in tile at", ev.tile.absoluteGeometry);
                this.drivers.get(desktopId(ev.output, ev.desktop))?.placeWindow(ev.window, ev.tile, ev.direction);
                break;
            case "updateTiles":
                console().log("updating tiles for desktop", ev.desktop.name, "on output", ev.output.name);
                this.drivers.get(desktopId(ev.output, ev.desktop))?.updateTiles();
                break;
        }
    }

    parseDesktopId(id: DesktopIdentifier): [Output?, VirtualDesktop?] {
        const parsed = JSON.parse(id);
        const output = this.workspace.screens.find(s => s.name === parsed.o);
        const desktop = this.workspace.desktops.find(d => d.id === parsed.d);
        return [output, desktop];
    }

    updateDrivers() {
        for (const id of this.drivers.keys()) {
            const [output, desktop] = this.parseDesktopId(id);
            if (!output || !desktop) {
                this.drivers.delete(id);
            }
        }
        for (const output of this.workspace.screens) {
            for (const desktop of this.workspace.desktops) {
                const id = desktopId(output, desktop);
                if (!this.drivers.has(id)) {
                    const rootTile = this.workspace.rootTile(output, desktop);
                    const driver = new Driver(rootTile, desktop, output, config.defaultEngine);
                    this.drivers.set(id, driver);
                }
            }
        }
    }
}


let controller: Controller;
let consoleObj: Console;
export let config: Config;

export function initializeController(qmlApi: QmlApi, qmlObjects: QmlObjects) {
    consoleObj = new Console(qmlApi.console);
    config = new Config(qmlApi.kwin);
    controller = new Controller(qmlApi, qmlObjects);
    console().log("Controller initialized");
}

export function console(): Console {
    return consoleObj;
}

// controller should exist at all points other than right after initialization
// also it creates everything that would call this, so logically it should exist(?)
export function queueEvent(ev: Event): void {
    controller.queueEvent(ev);
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
// this shouldn't be used outside of the controller file so no export
type DesktopIdentifier = string;
function desktopId(output: Output, desktop: VirtualDesktop): DesktopIdentifier {
    return `{"o":"${output.name}","d":"${desktop.id}"}`;
}