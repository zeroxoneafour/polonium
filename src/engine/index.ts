// engine/index.ts - Wrapper around the engines to interact with the driver
import { console } from "../controller";
import {
    TilingEngineInterface,
    Window,
    Tile,
    Direction,
    LayoutDirection,
    BaseEngineSettings,
} from "./engine";
import { BTreeEngine } from "./layouts/btree";
import { HalfEngine } from "./layouts/half";
import { ThreeColumnEngine } from "./layouts/threecolumn";
import { PillarEngine } from "./layouts/pillars";
import { PagerEngine } from "./layouts/pager";
import { KwinEngine } from "./layouts/kwin";
import { UltrawidePosition } from "../controller/config";

export { Window, Tile, Direction, LayoutDirection };

export { InsertionStyle as BTreeInsertionStyle } from "./layouts/btree";
export { InsertionStyle as PillarsInsertionStyle } from "./layouts/pillars";

export enum TilingEngineType {
    BTree = 0,
    Half,
    ThreeColumn,
    Pillars,
    Pager,
    KWin,
    _Loop,
}

class AllEngineSettings extends BaseEngineSettings {
    ultrawideEnabled: boolean = false;
    ultrawideWidth: number = 0.5;
    ultrawidePosition: UltrawidePosition = UltrawidePosition.Center;
}

export class TilingEngine {
    private engine: TilingEngineInterface;
    // these are set in the constructor (buildLayout) but not "definitely"
    private rootTile: Tile = new Tile();
    private coreRootTile: Tile = new Tile();
    // track tiles that the core engine itself doesnt track
    // these tiles must be transformed into insertions
    private nonCoreTiles: Set<Tile> = new Set();

    readonly engineType: TilingEngineType;
    private settings: AllEngineSettings = new AllEngineSettings();

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
            case TilingEngineType.KWin:
                this.engine = new KwinEngine();
                break;
            default:
                console().warn("Invalid tiling engine type", type);
                this.engineType = TilingEngineType.BTree;
                this.engine = new BTreeEngine();
                break;
        }
        this.setEngineSettings(settings);
        this.buildLayout();
    }

    getEngineSettings(): object {
        const settings =
            this.engineType !== TilingEngineType.KWin
                ? this.settings.getProps()
                : {};
        return Object.assign(settings, this.engine.getEngineSettings());
    }
    setEngineSettings(settings: object): void {
        if (this.engineType !== TilingEngineType.KWin) {
            this.settings.setProps(settings);
            this.settings.ultrawideWidth = clamp(
                this.settings.ultrawideWidth,
                0.15,
                0.85,
            );
            if (
                this.settings.ultrawidePosition !== UltrawidePosition.Center &&
                this.settings.ultrawidePosition !== UltrawidePosition.Left &&
                this.settings.ultrawidePosition !== UltrawidePosition.Right
            ) {
                this.settings.ultrawidePosition = UltrawidePosition.Center;
            }
        }
        this.engine.setEngineSettings(settings);
    }

    buildLayout(): Tile {
        let rootTile = this.engine.buildLayout();
        this.coreRootTile = rootTile;
        if (this.settings.ultrawideEnabled && countWindows(rootTile) === 1) {
            rootTile = applySingleWindowSizing(rootTile, this.settings);
        }
        this.rootTile = rootTile;
        this.nonCoreTiles.clear();
        const stack = [rootTile];
        while (stack.length > 0) {
            let tile = stack.pop()!;
            if (tile == this.coreRootTile) {
                continue;
            }
            this.nonCoreTiles.add(tile);
            stack.push(...tile.children);
        }
        return this.rootTile;
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
    // rootTile may be the single window sizing wrapper, but the core engine only
    // knows about its own root (which is a child of the wrapper in that case)
    updateTiles(_rootTile: Tile): void {
        return this.engine.updateTiles(this.coreRootTile);
    }

    getCoreRootTile(): Tile {
        return this.coreRootTile;
    }
    isTileCore(tile: Tile): boolean {
        return !this.nonCoreTiles.has(tile);
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function countWindows(rootTile: Tile): number {
    let count = 0;
    const stack = [rootTile];
    while (stack.length > 0) {
        const tile = stack.pop()!;
        count += tile.windows.length;
        stack.push(...tile.children);
    }
    return count;
}

function applySingleWindowSizing(
    rootTile: Tile,
    settings: AllEngineSettings,
): Tile {
    const rootWindows = rootTile.windows;
    const widthShare = settings.ultrawideWidth;
    const position = settings.ultrawidePosition;
    console().debug(
        "applying single-window sizing - width",
        widthShare,
        "position",
        position,
    );

    const newRoot = new Tile();
    newRoot.layoutDirection = LayoutDirection.Horizontal;

    if (position === UltrawidePosition.Center) {
        const sideShare = (1 - widthShare) / 2;
        const leftTile = newRoot.addChild();
        leftTile.size = sideShare;

        const centerTile = newRoot.addChild(rootTile);
        centerTile.size = widthShare;

        const rightTile = newRoot.addChild();
        rightTile.size = sideShare;
    } else if (position === UltrawidePosition.Left) {
        const leftTile = newRoot.addChild(rootTile);
        leftTile.size = widthShare;

        const rightTile = newRoot.addChild();
        rightTile.size = 1 - widthShare;
    } else if (position === UltrawidePosition.Right) {
        const leftTile = newRoot.addChild();
        leftTile.size = 1 - widthShare;

        const rightTile = newRoot.addChild(rootTile);
        rightTile.size = widthShare;
    }

    return newRoot;
}
