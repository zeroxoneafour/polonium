import { Workspace } from "kwin-api/qml";
import { config, console, controller as ctrl } from "..";
import { Window } from "kwin-api";
import { BorderSetting } from "../config";
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

        this.workspace.currentDesktopChanged.connect(
            this.rebuildDesktops.bind(this),
        );
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
        let desktops = [...window.desktops];
        if (
            config().insertInActive &&
            this.previousActivated?.tile != null &&
            window.desktops.includes(this.workspace.currentDesktop) &&
            window.activities.includes(this.workspace.currentActivity) &&
            window.output === this.workspace.activeScreen
        ) {
            const tile = this.previousActivated?.tile;
            ctrl().queueEvent({
                t: "placeWindow",
                window: window,
                desktop: this.workspace.currentDesktop,
                activity: this.workspace.currentActivity,
                output: this.workspace.activeScreen,
                tile: tile,
                direction: directionFromPoint(
                    tile.absoluteGeometry,
                    this.workspace.cursorPos,
                ),
            });
            desktops = desktops.filter(
                (x) => x !== this.workspace.currentDesktop,
            );
        }
        for (const ev of createTileEvents(
            window,
            desktops,
            window.activities,
            window.output,
        )) {
            ctrl().queueEvent(ev);
        }
    }

    windowRemoved(window: Window) {
        for (const ev of createUntileEvents(
            window,
            window.desktops,
            window.activities,
            window.output,
        )) {
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

    windowActivated(window: Window) {
        this.previousActivated = this.currentActivated;
        this.currentActivated = window;
        if (
            config().borders == BorderSetting.BorderActive ||
            config().borders == BorderSetting.BorderFloatingActive
        ) {
            if (windowIsTiled(window)) {
                ctrl().queuePostEvent({
                    t: "setWindowProperties",
                    window: window,
                    noBorder: false,
                });
            }
            if (
                this.previousActivated != null &&
                (windowIsTiled(this.previousActivated) ||
                    config().borders == BorderSetting.BorderActive)
            ) {
                ctrl().queuePostEvent({
                    t: "setWindowProperties",
                    window: this.previousActivated,
                    noBorder: true,
                });
            }
        }
    }
}

// undefined if the window handler is undefined (ie window was either never registered or has been destroyed)
function windowIsTiled(window: Window): boolean | undefined {
    return window.tile != null || ctrl().getWindowHandler(window)?.tiled;
}
