import { Workspace } from "kwin-api/qml";
import { config, console, controller as ctrl } from "..";
import { Window } from "kwin-api";
import { Borders } from "../config";
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
        let tile,
            direction = undefined;
        if (this.previousActivated?.tile != null) {
            tile = this.previousActivated.tile;
            direction = directionFromPoint(
                tile.absoluteGeometry,
                this.workspace.cursorPos,
            );
        }
        ctrl().queueEvent({
            t: "newWindow",
            window: window,
            tile: tile,
            direction: direction,
        });
    }

    windowRemoved(window: Window) {
        ctrl().queueEvent({
            t: "deleteWindow",
            window: window,
        });
    }

    rebuildDesktops() {
        // never mind we still have to do stuff
        ctrl().queueEvent({ t: "rebuildDisplays" });
    }

    updateDrivers() {
        ctrl().queueEvent({ t: "updateDrivers" });
    }

    windowActivated(window: Window | null) {
        // eventually we should move border setting entirely into the controller/driver
        this.previousActivated = this.currentActivated;
        this.currentActivated = window;
        /*
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
        */
        if (window === null) {
            return;
        }
        /*
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
        */
        ctrl().queueEvent({
            t: "windowActivated",
            window: window,
        });
    }
}
