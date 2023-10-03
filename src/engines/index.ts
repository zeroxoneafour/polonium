// engines/common.ts - Common classes and structures used by the engines

import { LayoutDirection, Client as KwinClient } from "extern/kwin";
import { QSize } from "extern/qt";

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
    layoutDirection: LayoutDirection = LayoutDirection.Horizontal;
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
    
    // adds a tile that will split perpendicularly to the parent
    addPerpendicular(): void
    {
        let splitDirection = LayoutDirection.Horizontal;
        if (this.layoutDirection == LayoutDirection.Horizontal)
        {
            splitDirection = LayoutDirection.Vertical;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
    }
    
    // adds a child that will split parallel to the parent. Not as useful
    addParallel(): void
    {
        const childTile = new Tile(this);
        childTile.layoutDirection = this.layoutDirection;
    }
    
    // split a tile perpendicularly
    split(): void
    {
        this.addPerpendicular();
        this.addPerpendicular();
    }
    
    // becomes one of its children, destroying it and other children it has. tile is assumed to be a child of the method caller
    consume(child: Tile): void
    {
        const tiles = child.tiles;
        for (const tile of this.tiles)
        {
            tile.remove();
        }
        this.tiles = tiles;
    }
    
    // removes a tile and all its children
    remove(): void
    {
        const parent = this.parent;
        if (parent == null)
        {
            return;
        }
        parent.tiles.splice(parent.tiles.indexOf(this), 1);
        this.tiles = [];
        this.client = null;
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

export interface ITilingEngine
{
    rootTile: RootTile;
    config: EngineConfig;
    
    addClient(c: Client): void;
    removeClient(c: Client): void;
}

export abstract class TilingEngine implements ITilingEngine
{
    rootTile: RootTile = new RootTile(LayoutDirection.Horizontal);
    
    config: EngineConfig;
    
    constructor()
    {
        this.config = new EngineConfig();
    }
    
    abstract addClient(c: Client): void;
    abstract removeClient(c: Client): void;
}
