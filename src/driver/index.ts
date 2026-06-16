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
import { Direction } from "../util/geometry";
import { BorderSetting } from "../controller/config";

export class Driver {
    rootTile: KwinTile;

    desktop: VirtualDesktop;
    activity: Activity;
    output: Output;

    tileMap: Map<KwinTile, EngineTile> = new Map();
    windowMap: Map<KwinWindow, EngineWindow> = new Map();
    windowsToUnmanage: KwinWindow[] = [];

    tilingEngine: TilingEngine;

    active: boolean = true;

    constructor(
        rootTile: KwinTile,
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
        engineType: TilingEngineType,
        engineSettings?: object,
    ) {
        this.rootTile = rootTile;
        this.desktop = desktop;
        this.activity = activity;
        this.output = output;

        if (engineSettings === undefined) {
            engineSettings = getConfigEngineSettings(engineType);
        }
        this.tilingEngine = new TilingEngine(engineType, engineSettings);
    }

    refreshDriver(
        rootTile: KwinTile,
        desktop: VirtualDesktop,
        activity: Activity,
        output: Output,
    ): void {
        this.rootTile = rootTile;
        this.desktop = desktop;
        this.activity = activity;
        this.output = output;

        // remove invalid windows
        for (const [kwinWindow, engineWindow] of this.windowMap) {
            if (kwinWindow == null || !ctrl().windowExists(kwinWindow)) {
                if (
                    kwinWindow.desktops.includes(this.desktop) ||
                    kwinWindow.activities.includes(this.activity) ||
                    kwinWindow.output == this.output
                )
                    continue;
                this.tilingEngine.removeWindow(engineWindow);
                this.windowMap.delete(kwinWindow);
            }
        }
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

    resetTilingEngine(): void {
        const defaultEngine = config().defaultEngine;
        const defaultSettings = getConfigEngineSettings(defaultEngine);
        if (this.tilingEngine.engineType !== defaultEngine) {
            this.setEngineType(defaultEngine, defaultSettings);
        } else {
            this.tilingEngine.setEngineSettings(defaultSettings);
        }
    }

    buildLayout(): void {
        if (this.rootTile == null) {
            console().warn("root tile is null on active driver");
            return;
        }
        const engineRootTile = this.tilingEngine.buildLayout();
        const previousTileSet = new Set(this.tileMap.keys());
        this.tileMap = buildLayout(this.rootTile, engineRootTile);

        const invertedWindowMap = new Map(
            Array.from(this.windowMap, (a) => [a[1], a[0]]),
        );
        const tiledWindowsList: KwinWindow[] = [];
        for (const [kwinTile, engineTile] of this.tileMap) {
            // set callbacks on tiles that do not have callbacks set
            if (!previousTileSet.has(kwinTile)) {
                kwinTile.relativeGeometryChanged.connect(
                    this.updateTileSizesCallback.bind(this),
                );
            }
            for (const engineWindow of engineTile.windows) {
                const kwinWindow = invertedWindowMap.get(engineWindow);
                if (
                    kwinWindow != undefined &&
                    ctrl().windowExists(kwinWindow)
                ) {
                    setTiledProps(kwinWindow);
                    if (kwinWindow.tile !== kwinTile)
                        kwinTile.manage(kwinWindow);
                    //setWindowSize(kwinWindow, kwinTile);
                    tiledWindowsList.push(kwinWindow);
                }
            }
        }
        // untile windows that aren't tiled
        for (const kwinWindow of this.windowMap.keys()) {
            if (!tiledWindowsList.includes(kwinWindow)) {
                if (ctrl().windowExists(kwinWindow)) {
                    setUntiledProps(kwinWindow);
                    if (
                        kwinWindow.tile != null &&
                        this.tileMap.has(kwinWindow.tile)
                    ) {
                        kwinWindow.tile.unmanage(kwinWindow);
                    }
                }
            }
        }
        // untile windows set to be unmanaged only if they still exist (removeWindow has not been called)
        for (const kwinWindow of this.windowsToUnmanage) {
            if (ctrl().windowExists(kwinWindow)) {
                setUntiledProps(kwinWindow);
                if (
                    kwinWindow.tile != null &&
                    this.tileMap.has(kwinWindow.tile)
                ) {
                    kwinWindow.tile.unmanage(kwinWindow);
                }
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

    addWindow(kwinWindow: KwinWindow): void {
        if (this.windowMap.has(kwinWindow)) {
            console().warn(
                "initializeWindow error - window already exists in map",
            );
            return;
        }
        const window = this.initializeWindow(kwinWindow);
        if (window === undefined) {
        }
        this.tilingEngine.addWindow(window);
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
    }

    removeWindow(kwinWindow: KwinWindow): void {
        const engineWindow = this.windowMap.get(kwinWindow);
        if (engineWindow === undefined) {
            console().warn(
                "Window",
                kwinWindow.resourceClass,
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
        const oldTotalChildrenSizes = new Map<EngineTile, number>();
        for (const engineTile of this.tileMap.values()) {
            oldTotalChildrenSizes.set(
                engineTile,
                engineTile.totalChildrenSize(),
            );
        }
        for (const [kwinTile, engineTile] of this.tileMap) {
            if (kwinTile.parent == null || engineTile.parent == null) continue;
            let size: number;
            if (
                engineTile.parent.layoutDirection === LayoutDirection.Horizontal
            ) {
                size = kwinTile.relativeGeometry.width /=
                    kwinTile.parent.relativeGeometry.width;
            } else {
                size = kwinTile.relativeGeometry.height /=
                    kwinTile.parent.relativeGeometry.height;
            }
            size *= oldTotalChildrenSizes.get(engineTile.parent)!;
            engineTile.size = size;
        }
        this.tilingEngine.updateTiles(this.tileMap.get(this.rootTile)!);
    }

    updateTileSizesCallback() {
        ctrl().queuePostEvent({
            t: "updateTileSizes",
            desktop: this.desktop,
            activity: this.activity,
            output: this.output,
        });
    }
}

// want to completely separate the engine and kwin, so we set config defaults here not in engine
function getConfigEngineSettings(engineType: TilingEngineType): object {
    let ret: object;
    switch (engineType) {
        case TilingEngineType.BTree:
            ret = config().btreeSettings;
            break;
        case TilingEngineType.Half:
            ret = config().halfSettings;
            break;
        case TilingEngineType.ThreeColumn:
            ret = config().threeColumnSettings;
            break;
        default:
            console().error("engine type", engineType, "is invalid");
            ret = {};
            break;
    }
    return ret;
}

function setTiledProps(window: KwinWindow) {
    if (config().tiledWindowsBelow) {
        window.keepBelow = true;
    }
    if (config().borders != BorderSetting.BorderAll) {
        window.noBorder = true;
    }
    window.setMaximize(false, false);
}

function setUntiledProps(window: KwinWindow) {
    if (config().tiledWindowsBelow) {
        window.keepBelow = false;
    }
    if (
        config().borders != BorderSetting.NoBorders &&
        config().borders != BorderSetting.BorderActive
    ) {
        window.noBorder = false;
    }
}
