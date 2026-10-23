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
    }

    // adds a child that will split perpendicularly to the parent. Returns the child
    addChild(tile?: Tile): Tile {
        let splitDirection: LayoutDirection = LayoutDirection.Horizontal;
        if (this.layoutDirection == LayoutDirection.Horizontal) {
            splitDirection = LayoutDirection.Vertical;
        }
        const childTile = tile != undefined ? tile : new Tile(this);
        childTile.parent = this;
        this.children.push(childTile);
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
                : [],
        };
    }

    // tile trees can come from dbus/disk so they are validated and bounded
    // to avoid building absurd layouts in the compositor
    static fromJSON(json: object | string, parent?: Tile): Tile {
        let obj;
        try {
            obj = typeof json === "string" ? JSON.parse(json) : json;
        } catch (_e) {
            obj = null;
        }
        return Tile.fromJSONInner(obj, parent, 0, { count: 0 });
    }

    private static fromJSONInner(
        obj: any,
        parent: Tile | undefined,
        depth: number,
        budget: { count: number },
    ): Tile {
        const tile = new Tile(parent);
        if (parent != null) {
            parent.children.push(tile);
        }
        budget.count += 1;
        if (obj == null || typeof obj !== "object") {
            return tile;
        }
        if (
            obj.layoutDirection === LayoutDirection.Horizontal ||
            obj.layoutDirection === LayoutDirection.Vertical
        ) {
            tile.layoutDirection = obj.layoutDirection;
        }
        if (Number.isFinite(obj.size) && obj.size > 0) {
            tile.size = obj.size;
        }
        if (!Array.isArray(obj.children) || depth >= maxTileDepth) {
            return tile;
        }
        for (const child of obj.children) {
            if (budget.count >= maxTileCount) {
                break;
            }
            Tile.fromJSONInner(child, tile, depth + 1, budget);
        }
        return tile;
    }
}

const maxTileDepth = 32;
const maxTileCount = 256;

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
    // only copy values that match the type of the default, as settings can come from dbus/disk
    setProps(obj: any) {
        if (obj == null || typeof obj !== "object") return;
        for (const key in this) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            const value = obj[key];
            if (typeof value !== typeof this[key]) continue;
            if (typeof value === "number" && !Number.isFinite(value)) continue;
            this[key] = value;
        }
    }
}
