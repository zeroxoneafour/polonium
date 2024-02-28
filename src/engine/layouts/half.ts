// half.ts - Tiling engine for the half/split layout

import { Tile, Client, TilingEngine, EngineCapability } from "../engine";
import { Direction } from "../../util/geometry";
import { InsertionPoint } from "../../util/config";
import { GSize } from "../../util/geometry";

class ClientBox {
    client: Client;
    size: GSize = new GSize();

    constructor(client: Client) {
        this.client = client;
    }
}

class BoxIndex {
    index: number;
    left: boolean = false;
    right: boolean = false;
    box: ClientBox;

    constructor(engine: HalfEngine, client: Client) {
        for (let i = 0; i < engine.left.length; i += 1) {
            if (engine.left[i].client == client) {
                this.index = i;
                this.left = true;
                this.box = engine.left[i];
                return;
            }
        }
        for (let i = 0; i < engine.right.length; i += 1) {
            if (engine.right[i].client == client) {
                this.index = i;
                this.right = true;
                this.box = engine.right[i];
                return;
            }
        }
        throw new Error("Couldn't find box");
    }
}

export default class HalfEngine extends TilingEngine {
    engineCapability = EngineCapability.TranslateRotation;
    tileMap: Map<Tile, ClientBox> = new Map();
    left: ClientBox[] = [];
    right: ClientBox[] = [];

    buildLayout() {
        // set original tile direction based on rotating layout or not
        this.rootTile = new Tile();
        this.rootTile.layoutDirection = this.config.rotateLayout ? 2 : 1;
        if (this.left.length == 0 && this.right.length == 0) {
            // empty root tile
            return;
        } else if (this.left.length == 0 && this.right.length > 0) {
            for (const box of this.right) {
                const tile = this.rootTile.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
                this.tileMap.set(tile, box);
            }
        } else if (this.left.length > 0 && this.right.length == 0) {
            for (const box of this.left) {
                const tile = this.rootTile.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
                this.tileMap.set(tile, box);
            }
        } else {
            this.rootTile.split();
            const left = this.rootTile.tiles[0];
            const right = this.rootTile.tiles[1];

            for (const box of this.left) {
                const tile = left.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
                this.tileMap.set(tile, box);
            }
            for (const box of this.right) {
                const tile = right.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
                this.tileMap.set(tile, box);
            }
        }
    }

    addClient(client: Client) {
        if (this.config.insertionPoint == InsertionPoint.Left) {
            if (this.right.length == 0) {
                this.right.push(new ClientBox(client));
            } else {
                this.left.push(new ClientBox(client));
            }
        } else {
            if (this.left.length == 0) {
                this.left.push(new ClientBox(client));
            } else {
                this.right.push(new ClientBox(client));
            }
        }
    }

    removeClient(client: Client) {
        let box: BoxIndex;
        try {
            box = new BoxIndex(this, client);
        } catch (e) {
            throw e;
        }
        if (box.right) {
            this.right.splice(box.index, 1);
            if (this.right.length == 0 && this.left.length > 1) {
                this.right.push(this.left.splice(0, 1)[0]);
            }
        } else {
            this.left.splice(box.index, 1);
            if (this.left.length == 0 && this.right.length > 1) {
                this.left.push(this.right.splice(0, 1)[0]);
            }
        }
    }

    putClientInTile(client: Client, tile: Tile, direction?: Direction) {
        const clientBox = new ClientBox(client);
        let targetBox: BoxIndex;
        try {
            const box = this.tileMap.get(tile);
            if (box == undefined) {
                throw new Error("Box not found for tile");
            }
            targetBox = new BoxIndex(this, box.client);
        } catch (e) {
            throw e;
        }

        const targetArr = targetBox.left ? this.left : this.right;
        if (direction == null || direction & Direction.Up) {
            targetArr.splice(targetBox.index, 0, clientBox);
        } else {
            targetArr.splice(targetBox.index + 1, 0, clientBox);
        }
    }

    regenerateLayout() {
        for (const tile of this.tileMap.keys()) {
            if (tile.requestedSize == null) {
                continue;
            }
            this.tileMap.get(tile)!.size = new GSize(tile.requestedSize);
        }
    }
}
