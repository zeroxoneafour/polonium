// driver/driver.ts - Mapping from engines to Kwin API

import { DriverManager } from "./";
import { TilingEngine, Tile, Client, EngineCapability } from "../engine";
import { Direction } from "../util/geometry";
import { EngineType } from "../engine/factory";
import { GSize, GPoint, DirectionTools } from "../util/geometry";
import { InsertionPoint } from "../util/config";
import * as Kwin from "../extern/kwin";
import BiMap from "mnemonist/bi-map";
import Queue from "mnemonist/queue";
import Log from "../util/log";
import Config from "../util/config";

export class TilingDriver {
    engine: TilingEngine;
    engineType: EngineType;
    manager: DriverManager;

    tiles: BiMap<Kwin.Tile, Tile> = new BiMap();
    clients: BiMap<Kwin.Client, Client> = new BiMap();
    // untitledclients are clients that are queued for formal deletion and then become clientstonull
    // clientstonull just have their tile set to null
    clientsToNull: Kwin.Client[] = [];
    untiledClients: Kwin.Client[] = [];

    constructor(
        engine: TilingEngine,
        engineType: EngineType,
        manager: DriverManager,
    ) {
        this.engine = engine;
        this.engineType = engineType;
        this.manager = manager;
    }

    switchEngine(engine: TilingEngine, engineType: EngineType) {
        this.engine = engine;
        this.engineType = engineType;
        try {
            for (const client of this.clients.values()) {
                this.engine.addClient(client);
            }
            this.engine.buildLayout();
        } catch (e) {
            throw e;
        }
    }

    buildLayout(rootTile: Kwin.RootTile): void {
        // clear root tile
        while (rootTile.tiles.length > 0) {
            rootTile.tiles[0].remove();
        }
        this.tiles.clear();
        this.untiledClients = [];
        for (const client of this.engine.untiledClients) {
            const kwinClient = this.clients.inverse.get(client);
            if (kwinClient != null) {
                this.untiledClients.push(kwinClient);
            }
        }
        for (const client of this.clientsToNull) {
            client.tile = null;
        }
        this.clientsToNull = [];
        // set clients marked for untiling to null tiles

        // for maximizing single, sometimes engines can create overlapping root tiles so find the real root
        let realRootTile: Tile = this.engine.rootTile;
        while (realRootTile.tiles.length == 1 && realRootTile.client == null) {
            realRootTile = realRootTile.tiles[0];
        }
        // if a root tile client exists, just maximize it. there shouldnt be one if roottile has children
        if (realRootTile.client != null && Config.maximizeSingle) {
            const kwinClient = this.clients.inverse.get(realRootTile.client);
            if (kwinClient == undefined) {
                return;
            }
            kwinClient.tile = null;
            kwinClient.isSingleMaximized = true;
            kwinClient.setMaximize(true, true);
            return;
        }
        const queue: Queue<Tile> = new Queue();
        queue.enqueue(realRootTile);
        this.tiles.set(rootTile, realRootTile);

        while (queue.size > 0) {
            const tile = queue.dequeue()!;
            const kwinTile = this.tiles.inverse.get(tile)!;
            kwinTile.managed = true;
            kwinTile.layoutDirection = tile.layoutDirection;

            // 1 is vertical, 2 is horizontal
            const horizontal = kwinTile.layoutDirection == 1;
            const tilesLen = tile.tiles.length;
            if (tilesLen > 1) {
                for (let i = 0; i < tilesLen; i += 1) {
                    // tiling has weird splitting mechanics, so hopefully this code can help with that
                    if (i == 0) {
                        kwinTile.split(tile.layoutDirection);
                    } else if (i > 1) {
                        kwinTile.tiles[i - 1].split(tile.layoutDirection);
                    }
                    if (horizontal && i > 0) {
                        kwinTile.tiles[i - 1].relativeGeometry.width =
                            kwinTile.relativeGeometry.width / tilesLen;
                    } else if (i > 0) {
                        kwinTile.tiles[i - 1].relativeGeometry.height =
                            kwinTile.relativeGeometry.height / tilesLen;
                    }
                    // evenly distribute tile sizes before doing custom resizing
                    this.tiles.set(kwinTile.tiles[i], tile.tiles[i]);
                    queue.enqueue(tile.tiles[i]);
                }
            }
            // if there is one child tile, replace this tile with the child tile
            else if (tilesLen == 1) {
                this.tiles.set(kwinTile, tile.tiles[0]);
                queue.enqueue(tile.tiles[0]);
            }
            if (tile.client != null) {
                const kwinClient = this.clients.inverse.get(tile.client);
                if (kwinClient == undefined) {
                    Log.error("Client", tile.client.name, "does not exist");
                    return;
                }
                // set some properties before setting tile to make sure client shows up
                kwinClient.minimized = false;
                kwinClient.fullScreen = false;
                if (kwinClient.maximized) {
                    kwinClient.setMaximize(false, false);
                }
                kwinClient.tile = kwinTile;
                kwinClient.lastTiledLocation = GPoint.centerOfRect(
                    kwinTile.absoluteGeometry,
                );
            }
        }

        // bubble up tile size fixing (didn't want to overbloat this function)
        this.fixSizing(realRootTile, rootTile);
    }

    // kwin couldnt do this themselves?
    private fixSizing(rootTile: Tile, kwinRootTile: Kwin.RootTile): void {
        const padding = kwinRootTile.padding;
        // just finds tiles that need special size constraints and sets them
        // main difference is that this one can do a bit of pushing
        const sizeMap: Map<Tile, GSize> = new Map();
        const queue: Queue<Tile> = new Queue();
        queue.enqueue(rootTile);
        while (queue.size > 0) {
            const parent = queue.dequeue()!;
            for (const tile of parent.tiles) {
                const requestedSize = tile.requestedSize;
                if (requestedSize != null) {
                    sizeMap.set(tile, new GSize(requestedSize));
                } else {
                    const client = tile.client;
                    if (client != null) {
                        const minSize = client.minSize;
                        const kwinTile = this.tiles.inverse.get(tile);
                        if (kwinTile == null) {
                            Log.error("Tile does not exist in fixSizing()");
                            continue;
                        }
                        const oldSize = new GSize(kwinTile.absoluteGeometry);
                        const size = new GSize(oldSize);
                        size.fitSize(minSize);
                        if (!size.isEqual(oldSize)) {
                            // tile padding
                            size.width += padding * 2;
                            size.height += padding * 2;
                            sizeMap.set(tile, size);
                        }
                    }
                }
                queue.enqueue(tile);
            }
        }
        // set all tile sizes
        const rootTileSize = kwinRootTile.absoluteGeometry;
        const tilesToUpdate: Queue<Tile> = new Queue();
        for (const tile of sizeMap.keys()) {
            tilesToUpdate.enqueue(tile);
        }
        while (tilesToUpdate.size > 0) {
            const tile = tilesToUpdate.dequeue()!;
            const size = sizeMap.get(tile);
            const kwinTile = this.tiles.inverse.get(tile);
            let parent = tile.parent;
            // have to put this here becomes sometimes tiles are collapsed
            while (parent != null && !this.tiles.inverse.has(parent)) {
                parent = parent.parent;
            }
            if (size == null || kwinTile == null) {
                // highly improbable this would happen
                Log.debug("Null found in fixTiling() somehow");
                continue;
            }
            if (parent == null) {
                // tile is root tile
                continue;
            }
            const relativeSize = new GSize(size);
            // has to be relative
            relativeSize.height /= rootTileSize.height;
            relativeSize.width /= rootTileSize.width;
            relativeSize.write(kwinTile.relativeGeometry);
            // make sure parent can fit the tile constraints as well
            let parentSize = sizeMap.get(parent);
            if (parentSize == null) {
                const kwinParent = this.tiles.inverse.get(parent);
                if (kwinParent == null) {
                    Log.debug("Parent tile not found");
                    continue;
                } else {
                    parentSize = new GSize(kwinParent.absoluteGeometry);
                }
            }
            if (!sizeMap.has(parent)) {
                const newParentSize = new GSize(parentSize);
                if (
                    parent.layoutDirection == 1 &&
                    parentSize.height < size.height
                ) {
                    // laid out horiz so make sure parent fits children vertically
                    newParentSize.height = size.height;
                } else if (parentSize.width < size.width) {
                    newParentSize.width = size.width;
                }
                if (!newParentSize.isEqual(parentSize)) {
                    parentSize = newParentSize;
                    sizeMap.set(parent, newParentSize);
                    tilesToUpdate.enqueue(parent);
                }
            }
            // set sizes on siblings as well if necessary
            for (const topSibling of parent.tiles) {
                // have to filter down because of tile collapsing
                let sibling = topSibling;
                while (sibling.tiles.length == 1) {
                    sibling = sibling.tiles[0];
                }
                if (sibling == tile) {
                    continue;
                }
                // make sure were not interfering with other tiles sizing as well
                if (!sizeMap.has(sibling)) {
                    const siblingSize = new GSize(parentSize);
                    if (parent.layoutDirection == 1) {
                        // horiz
                        siblingSize.width =
                            (parentSize.width - size.width) /
                            (parent.tiles.length - 1);
                    } else {
                        siblingSize.height =
                            (parentSize.height - size.height) /
                            (parent.tiles.length - 1);
                    }
                    sizeMap.set(sibling, siblingSize);
                    tilesToUpdate.enqueue(sibling);
                }
            }
        }
    }

    addClient(kwinClient: Kwin.Client): void {
        if (this.clients.has(kwinClient)) {
            return;
        }
        const client = new Client(kwinClient);
        this.clients.set(kwinClient, client);

        // tries to use active insertion if it should, but can fail and fall back
        let failedActive: boolean = true;
        activeChecks: if (
            this.engine.config.insertionPoint == InsertionPoint.Active
        ) {
            failedActive = false;
            const activeClient = this.manager.ctrl.workspace.activeClient;
            if (activeClient == null || activeClient.tile == null) {
                failedActive = true;
                break activeChecks;
            }
            const tile = this.tiles.get(activeClient.tile);
            if (tile == undefined) {
                failedActive = true;
                break activeChecks;
            }
            this.engine.putClientInTile(client, tile);
        }
        try {
            if (failedActive) {
                this.engine.addClient(client);
            }
            this.engine.buildLayout();
        } catch (e) {
            Log.error(e);
        }
    }

    removeClient(kwinClient: Kwin.Client): void {
        const client = this.clients.get(kwinClient);
        if (client == undefined) {
            return;
        }
        this.clients.delete(kwinClient);
        this.clientsToNull.push(kwinClient);
        try {
            this.engine.removeClient(client);
            this.engine.buildLayout();
        } catch (e) {
            Log.error(e);
        }
    }

    putClientInTile(
        kwinClient: Kwin.Client,
        kwinTile: Kwin.Tile,
        direction?: Direction,
    ) {
        const tile = this.tiles.get(kwinTile);
        if (tile == undefined) {
            Log.error("Tile", kwinTile.absoluteGeometry, "not registered");
            return;
        }
        if (!this.clients.has(kwinClient)) {
            this.clients.set(kwinClient, new Client(kwinClient));
        }
        const client = this.clients.get(kwinClient)!;
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
                Log.debug("Insertion direction rotated to", rotatedDirection);
            }
            this.engine.putClientInTile(client, tile, rotatedDirection);
            this.engine.buildLayout();
        } catch (e) {
            Log.error(e);
        }
    }

    regenerateLayout(rootTile: Kwin.RootTile) {
        const queue: Queue<Kwin.Tile> = new Queue();
        queue.enqueue(rootTile);
        while (queue.size > 0) {
            const kwinTile = queue.dequeue()!;
            const tile = this.tiles.get(kwinTile);
            if (tile == undefined) {
                Log.error("Tile", kwinTile.absoluteGeometry, "not registered");
                continue;
            }
            tile.requestedSize = GSize.fromRect(kwinTile.absoluteGeometry);
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
            Log.error(e);
        }
    }
}
