// actions/clienthook.ts - Actions performed individually on or by clients (ex. tile changes)

import { MaximizeMode, Tile, Window } from "kwin-api";
import { Controller } from "../";
import { Desktop } from "../desktop";
import { GRect } from "../../util/geometry";
import { Log } from "../../util/log";
import { WindowExtensions } from "../extensions";
//import { QTimer } from "kwin-api/qt";

export class WindowHooks {
    private ctrl: Controller;
    private logger: Log;
    //private config: Config;
    private window: Window;
    private extensions: WindowExtensions;
    //private tileChangedTimer: QTimer;

    constructor(ctrl: Controller, window: Window) {
        this.ctrl = ctrl;
        this.logger = ctrl.logger;
        //this.config = ctrl.config;
        this.window = window;
        this.extensions = ctrl.windowExtensions.get(window)!;

        /*
        this.tileChangedTimer = this.ctrl.qmlObjects.root.createTimer();
        this.tileChangedTimer.triggeredOnStart = false;
        this.tileChangedTimer.repeat = false;
        this.tileChangedTimer.interval = this.ctrl.config.timerDelay;
        this.tileChangedTimer.triggered.connect(this.tileChangedCallback.bind(this));
        */

        window.desktopsChanged.connect(this.desktopChanged.bind(this));
        window.activitiesChanged.connect(this.desktopChanged.bind(this));
        window.outputChanged.connect(this.desktopChanged.bind(this));
        window.tileChanged.connect(this.tileChanged.bind(this));
        window.fullScreenChanged.connect(this.fullscreenChanged.bind(this));
        window.minimizedChanged.connect(this.minimizedChanged.bind(this));
        window.maximizedAboutToChange.connect(this.maximizedChanged.bind(this));
    }

    desktopChanged(): void {
        this.logger.debug("Desktops changed for window", this.window.resourceClass);
        const currentDesktops = Desktop.fromWindow(this.window);
        const removeDesktops = [];
        const currentDesktopStrings = currentDesktops.map((desktop) => desktop.toString());
        for (const desktop of this.extensions.previousDesktops) {
            if (!currentDesktopStrings.includes(desktop.toString())) {
                removeDesktops.push(desktop);
            }
        }
        this.ctrl.driverManager.removeWindow(this.window, removeDesktops);
        const addDesktops = [];
        const previousDesktopStrings = this.extensions.previousDesktops.map((desktop) => desktop.toString());
        for (const desktop of currentDesktops) {
            if (!previousDesktopStrings.includes(desktop.toString())) {
                addDesktops.push(desktop);
            }
        }
        this.ctrl.driverManager.addWindow(this.window, addDesktops);
        if (!this.extensions.isTiled) {
            this.ctrl.driverManager.untileWindow(this.window, addDesktops);
        }
        this.ctrl.driverManager.rebuildLayout();
    }

    /*
    tileChanged(_inputTile: Tile): void {
        // dont react to geometry changes while the layout is rebuilding
        if (this.ctrl.driverManager.buildingLayout) return;
        this.tileChangedTimer.start();
    }*/

    // have to use framegeometrychanged because kwin doesnt update on tile change anymore?????
    /*
    frameGeometryChanged(): void {
        if (this.ctrl.driverManager.buildingLayout) return;
        this.tileChangedTimer.restart();
    }
    */

    tileChanged() {
        //this.logger.debug("tileChanged hook", this.window.tile ?? "null");
        if (this.ctrl.driverManager.buildingLayout) return;
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
                "Putting window",
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
            this.window.tile == null &&
            !this.extensions.isSingleMaximized // single maximized windows are basically tiled
        ) {
            this.logger.debug(
                "Window",
                this.window.resourceClass,
                "was moved out of a tile",
            );
            this.ctrl.driverManager.removeWindow(this.window);
        }

        this.ctrl.driverManager.rebuildLayout(this.window.output);
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
            this.ctrl.driverManager.untileWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
            this.extensions.wasTiled = true;
        } else if (
            !this.window.fullScreen &&
            this.extensions.wasTiled &&
            !this.extensions.isTiled
        ) {
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
            this.ctrl.driverManager.untileWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
            this.extensions.wasTiled = true;
        } else if (
            !this.window.minimized &&
            this.extensions.wasTiled &&
            !this.extensions.isTiled
        ) {
            this.putWindowInBestTile();
        }
    }

    maximizedChanged(mode: MaximizeMode) {
        // ignore if the driver is making windows maximized
        if (this.ctrl.driverManager.buildingLayout) {
            return;
        }
        // dont interfere with single maximized windows
        if (this.extensions.isSingleMaximized) {
            return;
        }
        let maximized = mode == MaximizeMode.MaximizeFull;
        this.logger.debug(
            "Maximized on window",
            this.window.resourceClass,
            "set to",
            maximized,
        );
        // root tile applies with "maximize single windows" and should be completely discarded
        /*
        if (this.ctrl.workspace.tilingForScreen(this.window.output).rootTile == this.window.tile) {
            return;
        }
        */
        if (maximized && this.extensions.isTiled) {
            this.ctrl.driverManager.untileWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
            this.extensions.wasTiled = true;
        } else if (
            !maximized &&
            this.extensions.wasTiled &&
            !this.extensions.isTiled
        ) {
            this.putWindowInBestTile();
        }
    }
}

export class WindowHookManager {
    private ctrl: Controller;
    private logger: Log;

    constructor(ctrl: Controller) {
        this.ctrl = ctrl;
        this.logger = this.ctrl.logger;
    }

    attachWindowHooks(window: Window): void {
        const extensions = this.ctrl.windowExtensions.get(window)!;
        if (extensions.clientHooks != null) {
            return;
        }
        this.logger.debug("Window", window.resourceClass, "hooked into script");
        extensions.clientHooks = new WindowHooks(this.ctrl, window);
    }
}
