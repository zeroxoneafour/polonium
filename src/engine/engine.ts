// engines/engine.ts - All the stuff that layouts should be concerned with

import { LayoutDirection } from "kwin-api";
import { QSize, QUuid } from "kwin-api/qt";
import { Direction } from "../util/geometry";

export { LayoutDirection, Direction };

/**
 * Tiling Engine interface 2.0
 */
export interface TilingEngineInterface {
    getEngineSettings(): object;
    setEngineSettings(settings: object): void;

    /**
     * Builds the layout.
     * @returns The root tile of the layout, driver should keep this for referencing in updateTiles()
     */
    buildLayout(): Tile;
    /**
     * Adds a new window. Takes completely optional parameters for insertion suggestions.
     * Unlike placeWindow, insertion is completely at the discretion of the engine.
     * The extra parameters may be completely ignored if desired.
     * @param window The window
     */
    addWindow(window: Window, tile?: Tile, direction?: Direction): void;
    /**
     * Places a window into a specific tile. The window is new, ie. it should have been removed beforehand by the driver
     * @param window The window
     * @param tile The tile to insert the window into
     * @param direction The direction within the aforementioned tile in which to insert the window (optional)
     */
    placeWindow(window: Window, tile: Tile, direction?: Direction): void;
    /**
     * Signals that a window implied to be registered has been activated.
     * Can be set to just return false if this function isnt useful to the engine.
     * @param window The window
     * @returns Whether anything changed because of the activation
     */
    windowActivated(window: Window): boolean;
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
         */ this.minSize = minSize;
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
        let splitDirection: LayoutDirection = LayoutDirection.Horizontal;
        if (this.layoutDirection == LayoutDirection.Horizontal) {
            splitDirection = LayoutDirection.Vertical;
        }
        const childTile = new Tile(this);
        childTile.layoutDirection = splitDirection;
        return childTile;
    }

    // split a tile, aka add two children
    split(): void {
        this.addChild();
        this.addChild();
    }

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

    toJSON(includeWindows: boolean = false): object {
        return {
            layoutDirection: this.layoutDirection,
            size: this.size,
            children: this.children.map((c) => c.toJSON()),
            windows: includeWindows
                ? this.windows.map((w) => w.id.toString())
                : undefined,
        };
    }

    static fromJSON(json: object | string, parent?: Tile): Tile {
        const obj = typeof json === "string" ? JSON.parse(json) : json;
        const tile = new Tile(parent);
        tile.layoutDirection = obj.layoutDirection;
        tile.size = obj.size;
        for (const child of obj.children) {
            Tile.fromJSON(child, tile);
        }
        return tile;
    }
}

// easy class to derive specific engine settings from
export class BaseEngineSettings {
    getProps(): object {
        const ret: any = {};
        for (const key in this) {
            if (typeof this[key] !== "function") {
                ret[key] = this[key];
            }
        }
        return ret;
    }
    setProps(obj: any) {
        if (obj == null) return;
        for (const key in this) {
            if (obj.hasOwnProperty(key)) this[key] = obj[key];
        }
    }
}
