import {
    Output,
    VirtualDesktop,
    Window,
    Activity,
    MaximizeMode,
} from "kwin-api";
import { config, console, controller as ctrl } from "..";
import { createTileEvents, createUntileEvents } from "../event";
import { Workspace } from "kwin-api/qml";
import { directionFromPoint } from "../../util";

export class WindowHandler {
    window: Window;
    previousDesktops: VirtualDesktop[];
    previousActivities: Activity[];
    previousOutput: Output;
    tiled: boolean;
    wantsTiled: boolean;
    maximized: boolean;

    workspace: Workspace;

    constructor(window: Window, workspace: Workspace) {
        this.window = window;
        this.workspace = workspace;

        this.previousDesktops = [...window.desktops];
        this.previousActivities = [...window.activities];
        this.previousOutput = window.output;

        this.tiled = this.startTiled();
        this.wantsTiled = this.tiled;
        // we dont know if it is false but it probably is
        this.maximized = false;

        this.window.desktopsChanged.connect(this.desktopsChanged.bind(this));
        this.window.activitiesChanged.connect(
            this.activitiesChanged.bind(this),
        );
        this.window.outputChanged.connect(this.outputChanged.bind(this));

        this.window.fullScreenChanged.connect(
            this.fullscreenChanged.bind(this),
        );
        this.window.minimizedChanged.connect(this.minimizedChanged.bind(this));
        this.window.maximizedAboutToChange.connect(
            this.maximizedChanged.bind(this),
        );

        this.window.interactiveMoveResizeStepped.connect(
            this.interactiveMoveResizeStepped.bind(this),
        );
        this.window.interactiveMoveResizeFinished.connect(
            this.interactiveMoveResizeFinished.bind(this),
        );
    }

    startTiled(): boolean {
        if (
            this.window.specialWindow ||
            (!config().tilePopups &&
                (this.window.popupWindow || this.window.transient))
        ) {
            return false;
        }
        if (!this.canBeTiled()) {
            return false;
        }
        if (config().ignoreWindowClasses.test(this.window.resourceClass)) {
            return false;
        }
        if (config().ignoreWindowCaptions.test(this.window.caption)) {
            return false;
        }
        return true;
    }

    outputChanged() {
        console().debug("output changed on window", this.window.resourceClass);

        const previousOutput = this.previousOutput;
        this.previousOutput = this.window.output;
        if (!this.tiled) return;

        for (const ev of createUntileEvents(
            this.window,
            this.previousDesktops,
            this.previousActivities,
            previousOutput,
        )) {
            ctrl().queueEvent(ev);
        }
        for (const ev of createTileEvents(this.window)) {
            ctrl().queueEvent(ev);
        }
    }

    desktopsChanged() {
        console().debug(
            "desktops changed on window",
            this.window.resourceClass,
        );

        console().debug(
            "new desktops -",
            this.window.desktops.map((x) => x.id),
        );

        const previousDesktops = [...this.previousDesktops];
        this.previousDesktops = [...this.window.desktops];
        if (!this.tiled) return;

        for (const ev of createUntileEvents(
            this.window,
            previousDesktops,
            this.previousActivities,
            this.previousOutput,
        )) {
            ctrl().queueEvent(ev);
        }
        for (const ev of createTileEvents(this.window)) {
            ctrl().queueEvent(ev);
        }
    }

    activitiesChanged() {
        console().debug(
            "activities changed on window",
            this.window.resourceClass,
        );

        const previousActivities = [...this.previousActivities];
        this.previousActivities = [...this.window.activities];
        if (!this.tiled) return;

        for (const ev of createUntileEvents(
            this.window,
            this.previousDesktops,
            previousActivities,
            this.previousOutput,
        )) {
            ctrl().queueEvent(ev);
        }
        for (const ev of createTileEvents(this.window)) {
            ctrl().queueEvent(ev);
        }
    }

    fullscreenChanged() {
        console().debug(
            "fullscreen changed on window",
            this.window.resourceClass,
        );
        if (!this.canBeTiled() && this.tiled) {
            this.tiled = false;
            for (const ev of createUntileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
            // toggle fullscreen because this works for whatever reason
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: false,
            });
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: true,
            });
        } else if (this.canBeTiled() && !this.tiled && this.wantsTiled) {
            this.tiled = true;
            for (const ev of createTileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
        }
    }

    minimizedChanged() {
        console().debug(
            "minimized changed on window",
            this.window.resourceClass,
        );
        if (!this.canBeTiled() && this.tiled) {
            this.tiled = false;
            for (const ev of createUntileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
        } else if (this.canBeTiled() && !this.tiled && this.wantsTiled) {
            this.tiled = true;
            for (const ev of createTileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
        }
    }
    maximizedChanged(state: MaximizeMode) {
        console().debug(
            "maximized state changed on window",
            this.window.resourceClass,
        );
        this.maximized = state !== MaximizeMode.MaximizeRestore;
        if (!this.canBeTiled() && this.tiled) {
            this.tiled = false;
            for (const ev of createUntileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
        } else if (this.canBeTiled() && !this.tiled && this.wantsTiled) {
            this.tiled = true;
            for (const ev of createTileEvents(this.window)) {
                ctrl().queueEvent(ev);
            }
        }
    }

    // use this instead of tileChanged because tileChanged does what it wants
    // use stepped instead of started as there can be some delay setting window.tile to null
    interactiveMoveResizeStepped() {
        if (!(this.tiled && this.canBeTiled() && this.window.tile == null))
            return;
        console().debug(
            "move/resize stepped (first step) on window",
            this.window.resourceClass,
        );
        this.tiled = false;
        for (const ev of createUntileEvents(this.window)) {
            ctrl().queueEvent(ev);
        }
    }

    interactiveMoveResizeFinished() {
        if (!(this.wantsTiled && this.canBeTiled() && !this.tiled)) return;
        console().debug(
            "move/resize finished on window",
            this.window.resourceClass,
        );
        const cursorPos = this.workspace.cursorPos;
        this.tiled = true;
        for (const desktop of this.window.desktops) {
            const rootTile = this.workspace.rootTile(
                this.window.output,
                desktop,
            );
            // bug where pick() returns null if there is only one tile (the root tile)
            const tile =
                rootTile.tiles.length == 0
                    ? rootTile
                    : rootTile.pick(cursorPos);
            if (tile == null) {
                ctrl().queueEvent({
                    t: "tileWindow",
                    window: this.window,
                    desktop: desktop,
                    activity: this.workspace.currentActivity,
                    output: this.window.output,
                });
            } else {
                ctrl().queueEvent({
                    t: "placeWindow",
                    window: this.window,
                    desktop: desktop,
                    activity: this.workspace.currentActivity,
                    output: this.window.output,
                    tile: tile,
                    direction: directionFromPoint(
                        tile.absoluteGeometry,
                        cursorPos,
                    ),
                });
            }
        }
        // for other activities, just tile dont place
        for (const activity of this.window.activities) {
            if (activity === this.workspace.currentActivity) continue;
            for (const ev of createTileEvents(
                this.window,
                this.window.desktops,
                [activity],
                this.window.output,
            )) {
                ctrl().queueEvent(ev);
            }
        }
    }

    canBeTiled(): boolean {
        return !(
            this.window.fullScreen ||
            this.window.minimized ||
            this.maximized
        );
    }
}
