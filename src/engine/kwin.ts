// normal kwin tiling
import { BiMap } from "mnemonist";
import { printDebug } from "../util";
import * as Engine from "./common";

// look familiar?
class Tile {
    tiles: Array<Tile> = new Array;
    windows: Array<KWin.AbstractClient> = new Array;
    // change this to be any because my qt.qrect definition doesnt cover everything
    relativeGeometry: Qt.QRect | null;
    parent: Tile | null;
    padding: number = 4;
    layoutDirection: number;
    constructor(parent: Tile | null, relativeGeometry: Qt.QRect | null, layoutDirection: number) {
        this.layoutDirection = layoutDirection;
        // rootTile
        if (parent == null || relativeGeometry == null) {
            this.parent = null;
            this.relativeGeometry = null;
            return;
        }
        this.parent = parent;
        this.relativeGeometry = {
            x: relativeGeometry.x,
            y: relativeGeometry.y,
            width: relativeGeometry.width,
            height: relativeGeometry.height,
        };
        parent.tiles.push(this);
    }
}
class RootTile extends Tile {
    parent: null = null;
    relativeGeometry: null = null;
    constructor(layoutDirection: number) {
        super(null, null, layoutDirection)
    }
}

export class TilingEngine implements Engine.TilingEngine {
    fakeRootTile: RootTile = new RootTile(1);
    untiledClients: Array<KWin.AbstractClient> = new Array;
    tileMap: BiMap<Tile, KWin.Tile> = new BiMap;
    buildLayout(rootTile: KWin.RootTile): boolean {
        this.tileMap.clear();
        this.tileMap.set(this.fakeRootTile, rootTile);
        let stack: Array<Tile> = [this.fakeRootTile];
        let stackNext = new Array<Tile>;
        while (stack.length != 0) {
            for (const fakeTile of stack) {
                const realTile = this.tileMap.get(fakeTile);
                if (realTile == undefined) {
                    printDebug("Could not find tile", true);
                    return false;
                }
                let splitTile = realTile;
                for (let i = 1; i < fakeTile.tiles.length; i += 1) {
                    print("split", i);
                    splitTile.split(fakeTile.layoutDirection);
                    splitTile = realTile.tiles[i];
                }
                for (let i = 0; i < fakeTile.tiles.length; i += 1) {
                    // have to set all properties individually for reasons
                    this.tileMap.set(fakeTile.tiles[i], realTile.tiles[i]);
                    stackNext.push(fakeTile.tiles[i]);
                }
                let geometry = fakeTile.relativeGeometry;
                if (geometry != null) {
                    print(geometry.x);
                    print(realTile.relativeGeometry.x);
                    realTile.relativeGeometry.x = geometry.x;
                    realTile.relativeGeometry.y = geometry.y;
                    realTile.relativeGeometry.width = geometry.width;
                    realTile.relativeGeometry.height = geometry.height;
                }
            }
            stack = stackNext;
            stackNext = [];
        }
        return true;
    }
    
    updateTiles(rootTile: KWin.RootTile): boolean {
        this.tileMap.clear();
        this.fakeRootTile = new RootTile(rootTile.layoutDirection);
        this.tileMap.set(this.fakeRootTile, rootTile);
        let stack: Array<KWin.Tile> = [rootTile];
        let stackNext = new Array<KWin.Tile>;
        while (stack.length > 0) {
            for (const realTile of stack) {
                const fakeTile = this.tileMap.inverse.get(realTile);
                if (fakeTile == undefined) {
                    printDebug("Could not find tile", true);
                    return false;
                }
                for (const tile of realTile.tiles) {
                    print(tile.relativeGeometry);
                    const newTile = new Tile(fakeTile, tile.relativeGeometry, tile.layoutDirection);
                    this.tileMap.set(newTile, tile);
                    stackNext.push(tile);
                }
            }
            stack = stackNext;
            stackNext = [];
        }
        return true;
    }
    
    placeClients(): Array<[KWin.AbstractClient, KWin.Tile | null]> {
        let ret = new Array<[KWin.AbstractClient, KWin.Tile | null]>;
        for (const fakeTile of this.tileMap.keys()) {
            for (const client of fakeTile.windows) {
                ret.push([client, this.tileMap.get(fakeTile)!]);
            }
        }
        for (const client of this.untiledClients) {
            ret.push([client, null]);
        }
        return ret;
    }
    
    // user tiles this if they want
    addClient(client: KWin.AbstractClient): boolean {
        this.untiledClients.push(client);
        return true;
    }
    
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile): boolean {
        const fakeTile = this.tileMap.inverse.get(tile);
        if (fakeTile == undefined) {
            printDebug("Could not find tile", true);
            return false;
        }
        fakeTile.windows.push(client);
        return true;
    }
    
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null {
        if (this.tileMap.inverse.has(tile)) {
            const client = this.tileMap.inverse.get(tile)!.windows[0];
            if (client == undefined) {
                return null;
            } else {
                return client;
            }
        } else {
            return null;
        }
    }
    
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean {
        const fakeTileA = this.tileMap.inverse.get(tileA);
        const fakeTileB = this.tileMap.inverse.get(tileB);
        if (fakeTileA == undefined || fakeTileB == undefined) {
            printDebug("Could not find tiles", true);
            return false;
        }
        let tmparray = fakeTileA.windows;
        fakeTileA.windows = fakeTileB.windows;
        fakeTileB.windows = tmparray;
        return true;
    }
    
    removeClient(client: KWin.AbstractClient): boolean {
        if (this.untiledClients.includes(client)) {
            this.untiledClients.splice(this.untiledClients.indexOf(client), 1);
            return true;
        }
        for (const fakeTile of this.tileMap.keys()) {
            if (fakeTile.windows.includes(client)) {
                fakeTile.windows.splice(fakeTile.windows.indexOf(client), 1);
                return true;
            }
        }
        // only reach here if client is not found
        return true;
    }
}
