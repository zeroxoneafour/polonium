import { Tile as KwinTile, Window as KwinWindow } from "kwin-api";
import { Tile as EngineTile, Window as EngineWindow, TilingEngine, TilingEngineType } from "../engine";
import { buildLayout } from "./buildlayout";
import { console } from "../controller";

export class Driver {
    rootTile: KwinTile;

    tileMap: Map<KwinTile, EngineTile> = new Map();
    windowMap: Map<KwinWindow, EngineWindow> = new Map();

    tilingEngine: TilingEngine;

    constructor(rootTile: KwinTile) {
        this.rootTile = rootTile;
        this.tilingEngine = new TilingEngine(TilingEngineType.BTree);
    }

    buildLayout() {
        const engineRootTile = this.tilingEngine.buildLayout();
        this.tileMap = buildLayout(this.rootTile, engineRootTile);
        
        const invertedWindowMap = new Map(Array.from(this.windowMap, a => [a[1], a[0]]));
        const tiledWindowsList: KwinWindow[] = [];
        for (const [kwinTile, engineTile] of this.tileMap) {
            for (const engineWindow of engineTile.windows) {
                const kwinWindow = invertedWindowMap.get(engineWindow);
                if (kwinWindow !== undefined) {
                    kwinTile.manage(kwinWindow);
                    tiledWindowsList.push(kwinWindow);
                }
            }
        }
        // untile windows that aren't tiled
        for (const kwinWindow of this.windowMap.keys()) {
            if (!tiledWindowsList.includes(kwinWindow)) {
                if (kwinWindow.tile !== null) {
                    kwinWindow.tile.unmanage(kwinWindow);
                }
            }
        }
    }

    addWindow(kwinWindow: KwinWindow) {
        const engineWindow = new EngineWindow(kwinWindow.internalId, kwinWindow.caption, kwinWindow.minSize);
        this.windowMap.set(kwinWindow, engineWindow);
        this.tilingEngine.addWindow(engineWindow);
    }
    
    removeWindow(kwinWindow: KwinWindow) {
        console.log("removewindow called on driver")
        const engineWindow = this.windowMap.get(kwinWindow);
        if (engineWindow === undefined) {
            console.warn("Window", kwinWindow.caption, "not registered in windowMap");
            return;
        }
        this.tilingEngine.removeWindow(engineWindow);
        this.windowMap.delete(kwinWindow);
    }
}