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
     * @returns nothing
     */
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): void;
    /**
     * Updates the size of a tile inside of the engine
     * @remarks
     * The reference implementation of the engine (btree) does not use a tile parameter
     * This is because KWin offers no distinction between moving child tiles and their parents if the parents are shifted
     * Hopefully I can add a tile parameter in the future to make it faster
     * 
     * Root tile should again be cached, so use it for the base tile that has had its children been modified
     *
     * @returns nothing
     */
    updateTile(): void;
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
     * @returns nothing
     */
    addClient(client: KWin.AbstractClient): void;
    /**
     * Update the desktop of a client (not the tile or position)
     *
     * @param client - The client to update
     * @returns nothing
     */
    updateClientDesktop(client: KWin.AbstractClient): void;
    /**
     * Update client tile
     * Usually used with geometryChanged to detect if the client is put into a tile
     *
     * @param client - The client to update
     * @param tile - The tile to put the client in
     * @returns nothing
     */
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile): void;
    /**
     * Remove a client that has been registered
     *
     * @param client - The client to remove
     * @returns nothing
     */
    removeClient(client: KWin.AbstractClient): void;
}
