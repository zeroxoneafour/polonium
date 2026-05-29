import { Output, Tile, VirtualDesktop, Window } from "kwin-api";
import { config, console, queueEvent } from "..";
import { Workspace } from "kwin-api/qml";
import { GRect } from "../../util/geometry";

export class WindowHandler {
    window: Window;
    previousDesktops: VirtualDesktop[];
    previousOutput: Output;
    tiled: boolean;
    wantsTiled: boolean;

    workspace: Workspace;
    
    constructor(window: Window, workspace: Workspace) {
        this.window = window;
        this.workspace = workspace;

        this.previousDesktops = [...window.desktops];
        this.previousOutput = window.output;

        this.tiled = !(
            config.ignoreWindowClasses.includes(window.resourceClass.toLowerCase())
            || window.fullScreen
            || window.specialWindow
            || window.popupWindow
        );
        this.wantsTiled = this.tiled;

        this.window.desktopsChanged.connect(this.desktopsChanged.bind(this));
        this.window.outputChanged.connect(this.outputChanged.bind(this));
        this.window.fullScreenChanged.connect(this.fullscreenChanged.bind(this));
        this.window.interactiveMoveResizeFinished.connect(this.interactiveMoveResizeFinished.bind(this));
        this.window.tileChanged.connect(this.tileChanged.bind(this));
    }

    outputChanged() {
        console().debug("output changed on window", this.window.resourceClass);

        const previousOutput = this.previousOutput;
        this.previousOutput = this.window.output;
        if (!this.tiled) return;

        queueEvent({
            t: "untileWindow",
            window: this.window,
            desktops: this.previousDesktops,
            output: previousOutput
        });
        queueEvent({
            t: "tileWindow",
            window: this.window,
            desktops: this.window.desktops,
            output: this.window.output
        });
    }

    desktopsChanged() {
        console().debug("desktops changed on window", this.window.resourceClass);
        
        const previousDesktops = [...this.previousDesktops];
        this.previousDesktops = [...this.window.desktops];
        if (!this.tiled) return;

        const desktopsToTile = [];
        const desktopsToUntile = [];
        for (const desktop of this.window.desktops) {
            if (!previousDesktops.includes(desktop)) {
                desktopsToTile.push(desktop);
            }
        }
        for (const desktop of previousDesktops) {
            if (!this.window.desktops.includes(desktop)) {
                desktopsToUntile.push(desktop);
            }
        }

        if (desktopsToUntile.length > 0) {
            queueEvent({
                t: "untileWindow",
                window: this.window,
                desktops: desktopsToUntile,
                output: this.window.output
            });
        }
        if (desktopsToTile.length > 0) {
            queueEvent({
                t: "tileWindow",
                window: this.window,
                desktops: desktopsToTile,
                output: this.window.output
            });
        }
    }

    fullscreenChanged() {
        console().debug("fullscreen changed on window", this.window.resourceClass);
        if (this.window.fullScreen && this.tiled) {
            this.tiled = false;
            queueEvent({
                t: "untileWindow",
                window: this.window,
                desktops: this.window.desktops,
                output: this.window.output
            });
            // toggle fullscreen because this works for whatever reason
            queueEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: false,
            });
            queueEvent({
                t: "setWindowProperties",
                window: this.window,
                fullscreen: true,
            });
        } else if (this.canBeTiled() && !this.tiled && this.wantsTiled) {
            this.tiled = true;
            queueEvent({
                t: "tileWindow",
                window: this.window,
                desktops: this.window.desktops,
                output: this.window.output
            });
        }
    }

    tileChanged(tile: Tile) {
        if (this.tiled && this.window.tile == null && this.canBeTiled()) {
            console().debug("tile changed on window", this.window.resourceClass);
            this.tiled = false;
            queueEvent({
                t: "untileWindow",
                window: this.window,
                desktops: this.window.desktops,
                output: this.window.output,
            });
        }
    }

    interactiveMoveResizeFinished() {
        if (this.wantsTiled && this.canBeTiled() && !this.tiled) {
            console().debug("move/resize finished on window", this.window.resourceClass);
            const cursorPos = this.workspace.cursorPos;
            this.tiled = true;
            for (const desktop of this.window.desktops) {
                const rootTile = this.workspace.rootTile(this.window.output, desktop);
                // bug where pick() returns null if there is only one tile (the root tile)
                const tile = rootTile.tiles.length == 0 ? rootTile : rootTile.pick(cursorPos);
                if (tile == null) {
                    queueEvent({
                        t: "tileWindow",
                        window: this.window,
                        desktops: [desktop],
                        output: this.window.output,
                    });
                } else {
                    queueEvent({
                        t: "placeWindow",
                        window: this.window,
                        desktop: desktop,
                        output: this.window.output,
                        tile: tile,
                        direction: new GRect(tile.absoluteGeometry).directionFromPoint(cursorPos),
                    });
                }
            }
        }
    }

    canBeTiled(): boolean {
        return !this.window.fullScreen;
    }
}