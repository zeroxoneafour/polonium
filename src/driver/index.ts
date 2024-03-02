// driver.ts - Interface from drivers/engines to the controller

import { TilingDriver } from "./driver";
import { EngineConfig, TilingEngineFactory } from "../engine";
import { Window, Tile, Output } from "kwin-api";
import { QTimer } from "kwin-api/qt";
import { Direction } from "../util/geometry";
import { Controller } from "../controller";
import { Log } from "../util/log";
import { Config, Borders } from "../util/config";
import { Desktop } from "../controller/desktop";

export class DriverManager {
    private drivers: Map<string, TilingDriver> = new Map();
    private engineFactory: TilingEngineFactory;
    private rootTileCallbacks: Map<Tile, QTimer> = new Map();

    private ctrl: Controller;
    private logger: Log;
    private config: Config;

    buildingLayout: boolean = false;

    constructor(c: Controller) {
        this.ctrl = c;
        this.engineFactory = new TilingEngineFactory(this.ctrl.config);
        this.logger = c.logger;
        this.config = c.config;
    }
    
    init(): void {
        const c = this.ctrl;
        c.workspace.screensChanged.connect(this.generateDrivers.bind(this));
        c.workspace.desktopsChanged.connect(this.generateDrivers.bind(this));
        c.workspace.activitiesChanged.connect(this.generateDrivers.bind(this));
        this.generateDrivers();
    }

    private generateDrivers(): void {
        // all drivers get pre generated now, no lazy loading
        // also handles driver regeneration on screen/layout changes
        const currentDesktops: string[] = [];
        for (const desktop of this.drivers.keys()) {
            currentDesktops.push(desktop);
        }
        for (const desktop of this.ctrl.desktopFactory.createAllDesktops()) {
            const desktopString = desktop.toString();
            const index = currentDesktops.indexOf(desktopString);
            if (index == -1) {
                // create new desktop
                this.logger.debug(
                    "Creating new engine for desktop",
                    desktopString,
                );
                let engineType = this.config.engineType;
                const config: EngineConfig = {
                    engineType: engineType,
                    insertionPoint: this.config.insertionPoint,
                    rotateLayout: this.config.rotateLayout
                }
                const engine = this.engineFactory.newEngine(desktop.output, config);
                const driver = new TilingDriver(engine, engineType, this.ctrl);
                this.drivers.set(desktopString, driver);
                this.ctrl.dbusManager.getSettings(
                    desktopString,
                    this.setEngineConfig.bind(this, desktop),
                );
            } else {
                currentDesktops.splice(index, 1);
            }
        }
        // remove engines for desktops that no longer exist
        for (const desktop of currentDesktops) {
            this.drivers.delete(desktop);
        }
        // remove tiles that dont exist
        for (const tile of this.rootTileCallbacks.keys()) {
            let remove = true;
            for (const output of this.ctrl.workspace.screens) {
                if (
                    this.ctrl.workspace.tilingForScreen(output).rootTile == tile
                ) {
                    remove = false;
                    break;
                }
            }
            if (remove && this.rootTileCallbacks.has(tile)) {
                this.rootTileCallbacks.get(tile)!.destroy();
                this.rootTileCallbacks.delete(tile);
            }
        }
        // register tiles that do exist
        for (const output of this.ctrl.workspace.screens) {
            const rootTile =
                this.ctrl.workspace.tilingForScreen(output).rootTile;
            if (this.ctrl.managedTiles.has(rootTile)) {
                continue;
            }
            this.ctrl.managedTiles.add(rootTile);
            const timer = this.ctrl.qmlObjects.root.createTimer();
            timer.interval = this.config.timerDelay;
            timer.triggered.connect(
                this.layoutModifiedCallback.bind(this, rootTile, output),
            );
            timer.repeat = false;
            this.rootTileCallbacks.set(rootTile, timer);
            rootTile.layoutModified.connect(
                this.layoutModified.bind(this, rootTile),
            );
        }
    }

    private layoutModified(tile: Tile): void {
        if (this.buildingLayout) {
            return;
        }
        const timer = this.rootTileCallbacks.get(tile);
        if (timer == undefined) {
            this.logger.error(
                "Callback not registered for root tile",
                tile.absoluteGeometry,
            );
            return;
        }
        timer.restart();
    }

    private layoutModifiedCallback(tile: Tile, output: Output): void {
        this.logger.debug("Layout modified for tile", tile.absoluteGeometry);
        const desktop = new Desktop(
            this.ctrl.workspace.currentDesktop,
            this.ctrl.workspace.currentActivity,
            output,
        );
        const driver = this.drivers.get(desktop.toString())!;
        driver.regenerateLayout(tile);
    }

    private applyTiled(window: Window): void {
        if (this.config.keepTiledBelow) {
            window.keepBelow = true;
        }
        if (
            this.config.borders == Borders.NoTiled ||
            this.config.borders == Borders.Selected
        ) {
            window.noBorder = true;
        }
    }

    private applyUntiled(window: Window): void {
        if (this.config.keepTiledBelow) {
            window.keepBelow = false;
        }
        if (
            this.config.borders == Borders.NoTiled ||
            this.config.borders == Borders.Selected
        ) {
            window.noBorder = false;
        }
    }

    rebuildLayout(output?: Output): void {
        this.buildingLayout = true;
        let desktops: Desktop[];
        if (output == undefined) {
            desktops = this.ctrl.desktopFactory.createVisibleDesktops();
        } else {
            desktops = [
                new Desktop(
                    this.ctrl.workspace.currentDesktop,
                    this.ctrl.workspace.currentActivity,
                    output,
                ),
            ];
        }
        this.logger.debug("Rebuilding layout for desktops", desktops);
        for (const desktop of desktops) {
            const driver = this.drivers.get(desktop.toString())!;
            driver.buildLayout(
                this.ctrl.workspace.tilingForScreen(desktop.output).rootTile,
            );
            // make registered "untiled" clients appear untiled
            for (const window of driver.untiledWindows) {
                this.applyUntiled(window);
            }
        }
        this.buildingLayout = false;
    }

    addWindow(window: Window, desktops?: Desktop[]): void {
        if (desktops == undefined) {
            desktops = Desktop.fromWindow(window);
        }
        this.logger.debug(
            "Adding client",
            window.resourceClass,
            "to desktops",
            desktops,
        );
        for (const desktop of desktops) {
            this.drivers.get(desktop.toString())!.addWindow(window);
        }
        this.ctrl.windowExtensions.get(window)!.isTiled = true;
        this.applyTiled(window);
    }

    removeWindow(window: Window, desktops?: Desktop[]): void {
        if (desktops == undefined) {
            desktops = Desktop.fromWindow(window);
        }
        this.logger.debug(
            "Removing client",
            window.resourceClass,
            "from desktops",
            desktops,
        );
        for (const desktop of desktops) {
            this.drivers.get(desktop.toString())!.removeWindow(window);
        }
        if (this.ctrl.windowExtensions.has(window)) {
            this.ctrl.windowExtensions.get(window)!.isTiled = false;
            this.applyUntiled(window);
        }
    }

    putWindowInTile(window: Window, tile: Tile, direction?: Direction) {
        const desktop = this.ctrl.desktopFactory.createDefaultDesktop();
        desktop.output = window.output;
        this.logger.debug(
            "Putting client",
            window.resourceClass,
            "in tile",
            tile.absoluteGeometry,
            "with direction",
            direction,
            "on desktop",
            desktop,
        );
        this.drivers
            .get(desktop.toString())!
            .putWindowInTile(window, tile, direction);
        this.ctrl.windowExtensions.get(window)!.isTiled = true;
        this.applyTiled(window);
    }

    getEngineConfig(desktop: Desktop): EngineConfig {
        this.logger.debug("Getting engine config for desktop", desktop);
        return this.drivers.get(desktop.toString())!.engineConfig;
    }

    setEngineConfig(desktop: Desktop, config: EngineConfig) {
        this.logger.debug("Setting engine config for desktop", desktop);
        const driver = this.drivers.get(desktop.toString())!;
        if (config.engineType != driver.engineType) {
            driver.switchEngine(
                this.engineFactory.newEngine(desktop.output, config),
                config.engineType,
            );
        } else {
            driver.engine.config = config;
        }
        this.ctrl.dbusManager.setSettings(desktop.toString(), config);
        this.rebuildLayout(desktop.output);
    }

    removeEngineConfig(desktop: Desktop): void {
        this.logger.debug("Removing engine config for desktop", desktop);
        const config: EngineConfig = {
            engineType: this.config.engineType,
            insertionPoint: this.config.insertionPoint,
            rotateLayout: this.config.rotateLayout
        }
        const driver = this.drivers.get(desktop.toString())!;
        if (config.engineType != driver.engineType) {
            driver.switchEngine(
                this.engineFactory.newEngine(desktop.output, config),
                config.engineType,
            );
        } else {
            driver.engine.config = config;
        }
        this.ctrl.dbusManager.removeSettings(desktop.toString());
        this.rebuildLayout(desktop.output);
    }
}
