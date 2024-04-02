// driver/driver.ts - Mapping from engines to Kwin API

import {
    TilingEngine,
    Tile,
    Client,
    EngineCapability,
    EngineType,
    EngineConfig,
    TilingEngineFactory,
} from "../engine";
import { Direction } from "../util/geometry";
import { GSize, GPoint, DirectionTools } from "../util/geometry";
import { InsertionPoint } from "../util/config";
import * as Kwin from "kwin-api";
import BiMap from "mnemonist/bi-map";
import Queue from "mnemonist/queue";
import { Log } from "../util/log";
import { Config } from "../util/config";
import { Controller } from "../controller";

export class TilingDriver {
    engine: TilingEngine;
    engineType: EngineType;

    private logger: Log;
    private config: Config;
    private ctrl: Controller;
    private engineFactory: TilingEngineFactory;

    tiles: BiMap<Kwin.Tile, Tile> = new BiMap();
    clients: BiMap<Kwin.Window, Client> = new BiMap();
    // windows that have no associated tile but are still in an engine go here
    untiledWindows: Kwin.Window[] = [];

    get engineConfig(): EngineConfig {
        return {
            engineType: this.engineType,
            insertionPoint: this.engine.config.insertionPoint,
            rotateLayout: this.engine.config.rotateLayout,
            engineSettings: this.engine.engineSettings,
        };
    }

    set engineConfig(config: EngineConfig) {
        if (config.engineType != this.engineType) {
            this.switchEngine(
                this.engineFactory.newEngine(config),
                config.engineType,
            );
        }
        this.engine.config.insertionPoint = config.insertionPoint;
        this.engine.config.rotateLayout = config.rotateLayout;
        // if it needs to be reset, enginesettings will be an empty object
        if (config.engineSettings != undefined) {
            this.engine.engineSettings = config.engineSettings;
        }
        try {
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    constructor(
        engine: TilingEngine,
        engineType: EngineType,
        ctrl: Controller,
        engineFactory: TilingEngineFactory,
    ) {
        this.engine = engine;
        this.engineType = engineType;
        this.ctrl = ctrl;
        this.engineFactory = engineFactory;
        this.logger = ctrl.logger;
        this.config = ctrl.config;
    }

    private switchEngine(engine: TilingEngine, engineType: EngineType): void {
        this.engine = engine;
        this.engineType = engineType;
        try {
            for (const window of this.clients.keys()) {
                if (!this.untiledWindows.includes(window)) {
                    // if untiled by default then dont try to tile windows when switching
                    if (
                        this.engine.engineCapability &
                        EngineCapability.UntiledByDefault
                    ) {
                        this.untiledWindows.push(window);
                    } else {
                        this.engine.addClient(this.clients.get(window)!);
                    }
                }
            }
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    buildLayout(rootTile: Kwin.Tile): void {
        // clear root tile
        while (rootTile.tiles.length > 0) {
            rootTile.tiles[0].remove();
        }
        this.tiles.clear();

        // for maximizing single, sometimes engines can create overlapping root tiles so find the real root
        let realRootTile: Tile = this.engine.rootTile;
        while (
            realRootTile.tiles.length == 1 &&
            realRootTile.clients.length == 0
        ) {
            realRootTile = realRootTile.tiles[0];
        }
        this.tiles.set(rootTile, realRootTile);
        // if a root tile client exists, just maximize it. there shouldnt be one if roottile has children
        if (realRootTile.clients.length != 0 && this.config.maximizeSingle) {
            for (let i = realRootTile.clients.length - 1; i >= 0; i -= 1) {
                const client = realRootTile.clients[i];
                const window = this.clients.inverse.get(client);
                if (window == undefined) {
                    this.logger.error("Window undefined");
                    continue;
                }
                window.tile = null;
                this.ctrl.windowExtensions.get(window)!.isSingleMaximized =
                    true;
                window.setMaximize(true, true);
                this.ctrl.workspace.raiseWindow(window);
            }
            return;
        }
        const queue: Queue<Tile> = new Queue();
        queue.enqueue(realRootTile);
        while (queue.size > 0) {
            const tile = queue.dequeue()!;
            const kwinTile = this.tiles.inverse.get(tile)!;
            this.ctrl.managedTiles.add(kwinTile);
            kwinTile.layoutDirection = tile.layoutDirection;
            // 1 is vertical, 2 is horizontal
            const horizontal =
                kwinTile.layoutDirection == Kwin.LayoutDirection.Horizontal;
            const tilesLen = tile.tiles.length;
            // fix sizing issues (ex. size > 1) prematurely
            tile.fixRelativeSizing();
            if (tilesLen > 1) {
                for (let i = 0; i < tilesLen; i += 1) {
                    // tiling has weird splitting mechanics, so hopefully this code can help with that
                    if (i == 0) {
                        kwinTile.split(tile.layoutDirection);
                    } else if (i > 1) {
                        kwinTile.tiles[i - 1].split(tile.layoutDirection);
                    }
                    // custom resizing much easier now (?)
                    const childKwinTile = kwinTile.tiles[i];
                    const childTile = tile.tiles[i];
                    this.tiles.set(childKwinTile, childTile);
                    // size based on relative size plus autosizing
                    // yeah whatever im just using relative size idc anymore and it works (?)
                    if (horizontal && i > 0) {
                        kwinTile.tiles[i - 1].relativeGeometry.width =
                            kwinTile.relativeGeometry.width *
                            tile.tiles[i - 1].relativeSize;
                    } else if (i > 0) {
                        kwinTile.tiles[i - 1].relativeGeometry.height =
                            kwinTile.relativeGeometry.height *
                            tile.tiles[i - 1].relativeSize;
                    }
                    queue.enqueue(childTile);
                }
            }
            // if there is one child tile, replace this tile with the child tile
            else if (tilesLen == 1) {
                this.tiles.set(kwinTile, tile.tiles[0]);
                queue.enqueue(tile.tiles[0]);
            }

            // JAVASCRIPT MENTIONED !!!!! WHAT THE FUCK IS A IMMUTABLE ITERATOR ?!?!?!
            for (let i = tile.clients.length - 1; i >= 0; i -= 1) {
                const client = tile.clients[i];
                const window = this.clients.inverse.get(client);
                if (window == undefined) {
                    this.logger.error("Client", client.name, "does not exist");
                    return;
                }
                const extensions = this.ctrl.windowExtensions.get(window)!;
                // set some properties before setting tile to make sure client shows up
                window.minimized = false;
                window.fullScreen = false;
                window.setMaximize(false, false);
                extensions.isSingleMaximized = false;
                window.tile = kwinTile;
                extensions.lastTiledLocation = GPoint.centerOfRect(
                    kwinTile.absoluteGeometry,
                );
                // windows raised in inverse order (first window in array goes on top eventually)
                this.ctrl.workspace.raiseWindow(window);
            }

            this.fixSizing(tile, kwinTile);
        }
    }
    
    fixSizing(tile: Tile, kwinTile: Kwin.Tile): void {
        // only resize if not root tile (obv)
        if (tile.parent == null || kwinTile.parent == null) {
            return;
        }
        let index = tile.parent.tiles.indexOf(tile);
        let parentIndex = tile.parent.parent != null ? tile.parent.parent.tiles.indexOf(tile.parent) : null;
        const requestedSize = new GSize();
        requestedSize.fitSize(tile.requestedSize);
        for (const client of tile.clients) {
            const window = this.clients.inverse.get(client);
            if (window == undefined) {
                continue;
            }
            requestedSize.fitSize(window.minSize);
        }
        const horizontal = kwinTile.parent.layoutDirection == Kwin.LayoutDirection.Horizontal;
        // horiz resize
        if (requestedSize.width > kwinTile.absoluteGeometryInScreen.width) {
            let diff =
                requestedSize.width -
                kwinTile.absoluteGeometryInScreen.width;
            if (horizontal) {
                // if the layout is horizontal already, width resizing should be easy
                if (index == 0) {
                    // first tile in sequence, shift border right
                    kwinTile.resizeByPixels(diff, Kwin.Edge.RightEdge);
                } else {
                    // shift border left
                    kwinTile.resizeByPixels(-diff, Kwin.Edge.LeftEdge);
                }
            } else if (parentIndex != null) {
                // evaluate here if the tile is laid out vertically but needs to be expanded horizontally
                if (parentIndex == 0) {
                    // first tile in sequence, shift border right
                    kwinTile.parent.resizeByPixels(diff, Kwin.Edge.RightEdge);
                } else {
                    // shift border left
                    kwinTile.parent.resizeByPixels(-diff, Kwin.Edge.LeftEdge);
                }
            }
        }

        // vertical resize
        if (requestedSize.height > kwinTile.absoluteGeometryInScreen.height) {
            let diff =
                requestedSize.height -
                kwinTile.absoluteGeometryInScreen.height;
            if (!horizontal) {
                if (index == 0) {
                    // first tile in sequence, shift border down
                    kwinTile.resizeByPixels(diff, Kwin.Edge.BottomEdge);
                } else {
                    // shift border up
                    kwinTile.resizeByPixels(
                        -diff,
                        Kwin.Edge.TopEdge,
                    );
                }
            } else if (parentIndex != null) {
                if (parentIndex == 0) {
                    // first tile in sequence, shift border down
                    kwinTile.parent.resizeByPixels(diff, Kwin.Edge.BottomEdge);
                } else {
                    // shift border up
                    kwinTile.parent.resizeByPixels(-diff, Kwin.Edge.TopEdge);
                }
            }
        }
    }

    untileWindow(window: Kwin.Window): void {
        if (this.untiledWindows.includes(window)) {
            return;
        }
        const client = this.clients.get(window);
        if (client == undefined) {
            return;
        }
        this.untiledWindows.push(window);
        try {
            this.engine.removeClient(client);
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    addWindow(window: Kwin.Window): void {
        if (!this.clients.has(window)) {
            this.clients.set(window, new Client(window));
            if (
                this.engine.engineCapability & EngineCapability.UntiledByDefault
            ) {
                this.untiledWindows.push(window);
                return;
            }
        }
        let index = this.untiledWindows.indexOf(window);
        if (index >= 0) {
            this.untiledWindows.splice(index, 1)[0];
        }
        const client = this.clients.get(window)!;
        // tries to use active insertion if it should, but can fail and fall back
        let activeTile: Tile | null = null;
        if (this.engine.config.insertionPoint == InsertionPoint.Active) {
            // use last active window because kwin switches focus when new windows are added (usually)
            const activeWindow = this.ctrl.workspaceExtensions.lastActiveWindow;
            if (activeWindow != null && activeWindow.tile != null) {
                activeTile = this.tiles.get(activeWindow.tile) ?? null;
            }
        }
        try {
            if (activeTile == null) {
                this.engine.addClient(client);
            } else {
                this.engine.putClientInTile(client, activeTile);
            }
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    removeWindow(window: Kwin.Window): void {
        const client = this.clients.get(window);
        if (client == undefined) {
            return;
        }
        this.clients.delete(window);
        if (this.untiledWindows.includes(window)) {
            this.untiledWindows.splice(this.untiledWindows.indexOf(window), 1);
            return;
        }
        try {
            this.engine.removeClient(client);
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    putWindowInTile(
        window: Kwin.Window,
        kwinTile: Kwin.Tile,
        direction?: Direction,
    ) {
        let tile = this.tiles.get(kwinTile);
        if (tile == undefined) {
            this.logger.error(
                "Tile",
                kwinTile.absoluteGeometry,
                "not registered",
            );
            return;
        }
        if (!this.clients.has(window)) {
            this.clients.set(window, new Client(window));
        }
        const client = this.clients.get(window)!;
        let index = this.untiledWindows.indexOf(window);
        if (index >= 0) {
            this.untiledWindows.splice(index, 1)[0];
        }
        try {
            let rotatedDirection = direction;
            if (
                rotatedDirection != null &&
                this.engine.config.rotateLayout &&
                (this.engine.engineCapability &
                    EngineCapability.TranslateRotation) ==
                    EngineCapability.TranslateRotation
            ) {
                rotatedDirection = new DirectionTools(
                    rotatedDirection,
                ).rotateCw();
                this.logger.debug(
                    "Insertion direction rotated to",
                    rotatedDirection,
                );
            }
            this.engine.putClientInTile(client, tile, rotatedDirection);
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }

    regenerateLayout(rootTile: Kwin.Tile) {
        const queue: Queue<Kwin.Tile> = new Queue();
        queue.enqueue(rootTile);
        while (queue.size > 0) {
            const kwinTile = queue.dequeue()!;
            const tile = this.tiles.get(kwinTile);
            if (tile == undefined) {
                this.logger.error(
                    "Tile",
                    kwinTile.absoluteGeometry,
                    "not registered",
                );
                continue;
            }
            // make sure parent squashing doesnt break resizing when a tile has one child
            // if the tile is normal, this all boils down to the old code so its whatever
            const tilesToSetSize = [tile];
            let parentTmp = tile.parent;
            while (parentTmp != null && parentTmp.tiles.length == 1) {
                tilesToSetSize.push(parentTmp);
                parentTmp = parentTmp.parent;
            }
            // because its a variable that should also be named tile... (keep the scopes clean!)
            for (const variableAlsoNamedTile of tilesToSetSize) {
                variableAlsoNamedTile.requestedSize = GSize.fromRect(
                    kwinTile.absoluteGeometry,
                );
                variableAlsoNamedTile.relativeSize = 1;
            }
            // only properly set relativeSize for the highest tile (its the only one actually affected)
            const highestTile = tilesToSetSize[tilesToSetSize.length - 1];
            if (
                kwinTile.parent != null &&
                kwinTile.parent.layoutDirection ==
                    Kwin.LayoutDirection.Horizontal
            ) {
                highestTile.relativeSize =
                    kwinTile.relativeGeometry.width /
                    kwinTile.parent.relativeGeometry.width;
            } else if (kwinTile.parent != null) {
                highestTile.relativeSize =
                    kwinTile.relativeGeometry.height /
                    kwinTile.parent.relativeGeometry.height;
            }
            // if the layout is mutable (tiles can be created/destroyed) then change it. really only for kwin layout
            if (
                (this.engine.engineCapability &
                    EngineCapability.TilesMutable) ==
                EngineCapability.TilesMutable
            ) {
                // destroy ones that dont exist anymore
                for (const child of tile.tiles) {
                    if (this.tiles.inverse.get(child) == null) {
                        this.tiles.inverse.delete(child);
                        child.remove();
                    }
                }
                // create ones that do (and arent registered)
                for (const child of kwinTile.tiles) {
                    if (!this.tiles.has(child)) {
                        const newTile = tile.addChild();
                        this.tiles.set(child, newTile);
                    }
                }
            }
            for (const child of kwinTile.tiles) {
                queue.enqueue(child);
            }
        }
        try {
            this.engine.regenerateLayout();
            this.engine.buildLayout();
        } catch (e) {
            this.logger.error(e);
        }
    }
}
