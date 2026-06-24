import { Direction, Tile, TilingEngineInterface, Window } from "../engine";

export class KwinEngine implements TilingEngineInterface {
    private rootTile: Tile = new Tile();
    private windowTiles: Map<Window, Tile> = new Map();
    getEngineSettings(): object {
        return {
            tiles: this.rootTile.toJSON(),
        };
    }
    setEngineSettings(settings: object): void {
        const tiles = (settings as any).tiles;
        if (tiles == undefined) {
            return;
        }
        this.rootTile = Tile.fromJSON(tiles);
    }

    buildLayout(): Tile {
        return this.rootTile;
    }
    addWindow(_window: Window, _tile?: Tile, _direction?: Direction): void {
        return;
    }
    removeWindow(window: Window): void {
        const tile = this.windowTiles.get(window);
        if (tile === undefined) {
            return;
        }
        tile.windows.splice(tile.windows.indexOf(window), 1);
    }
    placeWindow(window: Window, tile: Tile, _direction?: Direction): void {
        tile.windows.push(window);
        this.windowTiles.set(window, tile);
    }
    windowActivated(_window: Window): boolean {
        return false;
    }
    updateTiles(rootTile: Tile): void {
        this.rootTile = rootTile;
    }
}
