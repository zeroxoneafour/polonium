// btree.ts - Implementation of binary tree layout

import { TilingEngine, Tile, Client } from "engines";
import Log from "util/log";

export default class BTreeEngine extends TilingEngine
{
    addClient(client: Client): void
    {
        let check: Tile[] = [this.rootTile];
        let checkNext: Tile[] = [];
        while (check.length > 0)
        {
            for (const tile of check)
            {
                if (tile.client == null)
                {
                    tile.client = client;
                    return;
                }
                else if (tile.tiles.length == 0)
                {
                    tile.split();
                    tile.tiles[0].client = tile.client;
                    tile.client = null;
                    tile.tiles[1].client = client;
                    return;
                }
                else
                {
                    for (const t of tile.tiles)
                    {
                        checkNext.push(t);
                    }
                }
            }
            check = checkNext;
            checkNext = [];
        }
        // congrats, you broke it
        Log.error("Failed to add", client.name, "to binary tree engine");
    }
    
    removeClient(client: Client): void
    {
        if (this.rootTile.client == client)
        {
            this.rootTile.client = null;
            return;
        }
        let check: Tile[] = [this.rootTile];
        let checkNext: Tile[] = [];
        while (check.length > 0)
        {
            for (const tile of check)
            {
                if (tile.client == client)
                {
                    // cant be null
                    const parent = tile.parent!;
                    let index = 0;
                    if (parent.tiles.indexOf(tile) == 0)
                    {
                        index = 1;
                    }
                    // should destroy parent's tiles (including this one) and bring up children
                    parent.consume(parent.tiles[index]);
                    return;
                }
                else
                {
                    for (const t of tile.tiles)
                    {
                        checkNext.push(t);
                    }
                }
            }
            check = checkNext;
        }
        Log.error("Failed to remove", client.name, "from binary tree engine");
    }
}
