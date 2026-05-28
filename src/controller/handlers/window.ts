import { Output, Tile, VirtualDesktop, Window } from "kwin-api";
import { queueEvent } from "..";
import { QRect, QTimer } from "kwin-api/qt";
import { Workspace } from "kwin-api/qml";
import { GRect } from "../../util/geometry";

const excludeClasses = [
    "krunner",
    "yakuake",
    "kded",
    "polkit",
    "plasmashell",
    "xwaylandvideobridge"
];

export class WindowHandler {
    window: Window;
    previousDesktops: VirtualDesktop[];
    previousOutput: Output;
    tiled: boolean;
    wantsTiled: boolean;
    //frameGeometryChangedTimer: QTimer;

    workspace: Workspace;
    
    constructor(window: Window, workspace: Workspace, fgcTimer: QTimer) {
        this.window = window;
        this.workspace = workspace;

        /*
        this.frameGeometryChangedTimer = fgcTimer;
        this.frameGeometryChangedTimer.interval = 50;
        this.frameGeometryChangedTimer.triggered.connect(this.frameGeometryChangedCallback.bind(this));
        */

        this.previousDesktops = [...window.desktops];
        this.previousOutput = window.output;

        this.tiled = !(
            excludeClasses.includes(window.resourceClass.toLowerCase())
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
        if (this.window.fullScreen && this.tiled) {
            this.tiled = false;
            queueEvent({
                t: "untileWindow",
                window: this.window,
                desktops: this.window.desktops,
                output: this.window.output
            });
        } else if (!this.window.fullScreen && !this.tiled && this.wantsTiled) {
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
            const cursorPos = this.workspace.cursorPos;
            this.tiled = true;
            for (const desktop of this.window.desktops) {
                const tile = this.workspace.rootTile(this.window.output, desktop).pick(cursorPos);
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