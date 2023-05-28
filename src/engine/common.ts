// dont expect nice doc comments anywhere other than here, this is the only part of the project meant for expansion

/**
 * Class for current screen config
 */
export class Desktop {
    screen: number = workspace.activeScreen;
    activity: string = workspace.currentActivity;
    desktop: number = workspace.currentDesktop;
    toString(): string {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
}

/**
 * Interface that can be built off of to create a custom tiling engine
 */
export interface TilingEngine {
    /**
     * Lays out the tiles according to the engine's organization
     *
     * @param rootTile - The root tile to modify
     * @param desktop - The desktop it is on
     * @returns True if exited successfully, false otherwise
     */
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): boolean;
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
     * Places clients based on desktop
     *
     * @param desktop - The desktop it is on
     * @returns An array of tuples built as [client, its tile] for all registered clients
     */
    placeClients(desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile]>;
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
     * Update the desktop of a client (not the tile or position)
     *
     * @param client - The client to update
     * @returns True if exited sucessfully, false otherwise
     */
    updateClientDesktop(client: KWin.AbstractClient): boolean;
    /**
     * Update client tile
     * Usually used with geometryChanged to detect if the client is put into a tile
     *
     * @param client - The client to update
     * @param tile - The tile to put the client in
     * @returns True if exited successfully, false otherwise
     */
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile): boolean;
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
