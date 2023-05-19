// dont expect nice doc comments anywhere other than here, this is the only part of the project meant for expansion
namespace Engine {
    /**
     * Tuple that goes [screen, activity, desktop]
     */
    export type Desktop = [number, string, number]
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
         * Places clients based on root tile and desktop
         *
         * @param rootTile - The root tile to base placements off of
         * @param desktop - The desktop it is on
         * @returns An array of tuples built as [client, its tile] for all registered clients
         */
        placeClients(rootTile: KWin.RootTile, desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile]>;
        /**
         * Return the tile for a single client
         *
         * @param client - The client to tile
         * @param rootTile - A root tile that the client is registered to
         * @param desktop - The desktop the client is on
         * @returns The tile to put the client in or null if it doesn't exist
         */
        placeClient(client: KWin.AbstractClient, rootTile: KWin.RootTile, desktop: Desktop): KWin.Tile | null;
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
}
