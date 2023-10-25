// driver.ts - Interface from drivers/engines to the controller

import { TilingDriver } from "./driver";
import { TilingEngineFactory, EngineType } from "../engine/factory";
import { Direction, IEngineConfig, EngineConfig } from "../engine";
import { Client, Tile, RootTile } from "../extern/kwin";
import { QTimer } from "../extern/qt";

import { Controller } from "../controller";
import Log from "../util/log";
import Config, { Borders } from "../util/config";

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
    constructor(d: IDesktop)
    {
        this.screen = d.screen;
        this.activity = d.activity;
        this.desktop = d.desktop;
    }
    
    static fromClient(client: Client): Desktop[]
    {
        let ret = [];
        for (const activity of client.activities)
        {
            ret.push(new Desktop({
                screen: client.screen,
                activity: activity,
                desktop: client.desktop,
            }));
        }
        return ret;
    }
    
    static currentScreens(c: Controller): Desktop[]
    {
        let ret = [];
        for (let i = 0; i < c.workspace.numScreens; i += 1)
        {
            ret.push(new Desktop({
                screen: i,
                activity: c.workspace.currentActivity,
                desktop: c.workspace.currentDesktop,
            }));
        }
        return ret;
    }
}

export class DriverManager
{
    private drivers: Map<string, TilingDriver> = new Map;
    private engineFactory: TilingEngineFactory = new TilingEngineFactory();
    private rootTileCallbacks: Map<RootTile, QTimer> = new Map;
    
    ctrl: Controller;
    buildingLayout: boolean = false;
    
    constructor(c: Controller)
    {
        this.ctrl = c;
    }
    
    private getDriver(desktop: Desktop): TilingDriver
    {
        const desktopString = desktop.toString();
        if (!this.drivers.has(desktopString))
        {
            const engineType = Config.engineType;
            const engine = this.engineFactory.newEngine(engineType);
            const driver = new TilingDriver(engine, engineType, this);
            this.drivers.set(desktopString, driver);
        }
        return this.drivers.get(desktopString)!;
    }
    
    private layoutModified(tile: RootTile): void
    {
        if (this.buildingLayout)
        {
            return;
        }
        const timer = this.rootTileCallbacks.get(tile);
        if (timer == undefined)
        {
            Log.error("Callback not registered for root tile", tile.absoluteGeometry);
            return;
        }
        timer.restart();
    }
    
    private layoutModifiedCallback(tile: RootTile, scr: number): void
    {
        Log.debug("Layout modified for tile", tile.absoluteGeometry);
        const desktop = new Desktop(
        {
            screen: scr,
            activity: this.ctrl.workspace.currentActivity,
            desktop: this.ctrl.workspace.currentDesktop,
        });
        const driver = this.getDriver(desktop);
        driver.regenerateLayout(tile);
    }
    
    hookRootTiles(): void
    {
        for (let i = 0; i < this.ctrl.workspace.numScreens; i += 1)
        {
            const rootTile = this.ctrl.workspace.tilingForScreen(i).rootTile;
            if (rootTile.managed)
            {
                continue;
            }
            rootTile.managed = true;
            const timer = this.ctrl.qmlObjects.root.createTimer();
            timer.interval = Config.timerDelay;
            timer.triggered.connect(this.layoutModifiedCallback.bind(this, rootTile, i));
            timer.repeat = false;
            this.rootTileCallbacks.set(rootTile, timer);
            rootTile.layoutModified.connect(this.layoutModified.bind(this, rootTile));
        }
    }
    
    private applyTiled(client: Client)
    {
        client.isTiled = true;
        if (Config.keepTiledBelow)
        {
            client.keepBelow = true;
        }
        if (Config.borders == Borders.NoTiled || Config.borders == Borders.Selected)
        {
            client.noBorder = true;
        }
    }
    
    rebuildLayout(scr?: number): void
    {
        this.buildingLayout = true;
        let desktops: Desktop[];
        if (scr == undefined)
        {
            desktops = Desktop.currentScreens(this.ctrl);
        }
        else
        {
            desktops = [new Desktop({
                screen: scr, 
                activity: this.ctrl.workspace.currentActivity, 
                desktop: this.ctrl.workspace.currentDesktop, 
            })];
        }
        for (const desktop of desktops)
        {
            const driver = this.getDriver(desktop);
            driver.buildLayout(this.ctrl.workspace.tilingForScreen(desktop.screen).rootTile);
        }
        this.buildingLayout = false;
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
        this.applyTiled(client);
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
        client.isTiled = false;
        if (Config.keepTiledBelow)
        {
            client.keepBelow = false;
        }
        if (Config.borders == Borders.NoTiled || Config.borders == Borders.Selected)
        {
            client.noBorder = false;
        }
    }
    
    putClientInTile(client: Client, tile: Tile, direction?: Direction)
    {
        const desktop = new Desktop(
        {
            screen: client.screen,
            activity: this.ctrl.workspace.currentActivity,
            desktop: this.ctrl.workspace.currentDesktop,
        });
        const driver = this.getDriver(desktop);
        driver.putClientInTile(client, tile, direction);
        this.applyTiled(client);
    }
    
    getEngineConfig(desktop: Desktop): IEngineConfig
    {
        return this.getDriver(desktop).engine.config;
    }
    
    setEngineConfig(config: IEngineConfig, desktop: Desktop)
    {
        Log.debug("Setting engine config for desktop", desktop);
        const driver = this.getDriver(desktop);
        if (config.engine != driver.engine.config.engine)
        {
            driver.switchEngine(this.engineFactory.newEngine(config.engine, config), config.engine);
        }
        else
        {
            driver.engine.config = new EngineConfig(config);
        }
        this.rebuildLayout(desktop.screen);
    }
}
