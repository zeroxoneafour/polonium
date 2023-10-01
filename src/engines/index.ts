// engines.ts - Interface from engines to the controller and a few helper classes for engines

import { Client, LayoutDirection } from "extern/kwin";
import { EngineConfig } from "util/config";
import { workspace } from "util/global";

export class Desktop {
    screen: number;
    activity: string;
    desktop: number;
    toString(): string {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
    constructor(screen?: number, activity?: string, desktop?: number) {
        if (screen == undefined || activity == undefined || desktop == undefined) {
            this.screen = workspace.activeScreen;
            this.activity = workspace.currentActivity;
            this.desktop = workspace.currentDesktop;
        } else {
            this.screen = screen;
            this.activity = activity;
            this.desktop = desktop;
        }
    }
}


export abstract class TilingEngine
{
    rootTile: RootTile = new RootTile(LayoutDirection.Horizontal);
    config: EngineConfig;
    constructor(desktop?: Desktop)
    {
        if (desktop !== undefined)
        {
            this.config = new EngineConfig(desktop.toString());
        }
        else
        {
            this.config = new EngineConfig();
        }
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
