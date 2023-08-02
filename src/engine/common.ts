import { config, InsertionPoint } from "../util";
import { workspace } from "../index";

// dont expect nice doc comments anywhere other than here, this is the only part of the project meant for expansion

export class Direction {
    // below if false
    above: boolean;
    // left if false
    right: boolean;
    // if true, focus above/below if only one direction supported. If false, focus right/left
    primary: boolean;
    constructor(above: boolean, right: boolean, primary: boolean) {
        this.above = above;
        this.right = right;
        this.primary = primary;
    }
    toString(): string {
        return "(" + (this.above ? "above" : "below") + ", " + (this.right ? "right" : "left") + ", " + (this.primary ? "vertical" : "horizontal") + ")";
    }
}

// default config overrides
export class Settings {
    insertionPoint: InsertionPoint;
    rotation: boolean;
    constructor(qmlSettings?: Qml.Settings) {
        if (qmlSettings == undefined) {
            this.insertionPoint = config.insertionPoint;
            this.rotation = config.rotation;
        } else {
            this.insertionPoint = qmlSettings.insertionPoint;
            this.rotation = qmlSettings.rotation;
        }
    }
    get lastActiveClient(): KWin.AbstractClient | null | undefined {
        return workspace.previousActiveClient;
    }
    toQmlSettings(engine: number): Qml.Settings {
        return {
            engine: engine,
            insertionPoint: this.insertionPoint,
            rotation: this.rotation,
        };
    }
}

/**
 * Interface that can be built off of to create a custom tiling engine
 */
export interface TilingEngine {
    /**
     * Setting overrides for the current engine
     */
    settings: Settings;
    /**
     * Lays out the tiles according to the engine's organization
     *
     * @param rootTile - The root tile to modify. It will not have any children
     * @returns True if exited successfully, false otherwise
     */
    buildLayout(rootTile: KWin.RootTile): boolean;
    /**
     * Updates the size of a tile inside of the engine that is a descendant of rootTile
     * @remarks
     * The reference implementation of the engine (btree) does not use a normal tile parameter
     * This is because KWin offers no distinction between moving child tiles and their parents if the parents are shifted
     * Hopefully I can add a tile parameter in the future to make it faster
     *
     * @param rootTile - The modified root tile
     * @returns True if exited successfully, false otherwise
     */
    updateTiles(rootTile: KWin.RootTile): boolean;
    /**
     * Resize a client tile by a certain number of pixels in a direction
     * @remarks
     * Will return false if not possible to resize in that direction or on error
     * 
     * @param tile - The tile to resize
     * @param direction - The direction to resize in
     * @param amount - The amount to resize by, relative to screen size (number less than 1)
     */
    resizeTile(tile: KWin.Tile, direction: Direction, amount: number): boolean;
    /**
     * Places clients
     *
     * @returns An array of tuples built as [client, its tile] for all registered clients
     */
    placeClients(): Array<[KWin.AbstractClient, KWin.Tile | null]>;
    /**
     * Register a client into the engine
     * @remarks
     * Only takes client, it should be able to figure everything else out
     *
     * @param client - The client to register
     * @returns True if exited successfully, false otherwise
     */
    addClient(client: KWin.AbstractClient): boolean;
    /**
     * Usually used with geometryChanged to detect if the client is put into a tile
     *
     * @param client - The client to update
     * @param tile - The tile to put the client in
     * @param direction (optional) - The direction in the tile to place the client (top, bottom, etc.)
     * @returns True if exited successfully, false otherwise
     */
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile, direction?: Direction): boolean;
    /**
     * Gets the client of a tile
     * 
     * @param tile - The tile to get the client for
     * @returns The client of the tile or null if it doesn't exist
     */
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null;
    /**
     * Swap the clients in the given tiles, or "swap tiles" as it appears
     * 
     * @param tileA - The first tile
     * @param tileB - The second tile
     * @returns True if exited successfully, false otherwise
     */
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean;
    /**
     * Remove a client that has been registered
     *
     * @param client - The client to remove
     * @returns True if exited successfully, false otherwise
     */
    removeClient(client: KWin.AbstractClient): boolean;
}
