// driver.ts - Interface from drivers/engines to the controller

import { TilingDriver } from "./driver";
import { EngineConfig, TilingEngineFactory } from "../engine";
import { Window, Tile, QTimer } from "kwin-api";
import { Direction } from "../util/geometry";

import { Controller } from "../controller";
import { Log } from "../util/log";
import { Config, Borders } from "../util/config";
import { Desktop } from "../controller/desktop";

export class DriverManager {
    private drivers: Map<string, TilingDriver> = new Map();
    private engineFactory: TilingEngineFactory;
    private rootTileCallbacks: Map<Tile, QTimer> = new Map();
    private logger: Log;
    private config: Config;
    
    buildingLayout: boolean = false;

    constructor(c: Controller) {
        this.ctrl = c;
        this.engineFactory = new TilingEngineFactory(this.ctrl.config);
    }

    private getDriver(desktop: Desktop): TilingDriver {
        const desktopString = desktop.toString();
        if (!this.drivers.has(desktopString)) {
            this.ctrl.logger.debug("Creating new engine for desktop", desktopString);
            let engineType = this.config.engineType;
            const engine = this.engineFactory.newEngine(engineType);
            const driver = new TilingDriver(engine, engineType, this);
            this.drivers.set(desktopString, driver);
            this.ctrl.dbusController.getSettings(
                desktopString,
                this.setEngineConfig.bind(this, desktop),
            );
        }
        return this.drivers.get(desktopString)!;
    }

    private layoutModified(tile: RootTile): void {
        if (this.buildingLayout) {
            return;
        }
        const timer = this.rootTileCallbacks.get(tile);
        if (timer == undefined) {
            Log.error(
                "Callback not registered for root tile",
                tile.absoluteGeometry,
            );
            return;
        }
        timer.restart();
    }

    private layoutModifiedCallback(tile: RootTile, scr: number): void {
        Log.debug("Layout modified for tile", tile.absoluteGeometry);
        const desktop = new Desktop({
            screen: scr,
            activity: this.ctrl.workspace.currentActivity,
            desktop: this.ctrl.workspace.currentDesktop,
        });
        const driver = this.getDriver(desktop);
        driver.regenerateLayout(tile);
    }

    hookRootTiles(): void {
        for (let i = 0; i < this.ctrl.workspace.numScreens; i += 1) {
            const rootTile = this.ctrl.workspace.tilingForScreen(i).rootTile;
            if (rootTile.managed) {
                continue;
            }
            rootTile.managed = true;
            const timer = this.ctrl.qmlObjects.root.createTimer();
            timer.interval = Config.timerDelay;
            timer.triggered.connect(
                this.layoutModifiedCallback.bind(this, rootTile, i),
            );
            timer.repeat = false;
            this.rootTileCallbacks.set(rootTile, timer);
            rootTile.layoutModified.connect(
                this.layoutModified.bind(this, rootTile),
            );
        }
    }

    private applyTiled(client: Client) {
        client.isTiled = true;
        if (Config.keepTiledBelow) {
            client.keepBelow = true;
        }
        if (
            Config.borders == Borders.NoTiled ||
            Config.borders == Borders.Selected
        ) {
            client.noBorder = true;
        }
    }

    rebuildLayout(scr?: number): void {
        this.buildingLayout = true;
        let desktops: Desktop[];
        if (scr == undefined) {
            desktops = Desktop.currentScreens(this.ctrl);
        } else {
            desktops = [
                new Desktop({
                    screen: scr,
                    activity: this.ctrl.workspace.currentActivity,
                    desktop: this.ctrl.workspace.currentDesktop,
                }),
            ];
        }
        Log.debug("Rebuilding layout for desktops", desktops);
        for (const desktop of desktops) {
            const driver = this.getDriver(desktop);
            driver.buildLayout(
                this.ctrl.workspace.tilingForScreen(desktop.screen).rootTile,
            );
            // untile clients that the driver wants untiled
            for (const client of driver.untiledClients) {
                this.removeClient(client);
            }
        }
        this.buildingLayout = false;
    }

    addClient(client: Client, desktops?: Desktop[]): void {
        if (desktops == undefined) {
            desktops = Desktop.fromClient(client);
        }
        Log.debug(
            "Adding client",
            client.resourceClass,
            "to desktops",
            desktops,
        );
        for (const desktop of desktops) {
            const driver = this.getDriver(desktop);
            driver.addClient(client);
        }
        this.applyTiled(client);
    }

    removeClient(client: Client, desktops?: Desktop[]): void {
        if (desktops == undefined) {
            desktops = Desktop.fromClient(client);
        }
        Log.debug(
            "Removing client",
            client.resourceClass,
            "from desktops",
            desktops,
        );
        for (const desktop of desktops) {
            const driver = this.getDriver(desktop);
            driver.removeClient(client);
        }
        client.isTiled = false;
        if (Config.keepTiledBelow) {
            client.keepBelow = false;
        }
        if (
            Config.borders == Borders.NoTiled ||
            Config.borders == Borders.Selected
        ) {
            client.noBorder = false;
        }
    }

    putClientInTile(client: Client, tile: Tile, direction?: Direction) {
        const desktop = new Desktop({
            screen: client.screen,
            activity: this.ctrl.workspace.currentActivity,
            desktop: this.ctrl.workspace.currentDesktop,
        });
        Log.debug(
            "Putting client",
            client.resourceClass,
            "in tile",
            tile.absoluteGeometry,
            "with direction",
            direction,
            "on desktop",
            desktop,
        );
        const driver = this.getDriver(desktop);
        driver.putClientInTile(client, tile, direction);
        this.applyTiled(client);
    }

    getEngineConfig(desktop: Desktop): IEngineConfig {
        Log.debug("Getting engine config for desktop", desktop);
        const config = this.getDriver(desktop).engine.config;
        return this.getDriver(desktop).engine.config;
    }

    setEngineConfig(desktop: Desktop, config: IEngineConfig) {
        Log.debug("Setting engine config for desktop", desktop);
        const driver = this.getDriver(desktop);
        if (config.engine != driver.engine.config.engine) {
            driver.switchEngine(
                this.engineFactory.newEngine(config.engine, config),
                config.engine,
            );
        } else {
            driver.engine.config = new EngineConfig(config);
        }
        this.ctrl.dbusController.setSettings(desktop.toString(), config);
        this.rebuildLayout(desktop.screen);
    }
}
