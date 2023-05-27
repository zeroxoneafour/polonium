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
     * All classes that implement this trait should cache the current root tile based on buildLayout, so it is not provided in the arguments
     * Not doing this also simplifies the modifications needed to the KWin.Tile class
     * This also only handles tile resizing, so no deletion/insertion. Doing that may cause undefined behavior.
     *
     * @param tile - The tile to update
     * @returns nothing
     */
    updateTile(tile: KWin.Tile): void;
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
    registerClient(client: KWin.AbstractClient): void;
    /**
     * Update the desktop of a client (not the tile or position)
     *
     * @param client - The client to update
     * @returns nothing
     */
    updateClientDesktop(client: KWin.AbstractClient): void;
    /**
     * Update client position, which tile it is in and whether it is tiled or nothing
     * It is very important that this is called when the client geometry or position changes
     *
     * @param client - The client to update
     * @returns nothing
     */
    updateClientPosition(client: KWin.AbstractClient): void;
    /**
     * Remove a client that has been registered
     *
     * @param client - The client to remove
     * @returns nothing
     */
    removeClient(client: KWin.AbstractClient): void;
}
