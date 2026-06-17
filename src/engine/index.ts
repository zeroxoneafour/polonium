// engine/index.ts - Wrapper around the engines to interact with the driver
import { console } from "../controller";
import { TilingEngineInterface, Window, Tile, Direction } from "./engine";
import { BTreeEngine } from "./layouts/btree";
import { HalfEngine } from "./layouts/half";
import { ThreeColumnEngine } from "./layouts/threecolumn";
import { PillarEngine } from "./layouts/pillars";
import { PagerEngine } from "./layouts/pager";

export { Window, Tile, Direction };

export { InsertionStyle as BTreeInsertionStyle } from "./layouts/btree";
export { InsertionStyle as PillarsInsertionStyle } from "./layouts/pillars";

export enum TilingEngineType {
    BTree = 0,
    Half,
    ThreeColumn,
    Pillars,
    Pager,
    _Loop,
}

export class TilingEngine {
    private engine: TilingEngineInterface;
    private engineRootTile: Tile;

    readonly engineType: TilingEngineType;

    constructor(type: TilingEngineType, settings: object) {
        this.engineType = type;
        switch (type) {
            case TilingEngineType.BTree:
                this.engine = new BTreeEngine();
                break;
            case TilingEngineType.Half:
                this.engine = new HalfEngine();
                break;
            case TilingEngineType.ThreeColumn:
                this.engine = new ThreeColumnEngine();
                break;
            case TilingEngineType.Pillars:
                this.engine = new PillarEngine();
                break;
            case TilingEngineType.Pager:
                this.engine = new PagerEngine();
                break;
            default:
                console().warn("Invalid tiling engine type", type);
                this.engineType = TilingEngineType.BTree;
                this.engine = new BTreeEngine();
                break;
        }
        this.engine.setEngineSettings(settings);
        this.engineRootTile = this.engine.buildLayout();
    }

    getEngineSettings(): object {
        return this.engine.getEngineSettings();
    }
    setEngineSettings(settings: object): void {
        this.engine.setEngineSettings(settings);
    }

    buildLayout(): Tile {
        this.engineRootTile = this.engine.buildLayout();
        return this.engineRootTile;
    }
    addWindow(window: Window, tile?: Tile, direction?: Direction): void {
        return this.engine.addWindow(window, tile, direction);
    }
    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        return this.engine.placeWindow(window, tile, direction);
    }
    windowActivated(window: Window): boolean {
        return this.engine.windowActivated(window);
    }
    removeWindow(window: Window): void {
        return this.engine.removeWindow(window);
    }
    updateTiles(rootTile: Tile): void {
        return this.engine.updateTiles(rootTile);
    }
}
