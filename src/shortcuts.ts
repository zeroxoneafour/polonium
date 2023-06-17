import copy from "fast-copy";
import * as Engine from "./engine/common";
import { Desktop } from "./engine/engine";
import { engine, rebuildLayout, untileClient, tileClient } from "./main";
import { printDebug, config } from "./util";

export enum Direction {
    Above,
    Below,
    Left,
    Right,
}

export function retileWindow() {
    let client = workspace.activeClient;
    if (client == null) return;
    if (client.tile != null) {
        printDebug("Untiling client " + client.resourceClass, false);
        untileClient(client);
    } else {
        printDebug("Retiling client " + client.resourceClass, false);
        tileClient(client);
    }
}

// get tile above
function tileAbove(client: KWin.AbstractClient): KWin.Tile | null {
    // only tiled clients are supported with keybinds
    if (client.tile == null) return null;
    let geometry = client.frameGeometry;
    // qt uses top left corner as 0,0
    // 1 unit offsets so it lands inside of another tile
    let coordOffset = 1 + client.tile.padding;
    let x = geometry.x + 1;
    let y = geometry.y - coordOffset;
    let tile: KWin.Tile | null = workspace.tilingForScreen(client.screen).bestTileForPosition(x, y);
    // make sure the window does not include the client
    if (tile == null || tile.windows.includes(client)) {
        return null;
    } else {
        return tile;
    }
}

// tile below
function tileBelow(client: KWin.AbstractClient) {
    // only tiled clients are supported with keybinds
    if (client.tile == null) return null;
    let geometry = client.frameGeometry;
    // qt uses top left corner as 0,0
    // 1 unit offsets so it lands inside of another tile
    let coordOffset = 1 + geometry.height + client.tile.padding;
    let x = geometry.x + 1;
    let y = geometry.y + coordOffset;
    let tile: KWin.Tile | null = workspace.tilingForScreen(client.screen).bestTileForPosition(x, y);
    // make sure the window does not include the client
    if (tile == null || tile.windows.includes(client)) {
        return null;
    } else {
        return tile;
    }
}

// tile left
function tileLeft(client: KWin.AbstractClient) {
    // only tiled clients are supported with keybinds
    if (client.tile == null) return null;
    let geometry = client.frameGeometry;
    // qt uses top left corner as 0,0
    // 1 unit offsets so it lands inside of another tile
    let coordOffset = 1 + client.tile.padding;
    let x = geometry.x - coordOffset;
    let y = geometry.y + 1;
    let tile: KWin.Tile | null = workspace.tilingForScreen(client.screen).bestTileForPosition(x, y);
    // make sure the window does not include the client
    if (tile == null || tile.windows.includes(client)) {
        return null;
    } else {
        return tile;
    }
}

// tile right
function tileRight(client: KWin.AbstractClient) {
    // only tiled clients are supported with keybinds
    if (client.tile == null) return null;
    let geometry = client.frameGeometry;
    // qt uses top left corner as 0,0
    // 1 unit offsets so it lands inside of another tile
    let coordOffset = 1 + geometry.width + client.tile.padding;
    let x = geometry.x + coordOffset;
    let y = geometry.y + 1;
    let tile: KWin.Tile | null = workspace.tilingForScreen(client.screen).bestTileForPosition(x, y);
    // make sure the window does not include the client
    if (tile == null || tile.windows.includes(client)) {
        return null;
    } else {
        return tile;
    }
}

function tileInDirection(client: KWin.AbstractClient, direction: Direction): KWin.Tile | null {
    switch (direction) {
        case Direction.Above:
            return tileAbove(client);
        case Direction.Below:
            return tileBelow(client);
        case Direction.Left:
            return tileLeft(client);
        case Direction.Right:
            return tileRight(client);
        default:
            return null;
    }
}

export function focus(this: any, direction: Direction): void {
    let client = workspace.activeClient;
    if (client == null || client.tile == null) return;
    let tile = tileInDirection(client, direction);
    if (tile == null) return;
    let newClient = engine.clientOfTile(tile);
    if (newClient == null) return;
    printDebug("Focusing " + newClient.resourceClass + " from " + client.resourceClass, false);
    workspace.activeClient = newClient;
}

export function swap(this: any, direction: Direction) {
    let client = workspace.activeClient;
    if (client == null || client.tile == null) return;
    let tile = tileInDirection(client, direction);
    if (tile == null) return;
    printDebug("Swapping windows with " + client.resourceClass, false);
    engine.swapTiles(client.tile, tile);
    rebuildLayout();
}

export function insert(this: any, direction: Direction) {
    const client = workspace.activeClient;
    if (client == null || client.tile == null) return;
    const tile = tileInDirection(client, direction);
    if (tile == null) return;
    const tileGeometry = copy(tile.absoluteGeometry);
    untileClient(client);
    let newTile = workspace.tilingForScreen(client.screen).bestTileForPosition(tileGeometry.x + 1, tileGeometry.y + 1);
    if (newTile == null) {
        newTile = workspace.tilingForScreen(client.screen).rootTile;
    }
    printDebug("Inserting " + client.resourceClass + " in tile " + newTile, false);
    tileClient(client, newTile);
}

export function cycleEngine() {
    const desktop = new Desktop;
    const clients = engine.placeClients(desktop).map(x => x[0]);
    for (const client of clients) {
        engine.removeClient(client, desktop);
        client.wasTiled = false;
        client.tile = null;
    }
    engine.cycleEngine(desktop);
    for (const client of clients) {
        engine.addClient(client, desktop);
    }
    rebuildLayout();
}

function directionToEngineDirection(direction: Direction): Engine.Direction {
    switch (direction) {
        case Direction.Above: return new Engine.Direction(true, true, true);
        case Direction.Below: return new Engine.Direction(false, true, true);
        case Direction.Left: return new Engine.Direction(true, false, false);
        case Direction.Right: return new Engine.Direction(true, true, false);
    }
}

export function resizeTile(direction: Direction): void {
    if (workspace.activeClient == null) return;
    const activeTile = workspace.activeClient.tile;
    if (activeTile == null) return;
    engine.resizeTile(activeTile, directionToEngineDirection(direction), config.resizeAmount);
    rebuildLayout();
}
