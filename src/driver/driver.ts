// driver/driver.ts - Mapping from engines to Kwin API

import { TilingEngine, Tile, Client } from "../engines";
import { EngineType } from "../engines/factory";
import { GSize } from "../util/geometry";
import * as Kwin from "../extern/kwin";
import BiMap from "mnemonist/bi-map";
import Queue from "mnemonist/queue";
import Log from "../util/log";

export class TilingDriver
{
    engine: TilingEngine;
    engineType: EngineType;
    tiles: BiMap<Kwin.Tile, Tile> = new BiMap();
    clients: BiMap<Kwin.Client, Client> = new BiMap();
    
    constructor(engine: TilingEngine, engineType: EngineType)
    {
        this.engine = engine;
        this.engineType = engineType;
    }
    
    // lint client issues that can happen
    fixClients()
    {
        let n = 0;
        for (const client of this.clients.keys())
        {
            if (client == undefined)
            {
                n += 1;
                this.engine.removeClient(this.clients.get(client)!);
            }
        }
        if (n > 0)
        {
            Log.debug("Removed", n, "dead clients");
            this.engine.buildLayout();
        }
    }
    
    buildLayout(rootTile: Kwin.RootTile, placeClients: boolean = true): [Kwin.Client, Kwin.Tile][]
    {
        const ret: [Kwin.Client, Kwin.Tile][] = [];
        const rootTileSize = rootTile.absoluteGeometry;
        // remove bugged clients
        this.fixClients();
        // clear root tile
        while (rootTile.tiles.length > 0)
        {
            rootTile.tiles[0].remove();
        }
        this.tiles.clear();
        let queue: Queue<Tile> = new Queue();
        queue.enqueue(this.engine.rootTile);
        this.tiles.set(rootTile, this.engine.rootTile);
        while (queue.size > 0)
        {
            const tile = queue.dequeue()!;
            const kwinTile = this.tiles.inverse.get(tile)!;
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
                        kwinTile.tiles[i].split(tile.layoutDirection);
                    }
                    
                    // evenly distribute tile sizes before doing custom resizing
                    if (horizontal)
                    {
                        kwinTile.tiles[i].relativeGeometry.width = kwinTile.relativeGeometry.width / tilesLen;
                    }
                    else
                    {
                        kwinTile.tiles[i].relativeGeometry.height = kwinTile.relativeGeometry.height / tilesLen;
                    }
                    this.tiles.set(kwinTile.tiles[i], tile.tiles[i]);
                    queue.enqueue(tile.tiles[i]);
                }
            }
            // grow to preferred tile size if necessary
            const tileSize = new GSize(kwinTile.absoluteGeometry);
            if (tile.requestedSize != null)
            {
                tileSize.fitSize(tile.requestedSize);
            }
            if (tile.client != null)
            {
                const kwinClient = this.clients.inverse.get(tile.client);
                if (kwinClient == undefined)
                {
                    Log.error("Client", tile.client.name, "does not exist");
                    return ret;
                }
                tileSize.fitSize(kwinClient.minSize);
                ret.push([kwinClient, kwinTile]);
                if (placeClients)
                {
                    kwinClient.tile = kwinTile;                    
                }
            }
            // absolutegeometry is read only, so make sizing relative
            tileSize.height /= rootTileSize.height;
            tileSize.width /= rootTileSize.width;
            tileSize.write(kwinTile.relativeGeometry);
        }
        return ret;
    }
    
    addClient(kwinClient: Kwin.Client): void
    {
        if (this.clients.has(kwinClient))
        {
            return;
        }
        const client = new Client(kwinClient);
        this.clients.set(kwinClient, client);
        this.engine.addClient(client);
        this.engine.buildLayout();
    }
    
    removeClient(kwinClient: Kwin.Client): void
    {
        const client = this.clients.get(kwinClient);
        if (client == undefined)
        {
            return;
        }
        this.clients.delete(kwinClient);
        this.engine.removeClient(client);
        this.engine.buildLayout();
    }
}
