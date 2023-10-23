// half.ts - Tiling engine for the half/split layout

import { Tile, Client, TilingEngine } from "../";
import { InsertionPoint } from "../../util/config";

export default class HalfEngine extends TilingEngine
{
    buildLayout()
    {
        // feels good to not have to make this again...
        return;
    }
    
    addClient(client: Client)
    {
        const rt = this.rootTile;
        if (rt.tiles.length == 0 && rt.client == null)
        {
            rt.client = client;
            return;
        }
        else if (rt.tiles.length == 0)
        {
            rt.split();
            const c = rt.client;
            rt.client = null;
            if (this.config.insertionPoint == InsertionPoint.Left)
            {
                // tiles[0] should be on left
                rt.tiles[0].client = client;
                rt.tiles[1].client = c;
            }
            else
            {
                rt.tiles[0].client = c;
                rt.tiles[1].client = client;
            }
            return;
        }
        // remaining condition is when there are two separate branches
        let insertTile: Tile;
        if (this.config.insertionPoint == InsertionPoint.Left)
        {
            insertTile = rt.tiles[0];
        }
        else
        {
            insertTile = rt.tiles[1];
        }
        const t = insertTile.addChild();
        t.client = client;
        return;
    }
    
    removeClient(client: Client)
    {
        
    }
}
