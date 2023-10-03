// driver.ts - Interface from drivers/engines to the controller

import { Workspace } from "common";
import { TilingDriver } from "driver/driver";

export interface IDesktop
{
    screen: number;
    activity: string;
    desktop: number;
}

export class Desktop implements IDesktop
{
    screen: number;
    activity: string;
    desktop: number;
    toString(): string
    {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
    constructor(d?: IDesktop)
    {
        if (d === undefined)
        {
            this.screen = Workspace.activeScreen;
            this.activity = Workspace.currentActivity;
            this.desktop = Workspace.currentDesktop;
        }
        else
        {
            this.screen = d.screen;
            this.activity = d.activity;
            this.desktop = d.desktop;
        }
    }
}

export class DriverManager
{
    drivers: Map<string, TilingDriver>;
    
    
}
