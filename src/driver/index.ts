import {
    Tile as KwinTile,
    Window as KwinWindow,
    LayoutDirection,
    Output,
    VirtualDesktop,
    Activity,
} from "kwin-api";
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

export class Driver {
    private engineRootTile: EngineTile | null = null;
    private tileMap: Map<KwinTile, EngineTile> = new Map();
    private windowMap: Map<KwinWindow, EngineWindow> = new Map();
    private windowsToUnmanage: KwinWindow[] = [];
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

    getEngineType(): TilingEngineType {
        return this.tilingEngine.engineType;
    }

    getEngineSettings(): object {
        return this.tilingEngine.getEngineSettings();
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

    buildLayout(
        rootTile: KwinTile,
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ): void {
        // remove non-extant windows or windows that are not on the desktop/activity/output
        // should prevent ghost tiles even if code elsewhere is buggy
        for (const [kwinWindow, _ew] of this.windowMap) {
            if (
                !ctrl().windowExists(kwinWindow) ||
                !kwinWindow.desktops.includes(desktop) ||
                !kwinWindow.activities.includes(activity) ||
                kwinWindow.output !== output
            ) {
                console().warn("invalid window in windowMap");
                this.removeWindow(kwinWindow);
            }
        }

        this.engineRootTile = this.tilingEngine.buildLayout();
        const previousTileSet = new Set(this.tileMap.keys());
        this.tileMap = buildLayout(rootTile, this.engineRootTile);

        const invertedWindowMap = new Map(
            Array.from(this.windowMap, (a) => [a[1], a[0]]),
        );
        const tiledWindows: Set<KwinWindow> = new Set();
        for (const [kwinTile, engineTile] of this.tileMap) {
            // set callbacks on tiles that do not have callbacks set
            if (!previousTileSet.has(kwinTile)) {
                kwinTile.relativeGeometryChanged.connect(
                    this.updateTileSizesCallback.bind(
                        this,
                        desktop,
                        activity,
                        output,
                    ),
                );
            }
            for (const engineWindow of engineTile.windows) {
                const kwinWindow = invertedWindowMap.get(engineWindow);
                if (kwinWindow === undefined) {
                    continue;
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
        // untile windows set to be unmanaged only if they still exist (removeWindow has not been called)
        for (const kwinWindow of this.windowsToUnmanage) {
            // we dont sanitize this for windowExists (unlike for windowMap) so double check
            if (!ctrl().windowExists(kwinWindow)) {
                continue;
            }
            if (kwinWindow.tile != null && this.tileMap.has(kwinWindow.tile)) {
                kwinWindow.tile.unmanage(kwinWindow);
                setUntiledProps(kwinWindow);
            } else if (kwinWindow.tile == null) {
                setUntiledProps(kwinWindow);
            }
        }
        this.windowsToUnmanage = [];
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
        this.windowsToUnmanage.push(kwinWindow);
        this.tilingEngine.removeWindow(engineWindow);
        this.windowMap.delete(kwinWindow);
    }

    // as of right now, can only update sizes (ie cannot add/remove tiles)
    updateTiles(): void {
        if (this.engineRootTile === null) {
            console().warn("updateTiles called, but engine layout not built");
            return;
        }
        for (const [kwinTile, engineTile] of this.tileMap) {
            if (kwinTile.parent == null || engineTile.parent == null) continue;
            let size: number;
            if (
                engineTile.parent.layoutDirection === LayoutDirection.Horizontal
            ) {
                size =
                    kwinTile.relativeGeometry.width /
                    kwinTile.parent.relativeGeometry.width;
            } else {
                size =
                    kwinTile.relativeGeometry.height /
                    kwinTile.parent.relativeGeometry.height;
            }
            // use static sizing based at 1 instead of dynamic sizing
            // the resulting tiles will have a totalChildrenSize == children.length
            size *= kwinTile.parent.tiles.length;
            engineTile.size = size;
        }
        this.tilingEngine.updateTiles(this.engineRootTile);
    }

    updateTileSizesCallback(
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ) {
        ctrl().queueEvent({
            t: "updateTiles",
            desktop: desktop,
            activity: activity,
            output: output,
            rebuild: false,
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
