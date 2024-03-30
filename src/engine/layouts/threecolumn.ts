// threecolumn.ts - Layout engine that splits 3 columns

// half.ts - Tiling engine for the half/split layout

import {
    Tile,
    Client,
    TilingEngine,
    EngineCapability,
    EngineSettings,
} from "../engine";
import { Direction } from "../../util/geometry";
import { InsertionPoint } from "../../util/config";
import { LayoutDirection } from "kwin-api";

class ClientBox {
    client: Client;

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

interface ThreeColumnEngineSettings extends EngineSettings {
    leftSize: number;
    rightSize: number;
}

export default class ThreeColumnEngine extends TilingEngine {
    engineCapability = EngineCapability.TranslateRotation;
    tileMap: Map<Tile, ClientBox> = new Map();
    rows: ClientBox[][] = [[], [], []];
    leftSize: number = 0.25;
    rightSize: number = 0.25;

    get engineSettings(): ThreeColumnEngineSettings {
        return {
            leftSize: this.leftSize,
            rightSize: this.rightSize,
        };
    }

    set engineSettings(settings: ThreeColumnEngineSettings) {
        this.leftSize = settings.leftSize ?? 0.25;
        this.rightSize = settings.rightSize ?? 0.25;
    }

    buildLayout() {
        // set original tile direction based on rotating layout or not
        this.rootTile = new Tile();
        this.rootTile.layoutDirection = this.config.rotateLayout ? 2 : 1;
        for (let i = 0; i < this.rows.length; i += 1) {
            const row = this.rows[i];
            if (row.length == 0) {
                continue;
            }
            const rowRoot = this.rootTile.addChild();
            for (const box of row) {
                const tile = rowRoot.addChild();
                tile.client = box.client;
                this.tileMap.set(tile, box);
            }
        }
        if (this.rows[0].length > 0) {
            this.rootTile.tiles[0].relativeSize = this.leftSize;
        }
        if (this.rows[2].length > 0) {
            this.rootTile.tiles[this.rootTile.tiles.length - 1].relativeSize =
                this.rightSize;
        }
        let middleSize = 1;
        if (this.rows[2].length != 0) {
            middleSize -= this.rightSize;
        }
        if (this.rows[0].length != 0) {
            middleSize -= this.leftSize;
            this.rootTile.tiles[1].relativeSize = middleSize;
        } else {
            this.rootTile.tiles[0].relativeSize = middleSize;
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

    regenerateLayout(): void {
        // only one column on the screen
        if (
            this.rootTile.tiles.length < 2 ||
            this.rootTile.layoutDirection == LayoutDirection.Vertical
        ) {
            return;
        }
        // assuming the middle row always has at least one client
        if (this.rootTile.tiles.length == 2) {
            if (this.rows[0].length == 0) {
                // no left clients
                this.rightSize = this.rootTile.tiles[1].relativeSize;
            } else if (this.rows[2].length == 0) {
                this.leftSize = this.rootTile.tiles[0].relativeSize;
            }
        } else if (this.rootTile.tiles.length == 3) {
            this.rightSize = this.rootTile.tiles[2].relativeSize;
            this.leftSize = this.rootTile.tiles[0].relativeSize;
        }
    }
}
