// engines.ts - Interface from engines to the controller and a few helper classes for engines

import { Client, LayoutDirection } from "extern/kwin";
import GlobalConfig from "util/config";
import Desktop from "common/desktop";
import Controller from "controller";



export abstract class TilingEngine
{
    rootTile: RootTile = new RootTile(LayoutDirection.Horizontal);
    config: EngineConfig;
    ctrl: Controller;
    
    constructor(ctrl: Controller)
    {
        this.ctrl = ctrl;
        this.config = new EngineConfig(ctrl.config);
    }
}

export class Tile
{
    parent: Tile | null;
    tiles: Tile[] = [];
    layoutDirection: LayoutDirection;
    // requested size in pixels, may not be honored
    requestedSize: number | null = null;
    
    constructor(parent?: Tile)
    {
        this.parent = parent ?? null;
        if (!this.parent) 
        {
            return;
        }
        this.parent.tiles.push(this);
    }
}

export class RootTile extends Tile
{
    parent: null = null;
    constructor(layoutDirection: LayoutDirection)
    {
        super();
    }
}
