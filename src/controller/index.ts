import { Options, Output, VirtualDesktop, Console as QmlConsole, Window } from "kwin-api";
import Event from "./event";
import { QmlApi, QmlObjects } from "../extern";
import { Workspace, KWin } from "kwin-api/qml";
import { WorkspaceHandler, WindowHandler, ShortcutsHandler } from "./handlers";
import { Queue } from "../util/queue";
import { Console } from "./console";
import { Driver } from "../driver";
import { QTimer } from "kwin-api/qt";

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
        this.eventTimer.interval = 10;
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
        console().log("Handling", this.eventQueue.size, "events");
        while (!this.eventQueue.isEmpty) {
            this.handleEvent(this.eventQueue.pop()!);
        }
        for (const output of this.workspace.screens) {
            this.drivers.get(desktopId(output, this.workspace.currentDesktop))?.buildLayout();
        }
        this.processingEvents = false;
    }

    handleEvent(ev: Event) {
        console().log("handling event", ev.t);
        switch(ev.t) {
            case "tileWindow":
                ev.window.keepBelow = true;
                for (const desktop of ev.desktops) {
                    console().log("adding window", ev.window.resourceClass, "on desktop", desktop.name, "on output", ev.output.name);
                    this.drivers.get(desktopId(ev.output, desktop))?.addWindow(ev.window);
                }
                break;
            case "untileWindow":
                // window can be destroyed but ref is still "valid" (not null) so we have to check for that
                if (this.workspace.windows.includes(ev.window)) {
                    ev.window.keepBelow = false;
                }
                for (const desktop of ev.desktops) {
                    console().log("removing window", ev.window.resourceClass, "from desktop", desktop.name, "on output", ev.output.name);
                    this.drivers.get(desktopId(ev.output, desktop))?.removeWindow(ev.window);
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
                if (!this.drivers.has(desktopId(output, desktop))) {
                    this.drivers.set(desktopId(output, desktop), new Driver(this.workspace.rootTile(output, desktop)));
                }
            }
        }
    }
}

let controller: Controller;
let consoleObj: Console;

export function initializeController(qmlApi: QmlApi, qmlObjects: QmlObjects) {
    controller = new Controller(qmlApi, qmlObjects);
    consoleObj = new Console(qmlApi.console);
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
    const handler = new WindowHandler(window);
    controller.windowHandlers.set(window, handler);
    return handler;
}

// js can only map off of concrete types (ex. strings)
// this shouldn't be used outside of the controller file so no export
type DesktopIdentifier = string;
function desktopId(output: Output, desktop: VirtualDesktop): DesktopIdentifier {
    return `{"o":"${output.name}","d":"${desktop.id}"}`;
}