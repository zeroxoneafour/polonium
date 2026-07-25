import { Window, MaximizeMode, Tile } from "kwin-api";
import { config, console, controller as ctrl, qt } from "..";
import { Workspace } from "kwin-api/qml";
import { DragPolicy, DragRetilePoint } from "../config";

export class WindowHandler {
    window: Window;
    /**
     * This basically means that the window may not be tiled (even the handler knows this),
     * but it wishes to be tiled whenever possible.
     *
     * Ex. A window is fullscreened, it is not tiled but after it leaves fullscreen it wants to be tiled again.
     * Or if a window is moving and it wants to be tiled after the move is finished.
     */
    wantsTiled: boolean;
    maximized: boolean;
    wasTiledBeforeMove: boolean = false;
    previousTile: Tile | null = null;

    workspace: Workspace;

    constructor(window: Window, workspace: Workspace) {
        this.window = window;
        this.workspace = workspace;

        this.wantsTiled = this.startTiled();
        // we dont know if it is false but it probably is
        this.maximized = false;

        this.window.desktopsChanged.connect(this.updateWindow.bind(this));
        this.window.activitiesChanged.connect(this.updateWindow.bind(this));
        this.window.outputChanged.connect(this.updateWindow.bind(this));

        this.window.fullScreenChanged.connect(
            this.fullscreenChanged.bind(this),
        );
        this.window.minimizedChanged.connect(this.minimizedChanged.bind(this));
        this.window.maximizedAboutToChange.connect(
            this.maximizedChanged.bind(this),
        );

        this.window.interactiveMoveResizeStarted.connect(
            this.interactiveMoveResizeStarted.bind(this),
        );
        this.window.interactiveMoveResizeStepped.connect(
            this.interactiveMoveResizeStepped.bind(this),
        );
        this.window.interactiveMoveResizeFinished.connect(
            this.interactiveMoveResizeFinished.bind(this),
        );

        this.window.tileChanged.connect(this.tileChanged.bind(this));
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
        if (config().untileWindowClasses.test(this.window.resourceClass)) {
            return false;
        }
        if (config().untileWindowCaptions.test(this.window.caption)) {
            return false;
        }
        return true;
    }

    updateWindow() {
        console().debug(
            "updating displays for window",
            this.window.resourceClass,
        );
        ctrl().queueEvent({
            t: "updateWindow",
            window: this.window,
        });
    }

    fullscreenChanged() {
        console().debug(
            "fullscreen changed on window",
            this.window.resourceClass,
        );
        if (!this.canBeTiled() && ctrl().isWindowTiled(this.window)) {
            ctrl().queueEvent({
                t: "untileWindow",
                window: this.window,
            });
        } else if (
            this.canBeTiled() &&
            !ctrl().isWindowTiled(this.window) &&
            this.wantsTiled
        ) {
            ctrl().queueEvent({
                t: "tileWindow",
                window: this.window,
            });
        }
        if (this.window.fullScreen) {
            // toggle fullscreen because this works for whatever reason
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: false,
            });
            // add keepabove here to prevent fullscreen windows showing below widgets
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: true,
                keepAbove: true,
            });
        } else {
            ctrl().queuePostEvent({
                t: "setWindowProperties",
                window: this.window,
                keepAbove: false,
            });
        }
    }

    minimizedChanged() {
        console().debug(
            "minimized changed on window",
            this.window.resourceClass,
        );
        if (!this.canBeTiled() && ctrl().isWindowTiled(this.window)) {
            ctrl().queueEvent({
                t: "untileWindow",
                window: this.window,
            });
        } else if (
            this.canBeTiled() &&
            !ctrl().isWindowTiled(this.window) &&
            this.wantsTiled
        ) {
            ctrl().queueEvent({
                t: "tileWindow",
                window: this.window,
            });
        }
    }
    maximizedChanged(state: MaximizeMode) {
        console().debug(
            "maximized state changed on window",
            this.window.resourceClass,
        );
        this.maximized = state !== MaximizeMode.MaximizeRestore;
        if (!this.canBeTiled() && ctrl().isWindowTiled(this.window)) {
            ctrl().queueEvent({
                t: "untileWindow",
                window: this.window,
            });
        } else if (
            this.canBeTiled() &&
            !ctrl().isWindowTiled(this.window) &&
            this.wantsTiled
        ) {
            ctrl().queueEvent({
                t: "tileWindow",
                window: this.window,
            });
        }
    }

    // multiple step move resize -
    // if tiled and in a tile, then when move started, set is moving flag to true
    // then if it leaves the tile in a later step, untile it
    // after all that, if
    interactiveMoveResizeStarted() {
        this.wasTiledBeforeMove = ctrl().isWindowTiled(this.window) ?? false;
    }
    interactiveMoveResizeStepped() {
        if (
            !ctrl().isWindowTiled(this.window) ||
            !this.canBeTiled() ||
            this.window.tile != null
        ) {
            return;
        }
        // if the policy is never retile then untile regardless of previous tile status
        if (
            !this.wasTiledBeforeMove &&
            config().windowDragPolicy !== DragPolicy.Never
        ) {
            return;
        }
        console().debug("move started on window", this.window.resourceClass);
        if (config().windowDragPolicy == DragPolicy.Never) {
            this.wantsTiled = false;
        }
        ctrl().queueEvent({
            t: "untileWindow",
            window: this.window,
        });
    }
    interactiveMoveResizeFinished() {
        if (
            !this.wantsTiled ||
            !this.canBeTiled() ||
            ctrl().isWindowTiled(this.window)
        ) {
            return;
        }
        if (
            !this.wasTiledBeforeMove &&
            config().windowDragPolicy == DragPolicy.Tiled
        ) {
            return;
        }
        console().debug("move finished on window", this.window.resourceClass);
        let insertionPoint;
        switch (config().dragRetilePoint) {
            case DragRetilePoint.Mouse:
                insertionPoint = this.workspace.cursorPos;
                break;
            case DragRetilePoint.Center:
                insertionPoint = qt().point(
                    this.window.frameGeometry.x +
                        this.window.frameGeometry.width / 2,
                    this.window.frameGeometry.y +
                        this.window.frameGeometry.height / 2,
                );
                break;
            case DragRetilePoint.Top:
                insertionPoint = qt().point(
                    this.window.frameGeometry.x +
                        this.window.frameGeometry.width / 2,
                    this.window.frameGeometry.y,
                );
                break;
            default:
                insertionPoint = this.workspace.cursorPos;
                break;
        }
        ctrl().queueEvent({
            t: "placeWindowPoint",
            window: this.window,
            point: insertionPoint,
        });
    }

    // this only tracks manual insertion into a tile
    tileChanged(tile: Tile) {
        if (this.previousTile == null && tile != null) {
            this.wantsTiled = true;
            ctrl().queueEvent({
                t: "placeWindow",
                window: this.window,
                tile: tile,
            });
        }
        this.previousTile = tile;
    }

    canBeTiled(): boolean {
        return !(
            this.window.fullScreen ||
            this.window.minimized ||
            this.maximized
        );
    }
}
