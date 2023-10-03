// driver/driver.ts - Mapping from engines to Kwin API

import { ITilingEngine, Tile, Client, RootTile } from "engines";
import * as Kwin from "extern/kwin";
import BiMap from "mnemonist/bi-map";

export class TilingDriver
{
    engine: ITilingEngine;
    tiles: BiMap<Kwin.Tile, Tile> = new BiMap();
    clients: BiMap<Kwin.Client, Client> = new BiMap();
    
    constructor(engine: ITilingEngine)
    {
        this.engine = engine;
    }
    
    buildLayout(rootTile: Kwin.RootTile)
    {
        
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
    }
}
