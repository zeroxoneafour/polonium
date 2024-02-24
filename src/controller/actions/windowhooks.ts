// actions/clienthook.ts - Actions performed individually on or by clients (ex. tile changes)

import { MaximizeMode, Window } from "kwin-api";
import { QTimer } from "kwin-api/qt";
import { Controller } from "../";
import { Desktop } from "../desktop";
import { GRect } from "../../util/geometry";
import { Log } from "../../util/log";
import { Config } from "../../util/config";
import { WindowExtensions } from "../extensions";

export class WindowHookManager {
    private ctrl: Controller;
    private logger: Log;

    constructor(ctrl: Controller) {
        this.ctrl = ctrl;
        this.logger = this.ctrl.logger;
    }

    attachWindowHooks(window: Window): void {
        const extensions = this.ctrl.windowExtensions.get(window)!;
        if (extensions.clientHooks == null) {
            return;
        }
        this.logger.debug("Window", window.resourceClass, "hooked into script");
        extensions.clientHooks = new WindowHooks(this.ctrl, window);
    }
}

export class WindowHooks {
    private ctrl: Controller;
    private logger: Log;
    private config: Config;
    private window: Window;
    private extensions: WindowExtensions;

    constructor(ctrl: Controller, window: Window) {
        this.ctrl = ctrl;
        this.logger = ctrl.logger;
        this.config = ctrl.config;
        this.window = window;
        this.extensions = ctrl.windowExtensions.get(window)!;

        window.desktopsChanged.connect(this.desktopChanged);
        window.activitiesChanged.connect(this.desktopChanged);
        window.outputChanged.connect(this.desktopChanged);
        window.tileChanged.connect(this.tileChanged);
        window.fullScreenChanged.connect(this.fullscreenChanged);
        window.minimizedChanged.connect(this.minimizedChanged);
        window.maximizedAboutToChange.connect(this.maximizedChanged);
    }

    desktopChanged(): void {
        if (!this.extensions.isTiled) {
            return;
        }
        const currentDesktops = Desktop.fromWindow(this.window);
        const removeDesktops = [];
        for (const desktop of this.extensions.previousDesktops) {
            if (!currentDesktops.includes(desktop)) {
                removeDesktops.push(desktop);
            }
        }
        this.ctrl.driverManager.removeWindow(this.window, removeDesktops);
        const addDesktops = [];
        for (const desktop of currentDesktops) {
            if (!this.extensions.previousDesktops.includes(desktop)) {
                addDesktops.push(desktop);
            }
        }
        this.ctrl.driverManager.addWindow(this.window, addDesktops);
        this.ctrl.driverManager.rebuildLayout();
    }

    tileChanged() {
        // dont react to geometry changes while the layout is rebuilding
        if (this.ctrl.driverManager.buildingLayout) return;
        // something about single window maximizing used to be here?
        // have to use timers because kwin is lazy
        const timer = this.ctrl.qmlObjects.root.createTimer();
        timer.triggeredOnStart = false;
        timer.repeat = false;
        timer.interval = this.config.timerDelay;
        timer.triggered.connect(this.tileChangedCallback.bind(this, timer));
        timer.start();
    }

    tileChangedCallback(timer: QTimer) {
        const inManagedTile =
            this.window.tile != null &&
            this.ctrl.managedTiles.has(this.window.tile);
        // client is moved into managed tile from outside
        if (
            !this.extensions.isTiled &&
            inManagedTile &&
            this.window.tile != null
        ) {
            this.logger.debug(
                "Putting client",
                this.window.resourceClass,
                "in tile",
                this.window.tile!.absoluteGeometry,
            );
            const direction = new GRect(
                this.window.tile.absoluteGeometry,
            ).directionFromPoint(this.ctrl.workspace.cursorPos);
            this.ctrl.driverManager.putWindowInTile(
                this.window,
                this.window.tile,
                direction,
            );
        }
        // client is in a non-managed tile (move it to a managed one)
        else if (!inManagedTile && this.window.tile != null) {
            const center = new GRect(this.window.frameGeometry).center;
            let tile = this.ctrl.workspace
                .tilingForScreen(this.window.output)
                .bestTileForPosition(center.x, center.y);
            // if its null then its root tile (usually)
            if (tile == null) {
                tile = this.ctrl.workspace.tilingForScreen(
                    this.window.output,
                ).rootTile;
            }
            if (this.extensions.isTiled) {
                this.ctrl.driverManager.removeWindow(this.window);
            }
            this.ctrl.driverManager.putWindowInTile(
                this.window,
                tile,
                new GRect(tile.absoluteGeometry).directionFromPoint(center),
            );
        }
        // client is moved out of a managed tile and into no tile
        else if (
            this.extensions.isTiled &&
            !inManagedTile &&
            this.window.tile == null
        ) {
            this.logger.debug(
                "Client",
                this.window.resourceClass,
                "was moved out of a tile",
            );
            this.ctrl.driverManager.removeWindow(this.window);
        }

        this.ctrl.driverManager.rebuildLayout(this.window.output);

        timer.destroy();
    }

    putWindowInBestTile(): void {
        if (this.extensions.lastTiledLocation != null) {
            // fancy and illegally long code to place tile in a similar position from when it was untiled
            let tile = this.ctrl.workspace
                .tilingForScreen(this.window.output)
                .bestTileForPosition(
                    this.extensions.lastTiledLocation.x,
                    this.extensions.lastTiledLocation.y,
                );
            // if its null then its root tile (usually)
            if (tile == null) {
                tile = this.ctrl.workspace.tilingForScreen(
                    this.window.output,
                ).rootTile;
            }
            this.ctrl.driverManager.putWindowInTile(
                this.window,
                tile,
                new GRect(tile.absoluteGeometry).directionFromPoint(
                    this.extensions.lastTiledLocation,
                ),
            );
        } else {
            this.ctrl.driverManager.addWindow(this.window);
        }
        this.ctrl.driverManager.rebuildLayout(this.window.output);
    }

    fullscreenChanged(): void {
        if (this.ctrl.driverManager.buildingLayout) {
            return;
        }
        this.logger.debug(
            "Fullscreen on client",
            this.window.resourceClass,
            "set to",
            this.window.fullScreen,
        );
        if (this.window.fullScreen && this.extensions.isTiled) {
            this.ctrl.driverManager.removeWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
        } else if (!this.window.fullScreen && !this.extensions.isTiled) {
            this.putWindowInBestTile();
        }
    }

    minimizedChanged(): void {
        // ah yes boilerplate
        this.logger.debug(
            "Minimized on client",
            this.window.resourceClass,
            "set to",
            this.window.minimized,
        );
        if (this.window.minimized && this.extensions.isTiled) {
            this.ctrl.driverManager.removeWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
        } else if (!this.window.minimized && !this.extensions.isTiled) {
            this.putWindowInBestTile();
        }
    }

    maximizedChanged(mode: MaximizeMode) {
        let maximized = mode == MaximizeMode.MaximizeFull;
        this.logger.debug(
            "Maximized on window",
            this.window.resourceClass,
            "set to",
            maximized,
        );
        // root tile applies with "maximize single windows" and should be completely discarded
        /*
        if (client.isSingleMaximized) {
            client.tile = null;
            return;
        }
        */
        if (maximized && this.extensions.isTiled) {
            this.ctrl.driverManager.removeWindow(this.window);
        } else if (!maximized && !this.extensions.isTiled) {
            this.putWindowInBestTile();
        }
    }
}
