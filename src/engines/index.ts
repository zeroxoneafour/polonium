// engines/index.ts - Common classes and structures used by the engines

// if you uncomment this it doesnt compile?!
import { QSize } from "../extern/qt";

import BTree from "./btree";

import { LayoutDirection, Client as KwinClient } from "../extern/kwin";

export interface IEngineConfig
{
    
}

export class EngineConfig implements IEngineConfig
{
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
    
    // adds a child that will split perpendicularly to the parent
    addChild(): void
    {
        let splitDirection: LayoutDirection = 1;
        if (this.layoutDirection == 1)
        {
            splitDirection = 2;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
    }
    
    // adds a child that will split parallel to the parent. Not really recommeneded
    addChildParallel(): void
    {
        const childTile = new Tile(this);
        childTile.layoutDirection = this.layoutDirection;
    }
    
    // split a tile perpendicularly
    split(): void
    {
        this.addChild();
        this.addChild();
    }
    
    // becomes one of its children, destroying it and other children it has. tile is assumed to be a child of the method caller
    consume(child: Tile): void
    {
        const tiles = child.tiles;
        this.removeChildren();
        this.tiles = tiles;
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
    
    constructor()
    {
        this.config = new EngineConfig();
    }
    
    abstract addClient(c: Client): void;
    abstract removeClient(c: Client): void;
}

export enum EngineType
{
    BTree = 0,
    _loop,
}

export class TilingEngineFactory
{
    newEngine(t: EngineType): TilingEngine
    {
        t %= EngineType._loop;
        return new BTree();
    }
}
