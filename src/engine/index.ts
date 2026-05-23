// engine/index.ts - Wrapper around the engines to interact with the driver
import { QPoint } from "kwin-api/qt";
import { TilingEngineInterface, EngineParameters, Window, Tile } from "./engine";
import BTreeEngine from "./layouts/btree";

export { EngineParameters, Window, Tile };

export enum TilingEngineType {
    BTree = 0,
}

export class TilingEngine {
    private engine: TilingEngineInterface;
    private engineRootTile: Tile;

    constructor(type: TilingEngineType) {
        switch (type) {
            case TilingEngineType.BTree:
                this.engine = new BTreeEngine();
                break;
        }
        this.engineRootTile = this.engine.buildLayout();
    }

    get engineParameters() {
        return this.engine.engineParameters;
    }
    set engineParameters(params: EngineParameters) {
        this.engine.engineParameters = params;
    }
    get customSettings() {
        return this.engine.customSettings;
    }
    set customSettings(settings: object) {
        this.engine.customSettings = settings;
    }

    buildLayout(): Tile {
        this.engineRootTile = this.engine.buildLayout();
        return this.engineRootTile;
    }
    addWindow(window: Window, insertionPoint?: QPoint): void {
        this.engine.addWindow(window, insertionPoint);
    }
    removeWindow(window: Window): void {
        this.engine.removeWindow(window);
    }
    updateTiles(rootTile: Tile): void {
        this.engine.updateTiles(rootTile);
    }
}