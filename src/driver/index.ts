// driver.ts - Interface from drivers/engines to the controller

import { Workspace } from "../common";
import { TilingDriver } from "./driver";
import { TilingEngineFactory, EngineType } from "../engines";
import { Client, RootTile } from "../extern/kwin";

import Log from "../util/log";
import Config from "../util/config";

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
    
    static fromClient(client: Client): Desktop[]
    {
        let ret = [];
        for (const activity in client.activities)
        {
            ret.push(new Desktop({
                screen: client.screen,
                activity: activity,
                desktop: client.desktop,
            }));
        }
        return ret;
    }
    
    static currentScreens(): Desktop[]
    {
        let ret = [];
        for (let i = 0; i < Workspace.numScreens; i += 1)
        {
            ret.push(new Desktop({
                screen: i,
                activity: Workspace.currentActivity,
                desktop: Workspace.currentDesktop,
            }));
        }
        return ret;
    }
}

export class DriverManager
{
    private drivers: Map<string, TilingDriver> = new Map;
    private engineFactory: TilingEngineFactory = new TilingEngineFactory();
    
    private getDriver(desktop: Desktop): TilingDriver
    {
        const desktopString = desktop.toString();
        if (!this.drivers.has(desktopString))
        {
            const engineType = Config.engineType;
            const engine = this.engineFactory.newEngine(engineType);
            const driver = new TilingDriver(engine, engineType);
            this.drivers.set(desktopString, driver);
        }
        return this.drivers.get(desktopString)!;
    }
    
    rebuildLayout(scr?: number): void
    {
        let desktops: Desktop[];
        if (scr == undefined)
        {
            desktops = Desktop.currentScreens();
        }
        else
        {
            desktops = [new Desktop({
               screen: scr, 
               activity: Workspace.currentActivity, 
               desktop: Workspace.currentDesktop, 
            })];
        }
        for (const desktop of desktops)
        {
            const driver = this.getDriver(desktop);
            driver.buildLayout(Workspace.tilingForScreen(desktop.screen));
        }
    }
    addClient(client: Client, desktops?: Desktop[]): void
    {
        if (desktops == undefined)
        {
            desktops = Desktop.fromClient(client);
        }
        for (const desktop of desktops)
        {
            const driver = this.getDriver(desktop);
            driver.addClient(client);
        }
    }
    removeClient(client: Client, desktops?: Desktop[]): void
    {
        if (desktops == undefined)
        {
            desktops = Desktop.fromClient(client);
        }
        for (const desktop of desktops)
        {
            const driver = this.getDriver(desktop);
            driver.removeClient(client);
        }
    }
}
