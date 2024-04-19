// actions/clienthook.ts - Actions performed individually on or by clients (ex. tile changes)

import { MaximizeMode, Tile, Window } from "kwin-api";
import { Controller } from "../";
import { GRect } from "../../util/geometry";
import { Log } from "../../util/log";
import { WindowExtensions } from "../extensions";

export class WindowHooks {
    private ctrl: Controller;
    private logger: Log;
    private window: Window;
    private extensions: WindowExtensions;

    constructor(ctrl: Controller, window: Window) {
        this.ctrl = ctrl;
        this.logger = ctrl.logger;
        this.window = window;
        this.extensions = ctrl.windowExtensions.get(window)!;

        window.desktopsChanged.connect(this.desktopChanged.bind(this));
        window.activitiesChanged.connect(this.desktopChanged.bind(this));
        window.outputChanged.connect(this.desktopChanged.bind(this));
        window.interactiveMoveResizeStepped.connect(
            this.interactiveMoveResizeStepped.bind(this),
        );
        window.tileChanged.connect(this.tileChanged.bind(this));
        window.fullScreenChanged.connect(this.fullscreenChanged.bind(this));
        window.minimizedChanged.connect(this.minimizedChanged.bind(this));
        window.maximizedAboutToChange.connect(this.maximizedChanged.bind(this));
    }

    desktopChanged(): void {
        this.logger.debug(
            "Desktops changed for window",
            this.window.resourceClass,
        );
        const currentDesktops =
            this.ctrl.desktopFactory.createDesktopsFromWindow(this.window);
        const removeDesktops = [];
        const currentDesktopStrings = currentDesktops.map((desktop) =>
            desktop.toString(),
        );
        for (const desktop of this.extensions.previousDesktops) {
            if (!currentDesktopStrings.includes(desktop.toString())) {
                removeDesktops.push(desktop);
            }
        }
        this.ctrl.driverManager.removeWindow(this.window, removeDesktops);
        const addDesktops = [];
        const previousDesktopStrings = this.extensions.previousDesktops.map(
            (desktop) => desktop.toString(),
        );
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

    // have to use imrs and tilechanged
    // interactive mr handles moving out of tiles, tilechanged handles moving into tiles
    tileChanged(tile: Tile) {
        if (
            this.ctrl.driverManager.buildingLayout ||
            tile == null
        ) {
            return;
        }
        // client is moved into managed tile from outside
        if (
            !this.extensions.isTiled &&
            this.ctrl.managedTiles.has(tile)
        ) {
            this.logger.debug(
                "Putting window",
                this.window.resourceClass,
                "in tile",
                tile!.absoluteGeometry,
            );
            const direction = new GRect(
                tile.absoluteGeometry,
            ).directionFromPoint(this.ctrl.workspace.cursorPos);
            this.ctrl.driverManager.putWindowInTile(
                this.window,
                tile,
                direction,
            );
            this.ctrl.driverManager.rebuildLayout(this.window.output);
        }
        // client is in a non-managed tile (move it to a managed one)
        else if (!this.ctrl.managedTiles.has(tile)) {
            this.logger.debug("Window", this.window.resourceClass, "moved into an unmanaged tile");
            const center = new GRect(tile.absoluteGeometryInScreen).center;
            let newTile = this.ctrl.workspace
                .tilingForScreen(this.window.output)
                .bestTileForPosition(center.x, center.y);
            // if its null then its root tile (usually)
            if (newTile == null) {
                newTile = this.ctrl.workspace.tilingForScreen(
                    this.window.output,
                ).rootTile;
            }
            if (this.extensions.isTiled) {
                this.ctrl.driverManager.untileWindow(this.window, [
                    this.ctrl.desktopFactory.createDefaultDesktop(),
                ]);
            }
            this.ctrl.driverManager.putWindowInTile(
                this.window,
                newTile,
                new GRect(newTile.absoluteGeometryInScreen).directionFromPoint(center),
            );
            this.ctrl.driverManager.rebuildLayout(this.window.output);
        }
    }
    
    // should be fine if i just leave this here without a timer
    interactiveMoveResizeStepped() {
        if (
            this.ctrl.driverManager.buildingLayout ||
            this.ctrl.driverManager.resizingLayout ||
            !this.extensions.isTiled
        ) {
            return;
        }
        // need to use this to check if still in tile because kwin doesnt update it for us anymore
        const inOldTile =
            this.window.tile != null &&
            new GRect(this.window.tile.absoluteGeometry).contains(
                this.window.frameGeometry,
            );
        const inUnmanagedTile =
            this.window.tile != null &&
            !this.ctrl.managedTiles.has(this.window.tile);
        // client is moved out of a managed tile and into no tile
        if (
            this.extensions.isTiled &&
            !inUnmanagedTile &&
            !inOldTile &&
            !this.window.fullScreen &&
            !this.extensions.maximized &&
            !this.window.minimized
        ) {
            this.logger.debug(
                "Window",
                this.window.resourceClass,
                "was moved out of a tile",
            );
            this.ctrl.driverManager.untileWindow(this.window, [
                this.ctrl.desktopFactory.createDefaultDesktop(),
            ]);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
        }
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
            !this.extensions.isTiled &&
            !this.window.minimized &&
            !(this.extensions.maximized && this.extensions.isSingleMaximized)
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
            !this.extensions.isTiled &&
            !this.window.fullScreen &&
            !(this.extensions.maximized && this.extensions.isSingleMaximized)
        ) {
            this.putWindowInBestTile();
        }
    }

    maximizedChanged(mode: MaximizeMode) {
        const maximized = mode == MaximizeMode.MaximizeFull;
        this.extensions.maximized = maximized;
        // ignore if the driver is making windows maximized
        if (this.ctrl.driverManager.buildingLayout) {
            return;
        }
        // just dont handle maximizing for these
        if (this.extensions.isSingleMaximized) {
            return;
        }
        this.logger.debug(
            "Maximized on window",
            this.window.resourceClass,
            "set to",
            maximized,
        );
        if (
            (maximized && this.extensions.isTiled)
        ) {
            this.ctrl.driverManager.untileWindow(this.window);
            this.ctrl.driverManager.rebuildLayout(this.window.output);
            this.extensions.wasTiled = true;
        } else if (
            !maximized &&
            this.extensions.wasTiled &&
            !this.extensions.isTiled &&
            !this.window.fullScreen &&
            !this.window.minimized
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
