// half.ts - Tiling engine for the half/split layout

import { Tile, Client, TilingEngine } from "../";
import { InsertionPoint } from "../../util/config";
import { QSize } from "../../extern/qt";

class ClientBox
{
    client: Client;
    size: QSize | null = null;

    constructor(client: Client)
    {
        this.client = Client;
    }
}

export default class HalfEngine extends TilingEngine
{
    left: ClientBox[] = [];
    right: ClientBox[] = [];

    buildLayout()
    {
        this.rootTile.removeChildren();
        if (this.left.length == 0 && this.right.length == 0)
        {
            // empty root tile
            return;
        }
        else if (this.left.length == 0 && this.right.length > 0)
        {
            for (const box of this.right)
            {
                const tile = this.rootTile.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
            }
        }
        else if (this.left.length > 0 && this.right.length == 0)
        {
            for (const box of this.left)
            {
                const tile = this.rootTile.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
            }
        }
        else
        {
            this.rootTile.split();
            const left = this.rootTile.tiles[0];
            const right = this.rootTile.tiles[1];

            for (const box of this.left)
            {
                const tile = left.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
            }
            for (const box of this.right)
            {
                const tile = right.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
            }
        }
    }
    
    addClient(client: Client)
    {
        if (this.config.insertionPoint == InsertionPoint.Left)
        {
            if (this.right.length == 0)
            {
                this.right.push(new ClientBox(client));
            }
            else
            {
                this.left.push(new ClientBox(client));
            }
        }
        else
        {
            if (this.left.length == 0)
            {
                this.left.push(new ClientBox(client));
            }
            else
            {
                this.right.push(new ClientBox(client));
            }
        }
    }
    
    removeClient(client: Client)
    {
    }
}
