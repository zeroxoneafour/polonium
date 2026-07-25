import { Tile as KwinTile, Window as KwinWindow } from "kwin-api";
import {
    Tile as EngineTile,
    Window as EngineWindow,
    TilingEngine,
    TilingEngineType,
} from "../engine";
import { buildLayout } from "./buildlayout";
import { config, console, controller as ctrl } from "../controller";
import { Direction } from "../util";
import { Borders } from "../controller/config";
import { updateTiles } from "./updatetiles";
import { Display } from "../controller/event";

export class Driver {
    private engineRootTile: EngineTile | null = null;
    private tileMap: Map<KwinTile, EngineTile> = new Map();
    private hookedTiles: Set<KwinTile> = new Set();
    private windowMap: Map<KwinWindow, EngineWindow> = new Map();
    private untiledWindows: Set<KwinWindow> = new Set();
    private windowsToRemove: KwinWindow[] = [];
    private savedActiveWindow: KwinWindow | null = null;

    private tilingEngine: TilingEngine;

    constructor(engineType: TilingEngineType, engineSettings?: object) {
        if (engineSettings === undefined) {
            engineSettings = getConfigEngineSettings(engineType);
        }
        this.tilingEngine = new TilingEngine(engineType, engineSettings);
    }

    private setEngineType(
        engineType: TilingEngineType,
        engineSettings: object,
    ): void {
        this.tilingEngine = new TilingEngine(engineType, engineSettings);
        for (const engineWindow of this.windowMap.values()) {
            this.tilingEngine.addWindow(engineWindow);
        }
    }

    changeTilingEngine(
        engineType?: TilingEngineType,
        engineSettings?: object,
    ): void {
        if (
            engineType !== undefined &&
            this.tilingEngine.engineType != engineType
        ) {
            if (engineSettings === undefined) {
                engineSettings = getConfigEngineSettings(engineType);
            }
            this.setEngineType(engineType, engineSettings);
        } else if (engineSettings !== undefined) {
            this.tilingEngine.setEngineSettings(engineSettings);
        }
    }

    hasWindow(kwinWindow: KwinWindow): boolean {
        return this.windowMap.has(kwinWindow);
    }

    hasTile(kwinTile: KwinTile): boolean {
        return this.tileMap.has(kwinTile);
    }

    getEngineType(): TilingEngineType {
        return this.tilingEngine.engineType;
    }

    getEngineSettings(): object {
        return this.tilingEngine.getEngineSettings();
    }

    isWindowTiled(kwinWindow: KwinWindow): boolean | undefined {
        if (!this.windowMap.has(kwinWindow)) {
            return undefined;
        }
        return !this.untiledWindows.has(kwinWindow);
    }

    resetTilingEngine(): void {
        const defaultEngine = config().defaultEngine;
        const defaultSettings = getConfigEngineSettings(defaultEngine);
        if (this.tilingEngine.engineType !== defaultEngine) {
            this.setEngineType(defaultEngine, defaultSettings);
        } else {
            this.tilingEngine.setEngineSettings(defaultSettings);
        }
    }

    buildLayout(rootTile: KwinTile, display: Display): void {
        // remove non-extant windows or windows that are not on the desktop/activity/output
        // should prevent ghost tiles even if code elsewhere is buggy
        for (const [kwinWindow, _ew] of this.windowMap) {
            if (
                !ctrl().windowExists(kwinWindow) ||
                !kwinWindow.desktops.includes(display.desktop) ||
                !kwinWindow.activities.includes(display.activity) ||
                kwinWindow.output !== display.output
            ) {
                console().warn("invalid window in windowMap");
                this.removeWindow(kwinWindow);
            }
        }

        this.engineRootTile = this.tilingEngine.buildLayout();
        this.tileMap = buildLayout(rootTile, this.engineRootTile);
        // clean out old hooked (callback set) tiles
        for (const hookedTile of this.hookedTiles) {
            if (!this.tileMap.has(hookedTile)) {
                this.hookedTiles.delete(hookedTile);
            }
        }

        const invertedWindowMap = new Map(
            Array.from(this.windowMap, (a) => [a[1], a[0]]),
        );
        const tiledWindows: Set<KwinWindow> = new Set();
        for (const [kwinTile, engineTile] of this.tileMap) {
            // set callbacks on tiles that do not have callbacks set
            if (!this.hookedTiles.has(kwinTile)) {
                kwinTile.relativeGeometryChanged.connect(
                    this.updateTileSizesCallback.bind(this, display),
                );
                kwinTile.childTilesChanged.connect(
                    this.updateTileCountCallback.bind(this, display),
                );
                this.hookedTiles.add(kwinTile);
            }
            for (const engineWindow of engineTile.windows) {
                const kwinWindow = invertedWindowMap.get(engineWindow);
                if (kwinWindow === undefined) {
                    continue;
                }
                if (this.untiledWindows.has(kwinWindow)) {
                    this.untiledWindows.delete(kwinWindow);
                }
                setTiledProps(kwinWindow);
                if (kwinWindow.tile !== kwinTile) kwinTile.manage(kwinWindow);
                //setWindowSize(kwinWindow, kwinTile);
                tiledWindows.add(kwinWindow);
            }
        }
        // untile windows that aren't tiled
        for (const kwinWindow of this.windowMap.keys()) {
            if (!tiledWindows.has(kwinWindow)) {
                this.untiledWindows.add(kwinWindow);
                // dont set untiled props if the tile isnt null and this driver doesnt manage it
                // (in all likelihood another driver does)
                if (
                    kwinWindow.tile != null &&
                    this.tileMap.has(kwinWindow.tile)
                ) {
                    kwinWindow.tile.unmanage(kwinWindow);
                    setUntiledProps(kwinWindow);
                } else if (kwinWindow.tile == null) {
                    setUntiledProps(kwinWindow);
                }
            }
        }
    }

    private initializeWindow(kwinWindow: KwinWindow): EngineWindow {
        if (this.windowMap.has(kwinWindow)) {
            return this.windowMap.get(kwinWindow)!;
        }
        const engineWindow = new EngineWindow(
            kwinWindow.internalId,
            kwinWindow.caption,
            kwinWindow.minSize,
        );
        this.windowMap.set(kwinWindow, engineWindow);
        return engineWindow;
    }

    addWindow(
        kwinWindow: KwinWindow,
        tile?: KwinTile,
        direction?: Direction,
    ): void {
        if (this.windowMap.has(kwinWindow)) {
            console().warn(
                "initializeWindow error - window already exists in map",
            );
            return;
        }
        const window = this.initializeWindow(kwinWindow);
        this.tilingEngine.addWindow(
            window,
            tile ? this.tileMap.get(tile) : undefined,
            direction,
        );
        // sometimes windowActivated is called before addWindow so rectify that here
        if (this.savedActiveWindow === kwinWindow) {
            // return value doesnt matter as we rebuild on add regardless
            this.tilingEngine.windowActivated(window);
        }
    }

    addWindowUntiled(kwinWindow: KwinWindow) {
        if (this.windowMap.has(kwinWindow)) {
            console().warn(
                "initializeWindow error - window already exists in map",
            );
            return;
        }
        this.initializeWindow(kwinWindow);
    }

    tileWindow(kwinWindow: KwinWindow) {
        const window = this.windowMap.get(kwinWindow);
        if (window === undefined) {
            console().warn("tileWindow error - window not found in map");
            return;
        }
        this.tilingEngine.addWindow(window);
        if (this.savedActiveWindow === kwinWindow) {
            // return value doesnt matter as we rebuild on add regardless
            this.tilingEngine.windowActivated(window);
        }
    }

    untileWindow(kwinWindow: KwinWindow) {
        const window = this.windowMap.get(kwinWindow);
        if (window === undefined) {
            console().warn("untileWindow error - window not found in map");
            return;
        }
        this.tilingEngine.removeWindow(window);
    }

    placeWindow(
        kwinWindow: KwinWindow,
        kwinTile: KwinTile,
        direction?: Direction,
    ): void {
        let window = this.initializeWindow(kwinWindow);
        const tile = this.tileMap.get(kwinTile);
        if (tile == undefined) {
            console().warn("tile undefined during window placement");
            // place like normal if no tile
            this.tilingEngine.addWindow(window);
            return;
        }
        this.tilingEngine.placeWindow(window, tile, direction);
        // see comments in addWindow
        if (this.savedActiveWindow === kwinWindow) {
            this.tilingEngine.windowActivated(window);
        }
    }

    windowActivated(kwinWindow: KwinWindow): boolean {
        this.savedActiveWindow = kwinWindow;
        const engineWindow = this.windowMap.get(kwinWindow);
        if (engineWindow === undefined) {
            // dont panic as windowActivated may be called before addWindow
            // so we resolve this with savedActiveWindow in place/addWindow
            return false;
        }
        return this.tilingEngine.windowActivated(engineWindow);
    }

    removeWindow(kwinWindow: KwinWindow): void {
        const engineWindow = this.windowMap.get(kwinWindow);
        if (engineWindow === undefined) {
            console().warn(
                "Window",
                kwinWindow?.resourceClass,
                "not registered in windowMap",
            );
            return;
        }
        this.tilingEngine.removeWindow(engineWindow);
        this.windowMap.delete(kwinWindow);
        if (this.untiledWindows.has(kwinWindow)) {
            this.untiledWindows.delete(kwinWindow);
        } else if (ctrl().windowExists(kwinWindow)) {
            setUntiledProps(kwinWindow);
            if (kwinWindow.tile != null && this.tileMap.has(kwinWindow.tile)) {
                kwinWindow.tile.unmanage(kwinWindow);
            }
        }
    }

    // as of right now, can only update sizes (ie cannot add/remove tiles)
    updateTiles(): void {
        if (this.engineRootTile === null) {
            console().warn("updateTiles called, but engine layout not built");
            return;
        }
        const tile = updateTiles(this.engineRootTile, this.tileMap);
        this.tilingEngine.updateTiles(tile);
    }

    private updateTileSizesCallback(display: Display) {
        ctrl().queueEvent({
            t: "updateTiles",
            display: display,
            rebuild: false,
        });
    }
    // when updating tile count we want to rebuild as for most engines this is an error
    // for kwin this is fine though
    private updateTileCountCallback(display: Display) {
        ctrl().queueEvent({
            t: "updateTiles",
            display: display,
            rebuild: true,
        });
    }
}

// want to completely separate the engine and kwin, so we set config defaults here not in engine
function getConfigEngineSettings(engineType: TilingEngineType): object {
    switch (engineType) {
        case TilingEngineType.BTree:
            return config().btreeSettings;
        case TilingEngineType.Half:
            return config().halfSettings;
        case TilingEngineType.ThreeColumn:
            return config().threeColumnSettings;
        case TilingEngineType.Pillars:
            return config().pillarSettings;
        case TilingEngineType.Pager:
            return config().pagerSettings;
        case TilingEngineType.KWin:
            // no settings for kwin
            return {};
        default:
            console().error("engine type", engineType, "is invalid");
            return {};
    }
}

function setTiledProps(window: KwinWindow) {
    if (config().tiledWindowsBelow) {
        window.keepBelow = true;
    }
    if (
        config().borders === Borders.Floating ||
        config().borders === Borders.None ||
        ((config().borders === Borders.Active ||
            config().borders === Borders.FloatingActive) &&
            !window.active)
    ) {
        window.noBorder = true;
    }
    window.setMaximize(false, false);
}

function setUntiledProps(window: KwinWindow) {
    if (config().tiledWindowsBelow) {
        window.keepBelow = false;
    }
    if (
        config().borders === Borders.Floating ||
        config().borders === Borders.FloatingActive
    ) {
        window.noBorder = false;
    }
}
