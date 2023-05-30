// an engine that is no engine ie. floating
import * as Engine from "./common";

export class TilingEngine implements Engine.TilingEngine {
    clientList: Array<KWin.AbstractClient> = new Array;
    buildLayout(_rootTile: KWin.RootTile): boolean {
        return true;
    }
    updateTiles(_rootTile: KWin.RootTile): boolean {
        return true;
    }
    placeClients(): Array<[KWin.AbstractClient, null]> {
        return this.clientList.map(x => [x, null]);
    }
    addClient(client: KWin.AbstractClient): boolean {
        this.clientList.push(client);
        return true;
    }
    putClientInTile(_client: KWin.AbstractClient, _tile: KWin.Tile): boolean {
        return true;
    }
    clientOfTile(_tile: KWin.Tile): null {
        return null;
    }
    swapTiles(_tileA: KWin.Tile, _tileB: KWin.Tile): boolean {
        return true;
    }
    removeClient(client: KWin.AbstractClient): boolean {
        this.clientList.splice(this.clientList.indexOf(client), 1);
        return true;
    }
}
