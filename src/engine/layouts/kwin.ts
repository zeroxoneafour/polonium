// kwin.ts - Layout engine that mimics kwin default tiling
// quite a bit smaller this time!

import { TilingEngine, EngineCapability, Client, Tile } from "../";
import { Direction } from "../../util/geometry";

export default class KwinEngine extends TilingEngine
{
    // tilesmutable moves all processing work to driver
    engineCapability = EngineCapability.TilesMutable;

    buildLayout()
    {
        // literally nothing
        return;
    }
    
    addClient(client: Client)
    {
        return;
    }
    
    removeClient(client: Client)
    {
        return;
    }
    
    putClientInTile(client: Client, tile: Tile, _direction?: Direction)
    {
        tile.client = client;
    }
    
    regenerateLayout()
    {
        return;
    }
}