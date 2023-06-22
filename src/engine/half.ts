// an engine with a split down the middle, by default only appends windows to the right

import { BiMap } from "mnemonist";
import { printDebug } from "../util";
import * as Engine from "./common";

class Container {
    client: KWin.AbstractClient;
    constructor(client: KWin.AbstractClient) {
        this.client = client;
    }
}

export class TilingEngine implements Engine.TilingEngine {
    left: Array<Container> = new Array;
    right: Array<Container> = new Array;
    nodeMap: BiMap<Container, KWin.Tile> = new BiMap;
    middleSplit: number = 0.5;
    
    buildLayout(rootTile: KWin.RootTile): boolean {
        if (this.right.length == 0 || this.left.length == 0) {
            let previousTile: KWin.Tile = rootTile;
            let topTile = previousTile;
            let mainArray: Array<Container>;
            if (this.right.length == 0) {
                mainArray = this.left;
            } else {
                mainArray = this.right;
            }
            for (let i = 0; i < mainArray.length; i += 1) {
                let container = mainArray[i];
                // set the size if not the last one
                if (i != mainArray.length - 1) {
                    previousTile.split(2);
                    topTile.tiles[i].relativeGeometry.height = 1/mainArray.length;
                    this.nodeMap.set(container, topTile.tiles[i]);
                    previousTile = topTile.tiles[i+1];
                } else {
                    this.nodeMap.set(container, previousTile);
                }
            }
        } else {
            rootTile.split(1);
            let leftTile = rootTile.tiles[0];
            let rightTile = rootTile.tiles[1];
            let topLeftTile = leftTile;
            let topRightTile = rightTile;
            leftTile.relativeGeometry.width = this.middleSplit;
            rightTile.relativeGeometry.width = 1 - this.middleSplit;
            
            for (let i = 0; i < this.left.length; i += 1) {
                let container = this.left[i];
                // set the size if not the last one
                if (i != this.left.length - 1) {
                    leftTile.split(2);
                    topLeftTile.tiles[i].relativeGeometry.height = 1/this.left.length;
                    this.nodeMap.set(container, topLeftTile.tiles[i]);
                    leftTile = topLeftTile.tiles[i+1];
                } else {
                    this.nodeMap.set(container, leftTile);
                }
            }
            for (let i = 0; i < this.right.length; i += 1) {
                let container = this.right[i];
                // set the size if not the last one
                if (i != this.right.length - 1) {
                    rightTile.split(2);
                    topRightTile.tiles[i].relativeGeometry.height = 1/this.right.length;
                    this.nodeMap.set(container, topRightTile.tiles[i]);
                    rightTile = topRightTile.tiles[i+1];
                } else {
                    this.nodeMap.set(container, rightTile);
                }
            }
        }
        return true;
    }
    
    updateTiles(rootTile: KWin.RootTile): boolean {
        if (this.left.length != 0 && this.right.length != 0) {
            this.middleSplit = rootTile.tiles[0].relativeGeometry.width;
        }
        return true;
    }
    
    resizeTile(_tile: KWin.Tile, direction: Engine.Direction, amount: number): boolean {
        // only resize left/right
        if (direction.primary) return false;
        if (direction.right) {
            this.middleSplit += amount;
        } else {
            this.middleSplit -= amount;
        }
        if (this.middleSplit > 0.89) {
            this.middleSplit -= amount;
        } else if (this.middleSplit < 0.11) {
            this.middleSplit += amount;
        }
        print(this.middleSplit);
        return true;
    }
    
    placeClients(): Array<[KWin.AbstractClient, KWin.Tile]> {
        let ret: Array<[KWin.AbstractClient, KWin.Tile]> = new Array;
        for (const container of this.left) {
            const tile = this.nodeMap.get(container);
            if (tile == undefined) {
                printDebug("No tile found for container", true);
                return ret;
            }
            ret.push([container.client, tile]);
        }
        for (const container of this.right) {
            const tile = this.nodeMap.get(container);
            if (tile == undefined) {
                printDebug("No tile found for container", true);
                return ret;
            }
            ret.push([container.client, tile]);
        }
        return ret;
    }
    
    addClient(client: KWin.AbstractClient): boolean {
        if (this.left.length == 0) {
            this.left.push(new Container(client));
        } else {
            this.right.push(new Container(client));
        }
        return true;
    }
    
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile, direction?: Engine.Direction): boolean {
        const container = this.nodeMap.inverse.get(tile);
        if (container == undefined) {
            printDebug("No container found for tile", true);
            return false;
        }
        let array;
        let otherArray;
        let newContainer = new Container(client);
        if (this.right.includes(container)) {
            array = this.right;
            otherArray = this.left;
        } else {
            array = this.left;
            otherArray = this.right;
        }
        // if one of the arrays is empty, push to it instead
        if (otherArray.length != 0) {
            if (direction == undefined) {
                array.splice(array.indexOf(container), 0, newContainer);
            } else {
                if (direction.above) {
                    array.splice(array.indexOf(container), 0, newContainer);
                } else {
                    array.splice(array.indexOf(container) + 1, 0, newContainer);
                }
            }
        } else {
            otherArray.push(newContainer);
        }
        return true;
    }
    
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean {
        const containerA = this.nodeMap.inverse.get(tileA);
        const containerB = this.nodeMap.inverse.get(tileB);
        if (containerA == null || containerB == null) {
            printDebug("No container found for tile", true);
            return false;
        }
        const tmpclient = containerA.client;
        containerA.client = containerB.client;
        containerB.client = tmpclient;
        return true;
    }
    
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null {
        const container = this.nodeMap.inverse.get(tile);
        if (container == undefined) {
            printDebug("No container found for tile", true);
            return null;
        }
        return container.client;
    }
    
    removeClient(client: KWin.AbstractClient): boolean {
        for (let i = 0; i < this.left.length; i += 1) {
            if (this.left[i].client == client) {
                this.left.splice(i, 1);
                // if no left, shift first on right to left
                if (this.left.length == 0 && this.right.length != 0) {
                    const container = this.right[0];
                    this.left.push(container);
                    this.right.splice(0, 1);
                }
                return true;
            }
        }
        for (let i = 0; i < this.right.length; i += 1) {
            if (this.right[i].client == client) {
                this.right.splice(i, 1);
                // if more than one left, move last one to right
                if (this.right.length == 0 && this.left.length > 1) {
                    const container = this.left[this.left.length - 1];
                    this.right.push(container);
                    this.left.splice(this.left.length - 1, 1);
                }
                return true;
            }
        }
        printDebug("Client not found", true);
        return false;
    }
}
