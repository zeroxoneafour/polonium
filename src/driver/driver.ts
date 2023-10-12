// driver/driver.ts - Mapping from engines to Kwin API

import { TilingEngine, Tile, Client } from "../engines";
import { EngineType } from "../engines/factory";
import * as Kwin from "../extern/kwin";
import BiMap from "mnemonist/bi-map";
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
    
    buildLayout(rootTile: Kwin.RootTile)
    {
        // clear root tile
        while (rootTile.tiles.length > 0)
        {
            rootTile.tiles[0].remove();
        }
        this.tiles.clear();
        let stack: Tile[] = [this.engine.rootTile];
        let stackNext: Tile[] = [];
        this.tiles.set(rootTile, this.engine.rootTile);
        while (stack.length > 0)
        {
            for (const tile of stack)
            {
                const kwinTile = this.tiles.inverse.get(tile)!;
                if (tile.tiles.length > 1)
                {
                    for (let i = 0; i < tile.tiles.length; i += 1)
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
                        kwinTile.split(tile.layoutDirection);
                        this.tiles.set(kwinTile.tiles[i], tile.tiles[i]);
                        stackNext.push(tile.tiles[i]);
                    }
                }
                if (tile.client != null)
                {
                    const kwinClient = this.clients.inverse.get(tile.client);
                    if (kwinClient == undefined)
                    {
                        Log.error("Client", tile.client.name, "does not exist");
                        return;
                    }
                    kwinClient.tile = kwinTile;
                }
            }
            stack = stackNext;
            stackNext = [];
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
