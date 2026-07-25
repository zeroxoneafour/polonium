import { Window, Tile } from "kwin-api";
import {
    Event,
    PostEvent,
    simplifyEvents,
    simplifyPostEvents,
    DisplaySymbol,
    Display,
} from "./event";
import { QmlApi, QmlObjects } from "../extern";
import { Workspace } from "kwin-api/qml";
import {
    WorkspaceHandler,
    WindowHandler,
    ShortcutsHandler,
    SettingsHandler,
    DBusHandler,
} from "./handlers";
import { Direction, Queue } from "../util";
import { Console } from "./console";
import { Driver } from "../driver";
import { QTimer, Qt } from "kwin-api/qt";
import { Config } from "./config";
import { TilingEngineType } from "../engine";

class Controller {
    private workspace: Workspace;
    private qmlObjects: QmlObjects;

    private eventQueue: Queue<Event> = new Queue();
    private postEventQueue: Queue<PostEvent> = new Queue();
    private eventTimer: QTimer;
    private processingEvents: boolean = false;

    private drivers: Map<DisplaySymbol, Driver> = new Map();

    private windowHandlers: Map<Window, WindowHandler> = new Map();
    private previousDisplays: Map<Window, Display[]> = new Map();
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
        const rebuildDisplays = new Map<DisplaySymbol, Display>();
        while (!queue.isEmpty) {
            const ev = queue.pop();
            if (ev === undefined) {
                break;
            }
            const displays = this.handleEvent(ev);
            for (const display of displays) {
                rebuildDisplays.set(display.toSymbol(), display);
            }
        }
        for (const [symbol, display] of rebuildDisplays) {
            if (display.desktop == undefined || display.output == undefined) {
                continue;
            }
            // dont rebuild for other activities because tiles are shared between them
            if (display.activity !== this.workspace.currentActivity) {
                continue;
            }
            console().debug("Rebuilding for display", display.toString());
            const driver = this.getDriver(display);
            const rootTile = this.workspace.rootTile(
                display.output,
                display.desktop,
            );
            if (driver != undefined && rootTile != undefined) {
                driver.buildLayout(rootTile, display);
            } else {
                console().error(
                    "no driver found for display",
                    display.toString(),
                );
                continue;
            }
        }
        const postQueue = simplifyPostEvents(this.postEventQueue);
        this.postEventQueue = new Queue<PostEvent>();
        console().debug("Handling", postQueue.size, "post event(s)");
        while (!postQueue.isEmpty) {
            const ev = postQueue.pop();
            if (ev === undefined) {
                break;
            }
            this.handlePostEvent(ev);
        }
        this.processingEvents = false;
    }

    // returns a list of desktopIdentifiers that need a rebuild
    // one event returning yes guarantees a rebuild
    // error handling - break in case statement to exit and log error message
    private handleEvent(ev: Event): Display[] {
        console().debug("handling event", ev.t);
        try {
            switch (ev.t) {
                case "newWindow":
                    return this.evNewWindow(
                        ev.window,
                        ev.forceTile,
                        ev.tile,
                        ev.direction,
                    );
                case "deleteWindow":
                    return this.evDeleteWindow(ev.window);
                case "updateWindow":
                    return this.evUpdateWindow(ev.window);
                case "tileWindow":
                    return this.evTileWindow(ev.window);
                case "untileWindow":
                    return this.evUntileWindow(ev.window);
                case "placeWindow":
                    return this.evPlaceWindow(ev.window, ev.tile, ev.direction);
                case "updateDrivers":
                    return this.updateDrivers();
                case "rebuildDisplays":
                    return this.displaysToRebuild();
                case "windowActivated":
                    return this.evWindowActivated(ev.window);
                case "updateTiles":
                    return this.evUpdateTiles(ev.display, ev.rebuild);
                case "changeEngine":
                    return this.evChangeEngine(
                        ev.display,
                        ev.engineType,
                        ev.engineSettings,
                        ev.noDBusUpdate,
                    );
                case "resetEngine":
                    return this.evResetEngine(ev.display);
                default: {
                    console().error("invalid event type", (ev as any).t);
                    return [];
                }
            }
        } catch (e) {
            console().error("event type", ev.t, "failed to execute");
            console().error("error message -", (e as Error).message);
        }
        return [];
    }

    private evNewWindow(
        window: Window,
        forceTile: boolean | undefined,
        tile: Tile | undefined,
        direction: Direction | undefined,
    ): Display[] {
        console().log("registering window", window.resourceClass);
        const handler = new WindowHandler(window, this.workspace);
        this.windowHandlers.set(window, handler);
        this.previousDisplays.set(window, [...Display.generateWindow(window)]);
        const ret = [];
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver === undefined) {
                continue;
            }
            if (
                (forceTile === undefined && handler.wantsTiled) ||
                (forceTile === true && tile === undefined)
            ) {
                driver.addWindow(window);
            } else if (
                forceTile === false ||
                (forceTile === undefined && !handler.wantsTiled)
            ) {
                driver.addWindowUntiled(window);
            } else if (forceTile === true && tile != undefined) {
                driver.placeWindow(window, tile, direction);
            }
            ret.push(display);
        }
        return ret;
    }
    private evDeleteWindow(window: Window): Display[] {
        console().log("destroying window", window.resourceClass);
        if (!this.previousDisplays.has(window)) {
            return [];
        }
        const ret = [];
        for (const display of this.previousDisplays.get(window)!) {
            this.getDriver(display)?.removeWindow(window);
            ret.push(display);
        }
        this.windowHandlers.delete(window);
        return ret;
    }
    private evUpdateWindow(window: Window): Display[] {
        console().log("updating window", window.resourceClass);
        const newDisplays = [...Display.generateWindow(window)];
        const oldDisplays = this.previousDisplays.get(window);
        if (oldDisplays === undefined) {
            return [];
        }
        let tiled = false;
        const ret = [];
        for (const oldDisplay of oldDisplays) {
            if (newDisplays.some((d) => d.equals(oldDisplay))) {
                continue;
            }
            const driver = this.getDriver(oldDisplay);
            if (driver === undefined) {
                continue;
            }
            if (driver.isWindowTiled(window)) {
                tiled = true;
            }
            driver.removeWindow(window);
            ret.push(oldDisplay);
        }
        for (const newDisplay of newDisplays) {
            if (oldDisplays.some((d) => d.equals(newDisplay))) {
                continue;
            }
            const driver = this.getDriver(newDisplay);
            if (driver === undefined) {
                continue;
            }
            if (tiled) {
                driver.addWindow(window);
            } else {
                driver.addWindowUntiled(window);
            }
            ret.push(newDisplay);
        }
        this.previousDisplays.set(window, newDisplays);
        return ret;
    }
    private evTileWindow(window: Window): Display[] {
        console().log("tiling window", window.resourceClass);
        const ret = [];
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver === undefined) {
                throw new Error(
                    "driver not found for desktop id " + display.toString(),
                );
            }
            ret.push(display);
            driver.tileWindow(window);
        }
        return ret;
    }
    private evUntileWindow(window: Window): Display[] {
        console().log("untiling window", window.resourceClass);
        const ret = [];
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver === undefined) {
                throw new Error(
                    "driver not found for desktop id " + display.toString(),
                );
            }
            ret.push(display);
            driver.untileWindow(window);
        }
        return ret;
    }
    private updateDrivers(): Display[] {
        const ret = [];
        for (const display of Display.generate(
            this.workspace.desktops,
            this.workspace.activities,
            this.workspace.screens,
        )) {
            const id = display.toSymbol();
            const driver = this.drivers.get(id);
            if (driver === undefined) {
                console().debug(
                    "adding driver for display",
                    display.toString(),
                );
                const driver = new Driver(config().defaultEngine);
                this.drivers.set(id, driver);
                this.dbusHandler?.getSettings(display);
                ret.push(display);
            }
        }
        return ret;
    }
    private displaysToRebuild(): Display[] {
        const displays = [];
        for (const display of Display.generate(
            this.workspace.desktops,
            [this.workspace.currentActivity],
            this.workspace.screens,
        )) {
            // make sure the driver exists and if it doesnt try to create it
            if (this.getDriver(display) !== undefined) {
                displays.push(display);
            }
        }
        return displays;
    }
    private evPlaceWindow(
        window: Window,
        tile: Tile,
        direction: Direction | undefined,
    ): Display[] {
        console().log(
            "placing window",
            window.resourceClass,
            "in tile at",
            tile.absoluteGeometry,
        );
        const displays = [];
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver == undefined) continue;
            if (!driver.hasTile(tile)) continue;
            driver.placeWindow(window, tile, direction);
            displays.push(display);
        }
        return displays;
    }
    private evWindowActivated(window: Window): Display[] {
        console().log("window activated", window.resourceClass);
        const displays = [];
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver == undefined) continue;
            if (driver.windowActivated(window)) {
                displays.push(display);
            }
        }
        return displays;
    }
    private evUpdateTiles(display: Display, rebuild: boolean): Display[] {
        console().log("updating tiles for display", display.toString());
        const driver = this.getDriver(display);
        if (driver === undefined) {
            return [];
        }
        // sometimes changing tiles updates engine settings so make sure to send out for dbus
        const oldSettings = JSON.stringify(driver.getEngineSettings());
        driver.updateTiles();
        const settings = driver.getEngineSettings();
        // dont need to update dialog as it should be impossible to update tiles with it open
        if (oldSettings !== JSON.stringify(settings)) {
            this.dbusHandler?.setSettings(
                display,
                driver.getEngineType(),
                settings,
            );
        }
        return rebuild ? [display] : [];
    }
    private evChangeEngine(
        display: Display,
        engineType: TilingEngineType | undefined,
        engineSettings: object | undefined,
        noDBusUpdate: boolean | undefined,
    ): Display[] {
        console().log(
            "changing engine type/settings for desktop id",
            display.toString(),
        );
        const driver = this.getDriver(display);
        if (driver === undefined) {
            throw new Error("no driver for display " + display.toString());
        }
        const oldEngine = driver.getEngineType();
        const oldSettings = JSON.stringify(driver.getEngineSettings());
        driver.changeTilingEngine(engineType, engineSettings);
        // only rebuild if something changed
        const engine = driver.getEngineType();
        const settings = driver.getEngineSettings();
        if (oldEngine === engine && oldSettings === JSON.stringify(settings)) {
            return [];
        }
        if (this.settingsHandler.isVisible()) {
            this.settingsHandler.show(display, engine, settings);
        }
        if (noDBusUpdate === undefined || !noDBusUpdate) {
            this.dbusHandler?.setSettings(display, engine, settings);
        }
        return [display];
    }
    private evResetEngine(display: Display): Display[] {
        console().log(
            "resetting to default engine settings for display",
            display.toString(),
        );
        const driver = this.getDriver(display);
        if (driver === undefined) {
            throw new Error(
                "driver undefined for display " + display.toString(),
            );
        }
        const oldEngine = driver.getEngineType();
        const oldSettings = JSON.stringify(driver.getEngineSettings());
        driver.resetTilingEngine();
        // reset dbus handler regardless of if anything changes
        this.dbusHandler?.resetSettings(display);
        const engine = driver.getEngineType();
        const settings = driver.getEngineSettings();
        if (oldEngine === engine && oldSettings === JSON.stringify(settings)) {
            return [];
        }
        if (this.settingsHandler.isVisible()) {
            this.settingsHandler.show(display, engine, settings);
        }
        return [display];
    }

    private handlePostEvent(ev: PostEvent) {
        console().debug("handling post event", ev.t);
        switch (ev.t) {
            case "setWindowProperties": {
                if (!this.windowExists(ev.window)) {
                    break;
                }
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
                return;
            }
            case "toggleSettingsMenu": {
                console().log("toggling settings menu");
                if (this.settingsHandler.isVisible()) {
                    this.settingsHandler.hide();
                    return;
                }
                const driver = this.getDriver(ev.display);
                if (driver === undefined) {
                    break;
                }
                this.settingsHandler.show(
                    ev.display,
                    driver.getEngineType(),
                    driver.getEngineSettings(),
                );
                return;
            }
            default: {
                console().error("invalid post event type", (ev as any).t);
                return;
            }
        }
        console().error("post event type", ev.t, "failed to execute");
        return;
    }

    parseDisplay(display: DisplaySymbol | string): Display | undefined {
        let str: string | undefined;
        if (typeof display === "symbol") {
            str = Symbol.keyFor(display);
        } else if (typeof display === "string") {
            str = display;
        }
        if (str === undefined) {
            return undefined;
        }
        let parsed: any;
        try {
            parsed = JSON.parse(str);
        } catch (_) {
            return undefined;
        }
        const d = this.workspace.desktops.find((d) => d.id === parsed.d);
        const a = this.workspace.activities.find((a) => a === parsed.a);
        const o = this.workspace.screens.find((s) => s.name === parsed.o);
        if (d === undefined || a === undefined || o === undefined) {
            return undefined;
        }
        return new Display(d, a, o);
    }

    // gets a driver, if it doesn't exist then it calls updateDrivers and tries to get it again.
    // if it still doesn't exist, then it returns undefined.
    private getDriver(
        display: Display | DisplaySymbol | string,
    ): Driver | undefined {
        let id: DisplaySymbol;
        if (typeof display === "string") {
            id = Symbol.for(display);
        } else if (typeof display === "symbol") {
            id = display;
        } else if (typeof display === "object") {
            id = (display as Display).toSymbol();
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

    getWindowHandler(window: Window): WindowHandler | undefined {
        return this.windowHandlers.get(window);
    }

    // sometimes the window can be destroyed before rebuild but the ref will still exist, so make sure it exists before calling stuff on it
    windowExists(window: Window | null | undefined): boolean {
        return (
            window !== null &&
            window !== undefined &&
            this.workspace.windows.includes(window)
        );
    }
    // avoid making driver instance public and get current tiling layout to enable cycling
    getEngineType(display: Display): TilingEngineType | undefined {
        return this.drivers.get(display.toSymbol())?.getEngineType();
    }

    isWindowTiled(window: Window, display?: Display): boolean | undefined {
        if (display != undefined) {
            return this.getDriver(display)?.isWindowTiled(window);
        }
        for (const display of Display.generateWindow(window)) {
            const driver = this.getDriver(display);
            if (driver?.isWindowTiled(window)) {
                return true;
            }
        }
        return false;
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
