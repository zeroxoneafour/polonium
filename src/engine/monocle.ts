// trash monocle layout (at least this one is)

import * as Engine from "./common";
import { workspace } from "../index";

export class TilingEngine implements Engine.TilingEngine {
    clients: Array<KWin.AbstractClient> = new Array;
    rootTile: KWin.RootTile | null = null;
    
    // no tile modification needed
    buildLayout(rootTile: KWin.RootTile): boolean {
        this.rootTile = rootTile;
        return true;
    }
    
    updateTiles(rootTile: KWin.RootTile): boolean {
        this.rootTile = rootTile;
        return true;
    }
    
    resizeTile(_tile: KWin.Tile, _direction: Engine.Direction, _amount: number): boolean {
        return true;
    }
    
    placeClients(): Array<[KWin.AbstractClient, KWin.Tile]> {
        if (this.rootTile == null) return new Array;
        let ret = new Array<[KWin.AbstractClient, KWin.Tile]>;
        for (const client of this.clients) {
            ret.push([client, this.rootTile]);
        }
        return ret;
    }
    
    addClient(client: KWin.AbstractClient): boolean {
        this.clients.push(client);
        return true;
    }
    
    // also doesnt do anything right now 
    putClientInTile(client: KWin.AbstractClient, _tile: KWin.Tile): boolean {
        /*
        if (this.rootTile == null) return false;
        // left, so push the tile back one
        if (tile == this.rootTile.tiles[0]) {
            const insertPosition = (this.pointer + 1) % this.clients.length;
            this.clients.splice(insertPosition, 0, client);
        } else if (tile == this.rootTile.tiles[1]) {
            const insertPosition = (this.pointer - 1 + this.clients.length) % this.clients.length;
            this.clients.splice(insertPosition, 0, client);
        } else {
            return false;
        }
        */
        return this.addClient(client);
    }
    
    clientOfTile(_tile: KWin.Tile): KWin.AbstractClient {
        // active one should be on top
        if (workspace.activeClient != null && this.clients.includes(workspace.activeClient)) {
            return workspace.activeClient;
        } else {
            return this.clients[0];
        }
    }
    
    // cant really do anything
    swapTiles(_rootTile: KWin.Tile, _tile: KWin.Tile): boolean {
        return true;
    }
    
    removeClient(client: KWin.AbstractClient): boolean {
        this.clients.splice(this.clients.indexOf(client), 1);
        return true;
    }
}
