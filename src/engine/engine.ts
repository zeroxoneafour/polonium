// engine.ts - Exposes things that the layouts need

import { Direction, GSize } from "../util/geometry";
import { InsertionPoint } from "../util/config";
import { LayoutDirection, Output } from "kwin-api";
import { QRect, QSize } from "kwin-api/qt";
import {
    Client as IClient,
    Tile as ITile,
    TilingEngine as ITilingEngine,
} from "./index";

export interface EngineConfig {
    insertionPoint: InsertionPoint;
    rotateLayout: boolean;
}

export const enum EngineCapability {
    None = 0,
    // whether the driver should translate the rotation for the engine when inserting clients
    TranslateRotation = 1,
    // whether the amount of tiles can be changed
    TilesMutable = 2,
    // whether tiles should be untiled or not by default when added
    UntiledByDefault = 4,
}

export interface Client {
    name: string;
    minSize: QSize;
}

export class Tile implements ITile {
    parent: ITile | null;
    tiles: ITile[] = [];
    layoutDirection: LayoutDirection = LayoutDirection.Horizontal;
    // requested size in pixels, may not be honored
    requestedSize: QSize = new GSize();
    // requested relative size to screen, more likely to be honored
    requestedRelativeSize: QSize = new GSize();
    clients: IClient[] = [];

    // getter/setter for backwards compatibility

    public get client(): Client | null {
        return this.clients.length > 0 ? this.clients[0] : null;
    }
    public set client(value: Client | null) {
        if (value != null) {
            this.clients[0] = value;
        } else {
            this.clients = [];
        }
    }

    constructor(parent?: Tile) {
        this.parent = parent ?? null;
        if (this.parent) {
            this.parent.tiles.push(this);
        }
    }

    // adds a child that will split perpendicularly to the parent. Returns the child
    addChild(): Tile {
        let splitDirection: LayoutDirection = 1;
        if (this.layoutDirection == 1) {
            splitDirection = 2;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
        return childTile;
    }

    // adds a child that will split parallel to the parent. Not really recommeneded
    addChildParallel(): Tile {
        const childTile = new Tile(this);
        childTile.layoutDirection = this.layoutDirection;
        return childTile;
    }

    // split a tile perpendicularly
    split(): void {
        this.addChild();
        this.addChild();
    }

    // have a tile replace its parent, destroying its siblings
    secede(): void {
        const parent = this.parent;
        // cant secede as root
        if (parent == null) {
            return;
        }
        this.parent = parent.parent;
        if (this.parent != null) {
            this.parent.tiles[this.parent.tiles.indexOf(parent)] = this;
            for (const tile of parent.tiles) {
                if (tile != this) {
                    tile.remove(true);
                }
            }
            parent.tiles = [];
            parent.client = null;
        } else {
            // special case for roottile because it cant be destroyed
            parent.client = this.client;
            parent.tiles = this.tiles;
            this.tiles = [];
            this.client = null;
        }
    }

    // removes a tile and all its children
    remove(batchRemove: boolean = false): void {
        const parent = this.parent;
        if (parent == null) {
            return;
        }
        if (!batchRemove) {
            parent.tiles.splice(parent.tiles.indexOf(this), 1);
        }
        this.tiles = [];
        this.client = null;
    }

    // remove child tiles
    removeChildren(): void {
        for (const tile of this.tiles) {
            tile.remove(true);
        }
        this.tiles = [];
    }
}

export abstract class TilingEngine implements ITilingEngine {
    rootTile: ITile = new Tile();
    config: EngineConfig;
    abstract readonly engineCapability: EngineCapability;

    public constructor(config: EngineConfig) {
        this.config = config;
    }

    // overrideable method if more internal engine stuff needs to be constructed
    public initEngine(): void {}

    // creates the root tile layout
    public abstract buildLayout(): void;
    // adds a new client to the engine
    public abstract addClient(c: Client): void;
    // removes a client
    public abstract removeClient(c: Client): void;
    // places a client in a specific tile, in the direction d
    public abstract putClientInTile(c: Client, t: Tile, d?: Direction): void;
    // called after subtiles are edited (ex. sizes) so the engine can update them internally if needed
    public abstract regenerateLayout(): void;
}
