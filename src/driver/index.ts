import { Tile as KwinTile, Window as KwinWindow, LayoutDirection, Output, VirtualDesktop } from "kwin-api";
import { Tile as EngineTile, Window as EngineWindow, TilingEngine, TilingEngineType } from "../engine";
import { buildLayout } from "./buildlayout";
import { console, queueEvent, windowExists } from "../controller";
import { Direction, GRect } from "../util/geometry";

export class Driver {
    rootTile: KwinTile;
    desktop: VirtualDesktop;
    output: Output;

    tileMap: Map<KwinTile, EngineTile> = new Map();
    windowMap: Map<KwinWindow, EngineWindow> = new Map();
    windowsToUnmanage: KwinWindow[] = [];

    tilingEngine: TilingEngine;

    constructor(rootTile: KwinTile, desktop: VirtualDesktop, output: Output, engineType: TilingEngineType, engineSettings?: object) {
        this.rootTile = rootTile;
        this.desktop = desktop;
        this.output = output;

        this.tilingEngine = new TilingEngine(engineType, engineSettings);
    }

    changeTilingEngine(engineType: TilingEngineType, engineSettings?: object) {
        this.tilingEngine = new TilingEngine(engineType, engineSettings);
        for (const engineWindow of this.windowMap.values()) {
            this.tilingEngine.addWindow(engineWindow);
        }
    }

    changeEngineSettings(engineSettings: object) {
        this.tilingEngine.engineSettings = engineSettings;
    }

    buildLayout(): void {
        const engineRootTile = this.tilingEngine.buildLayout();
        const previousTileSet = new Set(this.tileMap.keys());
        this.tileMap = buildLayout(this.rootTile, engineRootTile);
        
        const invertedWindowMap = new Map(Array.from(this.windowMap, a => [a[1], a[0]]));
        const tiledWindowsList: KwinWindow[] = [];
        for (const [kwinTile, engineTile] of this.tileMap) {
            // set callbacks on tiles that do not have callbacks set
            if (!previousTileSet.has(kwinTile)) {
                kwinTile.relativeGeometryChanged.connect(this.updateTilesCallback.bind(this));
            }
            for (const engineWindow of engineTile.windows) {
                const kwinWindow = invertedWindowMap.get(engineWindow);
                if (kwinWindow != undefined && windowExists(kwinWindow)) {
                    setTiledProps(kwinWindow);
                    if (kwinWindow.tile !== kwinTile) kwinTile.manage(kwinWindow);
                    //setWindowSize(kwinWindow, kwinTile);
                    tiledWindowsList.push(kwinWindow);
                }
            }
        }
        // untile windows that aren't tiled
        for (const kwinWindow of this.windowMap.keys()) {
            if (!tiledWindowsList.includes(kwinWindow)) {
                if (windowExists(kwinWindow)) {
                    setUntiledProps(kwinWindow);
                    if (kwinWindow.tile != null) kwinWindow.tile.unmanage(kwinWindow);
                }
            }
        }
        // untile windows set to be unmanaged only if they still exist (removeWindow has not been called)
        for (const kwinWindow of this.windowsToUnmanage) {
            if (windowExists(kwinWindow)) {
                setUntiledProps(kwinWindow);
                if (kwinWindow.tile != null) kwinWindow.tile.unmanage(kwinWindow);
            }
        }
        this.windowsToUnmanage = [];
    }

    // returns undefined if the window already exists
    private initializeWindow(kwinWindow: KwinWindow): EngineWindow | undefined {
        if (this.windowMap.has(kwinWindow)) {
            console().warn("initializeWindow error - window already exists in map");
            return undefined;
        }
        const engineWindow = new EngineWindow(kwinWindow.internalId, kwinWindow.caption, kwinWindow.minSize);
        this.windowMap.set(kwinWindow, engineWindow);
        return engineWindow;
    }

    addWindow(kwinWindow: KwinWindow): void {
        const window = this.initializeWindow(kwinWindow);
        if (window === undefined) return;
        this.tilingEngine.addWindow(window);
    }

    placeWindow(kwinWindow: KwinWindow, kwinTile: KwinTile, direction?: Direction): void {
        const window = this.initializeWindow(kwinWindow);
        if (window === undefined) return;
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
            console().log("Window", kwinWindow.resourceClass, "not registered in windowMap");
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
            oldTotalChildrenSizes.set(engineTile, engineTile.totalChildrenSize());
        }
        for (const [kwinTile, engineTile] of this.tileMap) {
            if (kwinTile.parent == null || engineTile.parent == null) continue;
            let size: number;
            if (engineTile.parent.layoutDirection === LayoutDirection.Horizontal) {
                size = kwinTile.relativeGeometry.width /= kwinTile.parent.relativeGeometry.width;
            } else {
                size = kwinTile.relativeGeometry.height /= kwinTile.parent.relativeGeometry.height;
            }
            size *= oldTotalChildrenSizes.get(engineTile.parent)!;
            engineTile.size = size;
        }
        this.tilingEngine.updateTiles(this.tileMap.get(this.rootTile)!);
    }

    updateTilesCallback() {
        queueEvent({
            t: "updateTiles",
            desktop: this.desktop,
            output: this.output
        });
    }
}

// sometimes windows (FIREFOX) dont set their size properly so we force them to
// we will do this after kwin removes the artificial 0.15 relative size limit on tiles
// nvm I guess we will probably never do this because its glitchy ash
function setWindowSize(window: KwinWindow, tile: KwinTile) {
    const rect = new GRect(tile.absoluteGeometry);
    rect.x += tile.padding;
    rect.y += tile.padding;
    rect.width -= tile.padding * 2;
    rect.height -= tile.padding * 2;
    rect.writeTo(window.frameGeometry);
}

function setTiledProps(window: KwinWindow) {
    window.keepBelow = true;
}

function setUntiledProps(window: KwinWindow) {
    window.keepBelow = false;
}