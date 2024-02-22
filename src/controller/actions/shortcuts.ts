// actions/shortcuts.ts - Shortcuts invoked directly by the user

// ill do this later

import { clientAdded, clientRemoved } from "./basic";
import { Controller } from "../";

export class ShortcutManager {
    private ctrl: Controller;
    constructor(ctrl: Controller) {
        this.ctrl = ctrl;
    }
    retileWindow(): void {
        const window = this.ctrl.workspace.activeWindow;
        if (client == null || !this.ctrl.windowExtensions.has(client)) {
            return;
        }
        window
        if (this.ctrl) {
            clientRemoved.bind(this)(client);
        } else {
            clientAdded.bind(this)(client, false);
        }
    }

    openSettingsDialog(): void {
        const settings = this.ctrl.qmlObjects.settings;
        if (settings.isVisible()) {
            settings.hide();
        } else {
            settings.setSettings(this.ctrl.manager.getEngineConfig(this.ctrl.desktopFactory.));
            settings.show();
        }
    }
}

/*
// redefinition of direction enum because we need cardinal direction instead of gtools direction
// this shouldnt really be shared outside of here anyway except to controller
export const enum Direction {
    Above,
    Below,
    Left,
    Right,
}

function invertDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.Above:
            return Direction.Below;
        case Direction.Below:
            return Direction.Above;
        case Direction.Right:
            return Direction.Left;
        case Direction.Left:
            return Direction.Right;
    }
}

function pointAbove(client: Kwin.Client): GPoint | null {
    if (client.tile == null) {
        return null;
    }
    const geometry = client.frameGeometry;
    const coordOffset = 1 + client.tile.padding;
    const x = geometry.x + 1;
    const y = geometry.y - coordOffset;
    return new GPoint({
        x: x,
        y: y,
    });
}

function pointBelow(client: Kwin.Client): GPoint | null {
    if (client.tile == null) {
        return null;
    }
    const geometry = client.frameGeometry;
    const coordOffset = 1 + geometry.height + client.tile.padding;
    const x = geometry.x + 1;
    const y = geometry.y + coordOffset;
    return new GPoint({
        x: x,
        y: y,
    });
}

function pointLeft(client: Kwin.Client): GPoint | null {
    if (client.tile == null) {
        return null;
    }
    const geometry = client.frameGeometry;
    let coordOffset = 1 + client.tile.padding;
    let x = geometry.x - coordOffset;
    let y = geometry.y + 1;
    return new GPoint({
        x: x,
        y: y,
    });
}

function pointRight(client: Kwin.Client): GPoint | null {
    if (client.tile == null) {
        return null;
    }
    const geometry = client.frameGeometry;
    let coordOffset = 1 + geometry.width + client.tile.padding;
    let x = geometry.x + coordOffset;
    let y = geometry.y + 1;
    return new GPoint({
        x: x,
        y: y,
    });
}

function pointInDirection(
    client: Kwin.Client,
    direction: Direction,
): GPoint | null {
    switch (direction) {
        case Direction.Above:
            return pointAbove(client);
        case Direction.Below:
            return pointBelow(client);
        case Direction.Left:
            return pointLeft(client);
        case Direction.Right:
            return pointRight(client);
        default:
            return null;
    }
}

function tileInDirection(
    this: Controller,
    client: Kwin.Client,
    point: Qt.QPoint | null,
): Kwin.Tile | null {
    if (point == null) {
        return null;
    }
    return this.workspace
        .tilingForScreen(client.screen)
        .bestTileForPosition(point.x, point.y);
}

export function focus(this: Controller, direction: Direction): void {
    const client = this.workspace.activeClient;
    if (client == null) {
        return;
    }
    const tile = tileInDirection.bind(this)(
        client,
        pointInDirection(client, direction),
    );
    if (tile == null || tile.windows.length == 0) {
        return;
    }
    let newClient = tile.windows[0];
    Log.debug("Focusing", newClient.resourceClass);
    this.workspace.activeClient = newClient;
}

/* maybe bring this back in the future
export function swapActiveClient(this: Controller, direction: Direction) {
    const client = this.workspace.activeClient;
    if (client == null)
    {
        return;
    }
    const tile = tileInDirection.bind(this)(client, direction);
    if (tile == null || tile.windows.length == 0)
    {
        return;
    }
    const oldTile = client.tile!;
    const otherClient = tile.windows[0];
    Log.debug("Swapping", client.resourceClass);
    this.manager.removeClient(client);
    this.manager.removeClient(otherClient);
    this.manager.putClientInTile(client, tile);
    this.manager.putClientInTile(otherClient, oldTile);
    this.manager.rebuildLayout(client.screen);
}
*

export function insert(this: Controller, direction: Direction) {
    const client = this.workspace.activeClient;
    if (client == null) {
        return;
    }
    const point = pointInDirection(client, direction);
    if (point == null) {
        return;
    }
    Log.debug("Moving", client.resourceClass);
    this.manager.removeClient(client);
    this.manager.rebuildLayout(client.screen);
    let tile = tileInDirection.bind(this)(client, point);
    if (tile == null) {
        // usually this works
        tile = this.workspace.tilingForScreen(client.screen).rootTile;
        while (tile.tiles.length == 1) {
            tile = tile.tiles[0];
        }
    }
    this.manager.putClientInTile(
        client,
        tile,
        new GRect(tile.absoluteGeometry).directionFromPoint(point),
    );
    this.manager.rebuildLayout(client.screen);
}
*/
