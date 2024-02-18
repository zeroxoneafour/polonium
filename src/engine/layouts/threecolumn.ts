// threecolumn.ts - Layout engine that splits 3 columns

// half.ts - Tiling engine for the half/split layout

import { Tile, RootTile, Client, TilingEngine, EngineCapability } from "../";
import { Direction } from "../../util/geometry";
import { InsertionPoint } from "../../util/config";
import { QSize } from "../../extern/qt";
import { GSize } from "../../util/geometry";

class ClientBox {
    client: Client;
    size: QSize | null = null;

    constructor(client: Client) {
        this.client = client;
    }
}

class BoxIndex {
    index: number;
    row: number;
    box: ClientBox;

    constructor(engine: ThreeColumnEngine, client: Client) {
        for (let i = 0; i < engine.rows.length; i += 1) {
            const row = engine.rows[i];
            for (let j = 0; j < row.length; j += 1) {
                if (row[j].client == client) {
                    this.index = j;
                    this.row = i;
                    this.box = row[j];
                    return;
                }
            }
        }
        throw new Error("Couldn't find box");
    }
}

export default class ThreeColumnEngine extends TilingEngine {
    engineCapability = EngineCapability.TranslateRotation;
    tileMap: Map<Tile, ClientBox> = new Map();
    rows: ClientBox[][] = [[], [], []];

    buildLayout() {
        // set original tile direction based on rotating layout or not
        this.rootTile = new RootTile(this.config.rotateLayout ? 2 : 1);
        for (const row of this.rows) {
            if (row.length == 0) {
                continue;
            }
            const rowRoot = this.rootTile.addChild();
            for (const box of row) {
                const tile = rowRoot.addChild();
                tile.client = box.client;
                tile.requestedSize = box.size;
                this.tileMap.set(tile, box);
            }
        }
    }

    addClient(client: Client) {
        if (this.rows[1].length == 0) {
            this.rows[1].push(new ClientBox(client));
            return;
        }
        if (this.config.insertionPoint == InsertionPoint.Left) {
            if (this.rows[0].length > this.rows[2].length) {
                this.rows[2].push(new ClientBox(client));
            } else {
                this.rows[0].push(new ClientBox(client));
            }
        } else {
            if (this.rows[2].length > this.rows[0].length) {
                this.rows[0].push(new ClientBox(client));
            } else {
                this.rows[2].push(new ClientBox(client));
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
        const row = this.rows[box.row];
        row.splice(box.index, 1);
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

        const targetArr = this.rows[targetBox.row];
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
