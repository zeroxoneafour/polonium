// engines.ts - Interface from engines to the controller and a few helper classes for engines

import { Client, LayoutDirection, Workspace } from "extern/kwin";
import Controller from "controller";

export interface IDesktop
{
    screen: number;
    activity: string;
    desktop: number;
}

export class Desktop implements IDesktop
{
    private static ctrl: Controller;
    static initStatic(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
    screen: number;
    activity: string;
    desktop: number;
    toString(): string
    {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
    constructor(d?: IDesktop)
    {
        let workspace = Desktop.ctrl.workspace;
        if (d === undefined)
        {
            this.screen = workspace.activeScreen;
            this.activity = workspace.currentActivity;
            this.desktop = workspace.currentDesktop;
        }
        else
        {
            this.screen = d.screen;
            this.activity = d.activity;
            this.desktop = d.desktop;
        }
    }
}

export interface IEngineConfig
{
    
}

export class EngineConfig implements IEngineConfig
{
    private static ctrl: Controller;
    static initStatic(ctrl: Controller)
    {
        this.ctrl = ctrl;
    }
}

export abstract class TilingEngine
{
    rootTile: RootTile = new RootTile(LayoutDirection.Horizontal);
    config: EngineConfig;
    
    constructor()
    {
        this.config = new EngineConfig();
    }
}

export interface ITile
{
    parent: Tile | null;
    tiles: Tile[];
    layoutDirection: LayoutDirection;
}

export class Tile implements ITile
{
    parent: Tile | null;
    tiles: Tile[] = [];
    layoutDirection: LayoutDirection = LayoutDirection.Horizontal;
    // requested size in pixels, may not be honored
    requestedSize: number | null = null;
    
    constructor(parent?: Tile)
    {
        this.parent = parent ?? null;
        if (!this.parent) 
        {
            return;
        }
        if (this.parent.layoutDirection === LayoutDirection.Horizontal)
        {
            this.layoutDirection = LayoutDirection.Vertical;
        }
        else
        {
            this.layoutDirection = LayoutDirection.Horizontal;
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
        this.layoutDirection = layoutDirection;
    }
}
