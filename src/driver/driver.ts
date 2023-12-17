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
import Stack from "mnemonist/stack";
import Log from "../util/log";
import Config from "../util/config";

export class TilingDriver
{
    engine: TilingEngine;
    engineType: EngineType;
    manager: DriverManager;
    
    tiles: BiMap<Kwin.Tile, Tile> = new BiMap();
    clients: BiMap<Kwin.Client, Client> = new BiMap();
    clientsToNull: Kwin.Client[] = [];
    
    constructor(engine: TilingEngine, engineType: EngineType, manager: DriverManager)
    {
        this.engine = engine;
        this.engineType = engineType;
        this.manager = manager;
    }
    
    switchEngine(engine: TilingEngine, engineType: EngineType)
    {
        this.engine = engine;
        this.engineType = engineType;
        try
        {
            for (const client of this.clients.values())
            {
                this.engine.addClient(client);
            }
            this.engine.buildLayout();
        }
        catch (e)
        {
            throw e;
        }
    }
    
    buildLayout(rootTile: Kwin.RootTile): void
    {
        // clear root tile
        while (rootTile.tiles.length > 0)
        {
            rootTile.tiles[0].remove();
        }
        this.tiles.clear();
        
        // set clients marked for untiling to null tiles
        for (const client of this.clientsToNull)
        {
            client.tile = null;
        }
        this.clientsToNull = [];
        
        // for maximizing single, sometimes engines can create overlapping root tiles so find the real root
        let realRootTile: Tile = this.engine.rootTile;
        while (realRootTile.tiles.length == 1 && realRootTile.client == null)
        {
            realRootTile = realRootTile.tiles[0];
        }
        // if a root tile client exists, just maximize it. there shouldnt be one if roottile has children
        if (realRootTile.client != null && Config.maximizeSingle)
        {
            const kwinClient = this.clients.inverse.get(realRootTile.client);
            if (kwinClient == undefined)
            {
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

        while (queue.size > 0)
        {
            const tile = queue.dequeue()!;
            const kwinTile = this.tiles.inverse.get(tile)!;
            kwinTile.managed = true;
            kwinTile.layoutDirection = tile.layoutDirection;
            
            // 1 is vertical, 2 is horizontal
            const horizontal = (kwinTile.layoutDirection == 1);
            const tilesLen = tile.tiles.length;
            if (tilesLen > 1)
            {
                for (let i = 0; i < tilesLen; i += 1)
                {
                    // tiling has weird splitting mechanics, so hopefully this code can help with that
                    if (i == 0)
                    {
                        kwinTile.split(tile.layoutDirection);
                    }
                    else if (i > 1)
                    {
                        kwinTile.tiles[i-1].split(tile.layoutDirection);
                    }
                    if (horizontal && i > 0)
                    {
                        kwinTile.tiles[i-1].relativeGeometry.width = kwinTile.relativeGeometry.width / tilesLen;
                    }
                    else if (i > 0)
                    {
                        kwinTile.tiles[i-1].relativeGeometry.height = kwinTile.relativeGeometry.height / tilesLen;
                    }
                    // evenly distribute tile sizes before doing custom resizing
                    this.tiles.set(kwinTile.tiles[i], tile.tiles[i]);
                    queue.enqueue(tile.tiles[i]);
                }
            }
            // if there is one child tile, replace this tile with the child tile
            else if (tilesLen == 1)
            {
                this.tiles.set(kwinTile, tile.tiles[0]);
                queue.enqueue(tile.tiles[0]);
            }
            if (tile.client != null)
            {
                const kwinClient = this.clients.inverse.get(tile.client);
                if (kwinClient == undefined)
                {
                    Log.error("Client", tile.client.name, "does not exist");
                    return;
                }
                // set some properties before setting tile to make sure client shows up
                kwinClient.minimized = false;
                kwinClient.fullScreen = false;
                if (kwinClient.maximized)
                {
                    kwinClient.setMaximize(false, false);
                }
                kwinClient.tile = kwinTile;
                kwinClient.lastTiledLocation = GPoint.centerOfRect(kwinTile.absoluteGeometry);
            }

        }

        // bubble up tile size fixing (didn't want to overbloat this function)
        this.fixSizing(realRootTile, rootTile);
    }

    private fixSizing(rootTile: Tile, kwinRootTile: Kwin.RootTile): void
    {
        // works by first doing a breadth first search to establish depth layers of windows
        // next, bubbles up each depth layer, adding the sizes from the previous depth layer and establishing ratios
        // should be satisfactory for most use cases as window size conflicts are somewhat rare
        let layers: Stack<Tile[]> = new Stack();
        let stack: Tile[] = [rootTile];
        let stackNext: Tile[] = [];
        while (stack.length > 0)
        {
            for (const tile of stack)
            {
                for (const child of tile.tiles)
                {
                    stackNext.push(child);
                }
            }
            layers.push(stack);
            stack = stackNext;
            stackNext = [];
        }
        let sizeMap: Map<Tile, GSize> = new Map();
        while (layers.size > 0)
        {
            let layer = layers.pop()!;
            for (const tile of layer)
            {
                const targetSize = new GSize(tile.requestedSize ?? this.tiles.inverse.get(tile)!.absoluteGeometry);
                if (tile.client != null)
                {
                    const kwinClient = this.clients.inverse.get(tile.client);
                    if (kwinClient != null)
                    {
                        targetSize.fitSize(kwinClient.minSize);
                    }
                }
                else
                {
                    const horizontal = tile.layoutDirection == 1; // else vertical (hopefully)
                    let width = 0;
                    let height = 0;
                    // first pass - get all minimum sizes
                    for (const child of tile.tiles)
                    {
                        const size = sizeMap.get(child)!;
                        if (horizontal)
                        {
                            width += size.width;
                            if (size.height > height)
                            {
                                height = size.height;
                            }
                        }
                        else
                        {
                            height += size.height;
                            if (size.width > width)
                            {
                                width = size.width;
                            }
                        }
                    }
                    targetSize.fitSize(
                        {
                            width: width,
                            height: height,
                        }
                    );
                    let largerTiles: Tile[];
                    let smallerTiles: Tile[];
                    let averageSize: number;
                    if (horizontal)
                    {
                        averageSize = targetSize.width / tile.tiles.length;
                        // hopefully filter isnt mutable
                        largerTiles = tile.tiles.filter((t) => sizeMap.get(t)!.width > averageSize);
                        smallerTiles = tile.tiles.filter((t) => sizeMap.get(t)!.width < averageSize);
                    }
                    else
                    {
                        averageSize = targetSize.height / tile.tiles.length;
                        largerTiles = tile.tiles.filter((t) => sizeMap.get(t)!.height > averageSize);
                        smallerTiles = tile.tiles.filter((t) => sizeMap.get(t)!.height < averageSize);
                    }
                    // all extra space occupied by larger tiles
                    let largerTileSpace = 0;
                    for (const largerTile of largerTiles)
                    {
                        const size = new GSize(targetSize);
                        const minSize = sizeMap.get(largerTile)!;
                        if (horizontal)
                        {
                            largerTileSpace += (minSize.width - averageSize);
                            size.width = minSize.width;
                        }
                        else
                        {
                            largerTileSpace += (minSize.height - averageSize);
                            size.height = minSize.height;
                        }
                        sizeMap.set(largerTile, size);
                    }
                    for (const smallerTile of smallerTiles)
                    {
                        const size = new GSize(targetSize);
                        Log.debug(size);
                        if (horizontal)
                        {
                            size.width = averageSize - (largerTileSpace / smallerTiles.length);
                        }
                        else
                        {
                            size.height = averageSize - (largerTileSpace / smallerTiles.length);
                        }
                        sizeMap.set(smallerTile, size);
                    }
                }
                sizeMap.set(tile, targetSize);
            }
        }
        // set all tile sizes
        const rootTileSize = kwinRootTile.absoluteGeometry;
        for (const tile of sizeMap.keys())
        {
            const size = sizeMap.get(tile);
            const kwinTile = this.tiles.inverse.get(tile);
            if (size != null && kwinTile != null)
            {
                // has to be relative
                size.height /= rootTileSize.height;
                size.width /= rootTileSize.width;
                if (size.area != 0)
                {
                    size.write(kwinTile.relativeGeometry);
                }
            }
        }
    }

    addClient(kwinClient: Kwin.Client): void
    {
        if (this.clients.has(kwinClient))
        {
            return;
        }
        const client = new Client(kwinClient);
        this.clients.set(kwinClient, client);
        
        // tries to use active insertion if it should, but can fail and fall back
        let failedActive: boolean = true;
        activeChecks: if (this.engine.config.insertionPoint == InsertionPoint.Active)
        {
            failedActive = false;
            const activeClient = this.manager.ctrl.workspace.activeClient;
            if (activeClient == null || activeClient.tile == null)
            {
                failedActive = true;
                break activeChecks;
            }
            const tile = this.tiles.get(activeClient.tile);
            if (tile == undefined)
            {
                failedActive = true;
                break activeChecks;
            }
            this.engine.putClientInTile(client, tile);
        }
        try
        {
            if (failedActive)
            {
                this.engine.addClient(client);
            }
            this.engine.buildLayout();
        }
        catch (e)
        {
            Log.error(e);
        }
    }
    
    removeClient(kwinClient: Kwin.Client): void
    {
        const client = this.clients.get(kwinClient);
        if (client == undefined)
        {
            return;
        }
        this.clients.delete(kwinClient);
        this.clientsToNull.push(kwinClient);
        try
        {
            this.engine.removeClient(client);
            this.engine.buildLayout();
        }
        catch (e)
        {
            Log.error(e);
        }
    }
    
    putClientInTile(kwinClient: Kwin.Client, kwinTile: Kwin.Tile, direction?: Direction)
    {
        const tile = this.tiles.get(kwinTile);
        if (tile == undefined)
        {
            Log.error("Tile", kwinTile.absoluteGeometry, "not registered");
            return;
        }
        if (!this.clients.has(kwinClient))
        {
            this.clients.set(kwinClient, new Client(kwinClient));
        }
        const client = this.clients.get(kwinClient)!;
        try
        {
            let rotatedDirection = direction;
            if (rotatedDirection != null
                && this.engine.config.rotateLayout
                && this.engine.engineCapability & EngineCapability.TranslateRotation)
            {
                rotatedDirection = new DirectionTools(rotatedDirection).rotateCw();
                Log.debug("Insertion direction rotated to", rotatedDirection);
            }
            this.engine.putClientInTile(client, tile, rotatedDirection);
            this.engine.buildLayout();
        }
        catch (e)
        {
            Log.error(e);
        }
    }
    
    regenerateLayout(rootTile: Kwin.RootTile)
    {
        const queue: Queue<Kwin.Tile> = new Queue();
        queue.enqueue(rootTile);
        while (queue.size > 0)
        {
            const kwinTile = queue.dequeue()!;
            const tile = this.tiles.get(kwinTile);
            if (tile == undefined)
            {
                Log.error("Tile", kwinTile.absoluteGeometry, "not registered");
                continue;
            }
            tile.requestedSize = GSize.fromRect(kwinTile.absoluteGeometry);
            // if the layout is mutable (tiles can be created/destroyed) then change it. really only for kwin layout
            if (this.engine.engineCapability & EngineCapability.TilesMutable)
            {
                // destroy ones that dont exist anymore
                for (const child of tile.tiles)
                {
                    if (this.tiles.inverse.get(child) == null)
                    {
                        this.tiles.inverse.delete(child);
                        child.remove();
                    }
                }
                // create ones that do (and arent registered)
                for (const child of kwinTile.tiles)
                {
                    if (!this.tiles.has(child))
                    {
                        const newTile = tile.addChild();
                        this.tiles.set(child, newTile);
                    }
                }
            }
            for (const child of kwinTile.tiles)
            {
                queue.enqueue(child);
            }
        }
        try
        {
            this.engine.regenerateLayout();
            this.engine.buildLayout();            
        }
        catch (e)
        {
            Log.error(e);
        }
    }
}
