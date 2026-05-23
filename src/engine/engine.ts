// engines/engine.ts - All the engine stuff except for the factory

import { LayoutDirection } from "kwin-api";
import { QPoint, QRect, QSize, QUuid } from "kwin-api/qt";
import { GSize } from "../util/geometry";

export class EngineParameters {
    workingArea: QRect;
    constructor(workingArea: QRect) {
        this.workingArea = workingArea;
    }
}

/**
 * Tiling Engine interface 2.0
 * Make sure to preserve the Tile returned from buildLayout if you want updateTiles to work
 */
export interface TilingEngineInterface {
    get engineParameters(): EngineParameters;
    set engineParameters(params: EngineParameters);
    get customSettings(): object;
    set customSettings(settings: object);

    /**
     * Builds the layout.
     */
    buildLayout(): Tile;
    /**
     * Adds a new window
     * @param window The window, with a few extra info points
     * @param insertionPoint The point where the window should be inserted, _relative to the workingArea defined in the engine parameters_.
     */
    addWindow(window: Window, insertionPoint?: QPoint): void;
    /**
     * Removes a window that is implied to be registered
     * @param window The window to remove
     */
    removeWindow(window: Window): void;
    /**
     * Updates the tiles
     * @param rootTile Root tile of the real layout
     */
    updateTiles(rootTile: Tile): void;
}

export class Window {
    id: QUuid;
    name: string;
    minSize: QSize;
    constructor(id: QUuid, name: string, minSize: QSize) {
        this.id = id;
        this.name = name;
   
    /**
     * Builds the layout.
     */     this.minSize = minSize;
    }
}

export class Tile {
    parent: Tile | null;
    children: Tile[] = [];
    layoutDirection: LayoutDirection = LayoutDirection.Horizontal;
    // relative size to other children of this tile
    size: number = 1;
    windows: Window[] = [];

    constructor(parent?: Tile) {
        this.parent = parent ?? null;
        if (this.parent == null) {
            return;
        }
        this.parent.children.push(this);
    }

    // adds a child that will split perpendicularly to the parent. Returns the child
    addChild(): Tile {
        let splitDirection: LayoutDirection = 1;
        if (this.layoutDirection == 1) {
            splitDirection = 2;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
        return childTile;
    }

    // adds a child that will split parallel to the parent. Not really recommeneded
    addChildParallel(): Tile {
        const childTile = new Tile(this);
        childTile.layoutDirection = this.layoutDirection;
        return childTile;
    }

    // split a tile, aka add two children
    split(): void {
        this.addChild();
        this.addChild();
    }

    /*
    // have a tile replace its parent, destroying its siblings
    secede(): void {
        const parent = this.parent;
        // cant secede as root
        if (parent == null) {
            return;
        }
        this.parent = parent.parent;
        if (this.parent != null) {
            this.parent.tiles[this.parent.tiles.indexOf(parent)] = this;
            for (const tile of parent.tiles) {
                if (tile != this) {
                    tile.remove(true);
                }
            }
            parent.tiles = [];
            parent.windows = [];
        } else {
            // special case for roottile because it cant be destroyed
            parent.windows = this.windows;
            parent.tiles = this.tiles;
            this.tiles = [];
            this.windows = [];
        }
    }
    */

    // removes a tile and all its children
    remove(): void {
        const parent = this.parent;
        if (parent == null) {
            return;
        }
        parent.children.splice(parent.children.indexOf(this), 1);
        this.children = [];
        this.windows = [];
    }

    // remove child tiles
    removeChildren(): void {
        for (const tile of this.children) {
            tile.remove();
        }
        this.children = [];
    }
}