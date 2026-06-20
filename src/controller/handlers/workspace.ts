import { Workspace } from "kwin-api/qml";
import { config, console, controller as ctrl } from "..";
import { Window } from "kwin-api";
import { Borders } from "../config";
import { createTileEvents, createUntileEvents } from "../event";
import { directionFromPoint } from "../../util";

export class WorkspaceHandler {
    private workspace: Workspace;
    // double buffer activated windows so we know which one was most recently active
    // (do this for active window insertion)
    private previousActivated: Window | null;
    private currentActivated: Window | null;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
        this.previousActivated = null;
        this.currentActivated = this.workspace.activeWindow;

        this.workspace.windowAdded.connect(this.windowAdded.bind(this));
        this.workspace.windowRemoved.connect(this.windowRemoved.bind(this));
        this.workspace.windowActivated.connect(this.windowActivated.bind(this));

        this.workspace.currentActivityChanged.connect(
            this.rebuildDesktops.bind(this),
        );

        this.workspace.screensChanged.connect(this.updateDrivers.bind(this));
        this.workspace.desktopsChanged.connect(this.updateDrivers.bind(this));
        this.workspace.activityAdded.connect(this.updateDrivers.bind(this));
        this.workspace.activityRemoved.connect(this.updateDrivers.bind(this));
        this.workspace.activitiesChanged.connect(this.updateDrivers.bind(this));
    }

    windowAdded(window: Window) {
        // this _should_ not garbage collect I think while the window exists... no ref map needed?
        // never friggin mind we need a ref map to store "tiled" state across shortcut handler as well
        const windowHandler = ctrl().createWindowHandler(window);
        if (!windowHandler.tiled) return;
        // for insert in active handling
        // checking the actual config is now deferred to the event handler through onlyIfInsertInActive
        // so that different engines can have different configurations for the option
        for (const ev of createTileEvents(window)) {
            if (
                this.previousActivated?.tile != null &&
                this.previousActivated.activities.includes(ev.activity) &&
                this.previousActivated.desktops.includes(ev.desktop) &&
                this.previousActivated.output == ev.output
            ) {
                ev.tile = this.previousActivated.tile;
                ev.direction = directionFromPoint(
                    ev.tile.absoluteGeometry,
                    this.workspace.cursorPos,
                );
            }
            ctrl().queueEvent(ev);
        }
    }

    windowRemoved(window: Window) {
        for (const ev of createUntileEvents(window)) {
            ctrl().queueEvent(ev);
        }
        ctrl().queueEvent({
            t: "removeWindow",
            window: window,
        });
    }

    rebuildDesktops() {
        // never mind we still have to do stuff
        ctrl().queueEvent({ t: "rebuildDesktops" });
    }

    updateDrivers() {
        ctrl().queueEvent({ t: "updateDrivers" });
    }

    windowActivated(window: Window | null) {
        this.previousActivated = this.currentActivated;
        this.currentActivated = window;
        const borders = config().borders;
        if (
            this.previousActivated !== null &&
            (borders === Borders.Active ||
                (borders === Borders.FloatingActive &&
                    windowIsTiled(this.previousActivated)))
        ) {
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.previousActivated,
                noBorder: true,
            });
        }
        if (window === null) {
            return;
        }
        if (
            (borders === Borders.Active ||
                borders === Borders.FloatingActive) &&
            windowIsTiled(window)
        ) {
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: window,
                noBorder: false,
            });
        }
        for (const desktop of window.desktops) {
            for (const activity of window.activities) {
                ctrl().queueEvent({
                    t: "windowActivated",
                    window: window,
                    desktop: desktop,
                    activity: activity,
                    output: window.output,
                });
            }
        }
    }
}

// undefined if the window handler is undefined (ie window was either never registered or has been destroyed)
function windowIsTiled(window: Window): boolean | undefined {
    return window.tile != null || ctrl().getWindowHandler(window)?.tiled;
}
