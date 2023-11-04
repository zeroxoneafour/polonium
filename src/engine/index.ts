// engines/index.ts - Common classes and structures used by the engines

import { QSize } from "../extern/qt";
import Config, { InsertionPoint } from "../util/config";
import { Direction } from "../util/geometry";
import { LayoutDirection, Client as KwinClient } from "../extern/kwin";
import { EngineType } from "./factory";

export interface IEngineConfig
{
    engine: EngineType;
    insertionPoint: InsertionPoint;
    rotateLayout: boolean;
}

export class EngineConfig implements IEngineConfig
{
    engine: EngineType = Config.engineType;
    insertionPoint = Config.insertionPoint;
    rotateLayout: boolean = Config.rotateLayout;
    
    constructor(conf?: IEngineConfig)
    {
        if (conf == undefined)
        {
            return;
        }
        this.insertionPoint = conf.insertionPoint;
        this.engine = conf.engine;
        this.rotateLayout = conf.rotateLayout;
    }
    
    toString(): string
    {
        return JSON.stringify(this);
    }
}

export class Client
{
    name: string;
    minSize: QSize;
    
    constructor(client: KwinClient)
    {
        this.name = client.resourceClass;
        this.minSize = client.minSize;
    }
}

export class Tile
{
    parent: Tile | null;
    tiles: Tile[] = [];
    layoutDirection: LayoutDirection = 1;
    // requested size in pixels, may not be honored
    requestedSize: QSize | null = null;
    client: Client | null = null;
    
    constructor(parent?: Tile)
    {
        this.parent = parent ?? null;
        if (!this.parent) 
        {
            return;
        }
        this.parent.tiles.push(this);
    }
        
    // adds a child that will split perpendicularly to the parent. Returns the child
    addChild(): Tile
    {
        let splitDirection: LayoutDirection = 1;
        if (this.layoutDirection == 1)
        {
            splitDirection = 2;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
        return childTile;
    }
    
    // adds a child that will split parallel to the parent. Not really recommeneded
    addChildParallel(): Tile
    {
        const childTile = new Tile(this);
        childTile.layoutDirection = this.layoutDirection;
        return childTile;
    }
    
    // split a tile perpendicularly
    split(): void
    {
        this.addChild();
        this.addChild();
    }
    
    // have a tile replace its parent, destroying its siblings
    secede(): void
    {
        const parent = this.parent;
        // cant secede as root
        if (parent == null)
        {
            return;
        }
        this.parent = parent.parent;
        if (this.parent != null)
        {
            this.parent.tiles[this.parent.tiles.indexOf(parent)] = this;
            for (const tile of parent.tiles)
            {
                if (tile != this)
                {
                    tile.remove(true);
                }
            }
            parent.tiles = [];
            parent.client = null;
        }
        else
        {
            // special case for roottile because it cant be destroyed
            parent.client = this.client;
            parent.tiles = this.tiles;
            this.tiles = [];
            this.client = null;
        }
    }
    
    // removes a tile and all its children
    remove(batchRemove: boolean = false): void
    {
        const parent = this.parent;
        if (parent == null)
        {
            return;
        }
        if (!batchRemove)
        {
            parent.tiles.splice(parent.tiles.indexOf(this), 1);
        }
        this.tiles = [];
        this.client = null;
    }
    
    // remove child tiles
    removeChildren(): void
    {
        for (const tile of this.tiles)
        {
            tile.remove(true);
        }
        this.tiles = [];
    }
}

export class RootTile extends Tile
{
    parent: null = null;
    constructor(layoutDirection: LayoutDirection)
    {
        super();
        this.layoutDirection = layoutDirection;
    }
}

export abstract class TilingEngine
{
    rootTile: RootTile = new RootTile(1);
    config: EngineConfig;
    
    constructor(config?: IEngineConfig)
    {
        this.config = new EngineConfig(config);
    }
    
    // creates the root tile layout
    abstract buildLayout(): void;
    // adds a new client to the engine
    abstract addClient(c: Client): void;
    // removes a client
    abstract removeClient(c: Client): void;
    // places a client in a specific tile, in the direction d
    abstract putClientInTile(c: Client, t: Tile, d?: Direction): void;
    // called after subtiles are edited (ex. sizes) so the engine can update them internally if needed
    abstract regenerateLayout(): void;
}
