// engines/engine.ts - All the stuff that layouts should be concerned with

import { LayoutDirection } from "kwin-api";
import { QSize, QUuid } from "kwin-api/qt";

import { Direction } from "../util/geometry";
export { Direction };

/**
 * Tiling Engine interface 2.0
 */
export interface TilingEngineInterface {
    get engineSettings(): object;
    set engineSettings(settings: object);

    /**
     * Builds the layout.
     * @returns The root tile of the layout, driver should keep this for referencing in updateTiles()
     */
    buildLayout(): Tile;
    /**
     * Adds a new window
     * @param window The window
     */
    addWindow(window: Window): void;
    /**
     * Places a window into a specific tile. The window is new, ie. it should have been removed beforehand by the driver
     * @param window The window
     * @param tile The tile to insert the window into
     * @param direction The direction within the aforementioned tile in which to insert the window (optional)
     */
    placeWindow(window: Window, tile: Tile, direction?: Direction): void;
    /**
     * Removes a window that is implied to be registered
     * @param window The window to remove
     */
    removeWindow(window: Window): void;
    /**
     * Updates the tiles
     * @param rootTile Root tile given by most recent call to buildLayout()
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
    
    totalChildrenSize(): number {
        return this.children.reduce((s, t) => s + t.size, 0);
    }
}

