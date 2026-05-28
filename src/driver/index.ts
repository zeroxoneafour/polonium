import { Tile as KwinTile, Window as KwinWindow } from "kwin-api";
import { Tile as EngineTile, Window as EngineWindow, TilingEngine, TilingEngineType } from "../engine";
import { buildLayout } from "./buildlayout";
import { console, windowExists } from "../controller";
import { Direction, GRect } from "../util/geometry";

export class Driver {
    rootTile: KwinTile;

    tileMap: Map<KwinTile, EngineTile> = new Map();
    windowMap: Map<KwinWindow, EngineWindow> = new Map();
    windowsToUnmanage: KwinWindow[] = [];

    tilingEngine: TilingEngine;

    constructor(rootTile: KwinTile) {
        this.rootTile = rootTile;
        this.tilingEngine = new TilingEngine(TilingEngineType.BTree);
    }

    buildLayout(): void {
        const engineRootTile = this.tilingEngine.buildLayout();
        this.tileMap = buildLayout(this.rootTile, engineRootTile);
        
        const invertedWindowMap = new Map(Array.from(this.windowMap, a => [a[1], a[0]]));
        const tiledWindowsList: KwinWindow[] = [];
        for (const [kwinTile, engineTile] of this.tileMap) {
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
                if (windowExists(kwinWindow) && kwinWindow.tile != null) {
                    setUntiledProps(kwinWindow);
                    kwinWindow.tile.unmanage(kwinWindow);
                }
            }
        }
        // untile windows set to be unmanaged only if they still exist (removeWindow has not been called)
        for (const kwinWindow of this.windowsToUnmanage) {
            if (windowExists(kwinWindow) && kwinWindow.tile != null) {
                setUntiledProps(kwinWindow);
                kwinWindow.tile.unmanage(kwinWindow);
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