// actions/clienthook.ts - Actions performed individually on or by clients (ex. tile changes)

import * as Kwin from "../../extern/kwin";
import { QTimer } from "../../extern/qt";
import { Controller } from "../";
import { Desktop } from "../../driver";
import { GRect } from "../../util/geometry";
import Log from "../../util/log";
import Config from "../../util/config";

export function attachClientHooks(this: Controller, client: Kwin.Client) {
    if (client.hooksRegistered) {
        return;
    }
    Log.debug("Client", client.resourceClass, "hooked into script");
    client.hooksRegistered = true;
    client.previousDesktops = Desktop.fromClient(client);
    client.desktopChanged.connect(clientDesktopChanged.bind(this, client));
    client.activitiesChanged.connect(clientDesktopChanged.bind(this, client));
    client.screenChanged.connect(clientDesktopChanged.bind(this, client));
    client.tileChanged.connect(clientTileChanged.bind(this, client));
    client.fullScreenChanged.connect(
        clientFullscreenChanged.bind(this, client),
    );
    client.minimizedChanged.connect(clientMinimizedChanged.bind(this, client));
    client.clientMaximizedStateChanged.connect(
        clientMaximizedChanged.bind(this),
    );
}

function clientDesktopChanged(this: Controller, client: Kwin.Client) {
    if (client.previousDesktops == undefined || !client.isTiled) {
        return;
    }
    const currentDesktops = Desktop.fromClient(client);
    const removeDesktops = [];
    for (const desktop of client.previousDesktops) {
        if (!currentDesktops.includes(desktop)) {
            removeDesktops.push(desktop);
        }
    }
    this.manager.removeClient(client, removeDesktops);
    const addDesktops = [];
    for (const desktop of currentDesktops) {
        if (!client.previousDesktops.includes(desktop)) {
            addDesktops.push(desktop);
        }
    }
    this.manager.addClient(client, addDesktops);
    client.previousDesktops = currentDesktops;
    this.manager.rebuildLayout();
}

function clientTileChanged(this: Controller, client: Kwin.Client) {
    // dont react to geometry changes while the layout is rebuilding
    if (this.manager.buildingLayout) return;
    // dont interfere with single window maximizing
    if (client.isSingleMaximized) return;
    // have to use timers because kwin is lazy
    const timer = this.qmlObjects.root.createTimer();
    timer.triggeredOnStart = false;
    timer.repeat = false;
    timer.interval = Config.timerDelay;
    timer.triggered.connect(
        clientTileChangedCallback.bind(this, client, timer),
    );
    timer.start();
}

function clientTileChangedCallback(
    this: Controller,
    client: Kwin.Client,
    timer: QTimer,
) {
    const inManagedTile = client.tile != null && client.tile.managed == true;

    // client is moved into managed tile from outside
    if (!client.isTiled && inManagedTile && client.tile != null) {
        Log.debug(
            "Putting client",
            client.resourceClass,
            "in tile",
            client.tile!.absoluteGeometry,
        );
        attachClientHooks.bind(this)(client);
        const direction = new GRect(
            client.tile.absoluteGeometry,
        ).directionFromPoint(this.workspace.cursorPos);
        this.manager.putClientInTile(client, client.tile, direction);
    }
    // client is in a non-managed tile (move it to a managed one)
    else if (!inManagedTile && client.tile != null) {
        const center = new GRect(client.frameGeometry).center;
        let tile = this.workspace
            .tilingForScreen(client.screen)
            .bestTileForPosition(center.x, center.y);
        // if its null then its root tile (usually)
        if (tile == null) {
            tile = this.workspace.tilingForScreen(client.screen).rootTile;
        }
        if (client.isTiled) {
            this.manager.removeClient(client);
        }
        this.manager.putClientInTile(
            client,
            tile,
            new GRect(tile.absoluteGeometry).directionFromPoint(center),
        );
    }
    // client is moved out of a managed tile and into no tile
    else if (client.isTiled && !inManagedTile && client.tile == null) {
        Log.debug("Client", client.resourceClass, "was moved out of a tile");
        this.manager.removeClient(client);
    }

    this.manager.rebuildLayout(client.screen);

    // clean up timer
    timer.destroy();
}

function clientFullscreenChanged(this: Controller, client: Kwin.Client) {
    if (this.manager.buildingLayout) {
        return;
    }
    Log.debug(
        "Fullscreen on client",
        client.resourceClass,
        "set to",
        client.fullScreen,
    );
    if (client.fullScreen && client.isTiled) {
        this.manager.removeClient(client);
        this.manager.rebuildLayout(client.screen);
    } else if (!client.fullScreen && !client.isTiled) {
        if (client.lastTiledLocation != null) {
            // fancy and illegally long code to place tile in a similar position from when it was untiled
            let tile = this.workspace
                .tilingForScreen(client.screen)
                .bestTileForPosition(
                    client.lastTiledLocation.x,
                    client.lastTiledLocation.y,
                );
            // if its null then its root tile (usually)
            if (tile == null) {
                tile = this.workspace.tilingForScreen(client.screen).rootTile;
            }
            this.manager.putClientInTile(
                client,
                tile,
                new GRect(tile.absoluteGeometry).directionFromPoint(
                    client.lastTiledLocation,
                ),
            );
        } else {
            this.manager.addClient(client);
        }
        this.manager.rebuildLayout(client.screen);
    }
}

function clientMinimizedChanged(this: Controller, client: Kwin.Client) {
    // ah yes boilerplate
    Log.debug(
        "Minimized on client",
        client.resourceClass,
        "set to",
        client.minimized,
    );
    if (client.minimized && client.isTiled) {
        this.manager.removeClient(client);
        this.manager.rebuildLayout(client.screen);
    } else if (!client.minimized && !client.isTiled) {
        if (client.lastTiledLocation != null) {
            // fancy and illegally long code to place tile in a similar position from when it was untiled
            let tile = this.workspace
                .tilingForScreen(client.screen)
                .bestTileForPosition(
                    client.lastTiledLocation.x,
                    client.lastTiledLocation.y,
                );
            // if its null then its root tile (usually)
            if (tile == null) {
                tile = this.workspace.tilingForScreen(client.screen).rootTile;
            }
            this.manager.putClientInTile(
                client,
                tile,
                new GRect(tile.absoluteGeometry).directionFromPoint(
                    client.lastTiledLocation,
                ),
            );
        } else {
            this.manager.addClient(client);
        }
        this.manager.rebuildLayout(client.screen);
    }
}

function clientMaximizedChanged(
    this: Controller,
    client: Kwin.Client,
    h: boolean,
    v: boolean,
) {
    let maximized = h && v;
    client.maximized = maximized;
    Log.debug("Maximized on client", client.resourceClass, "set to", maximized);
    // root tile applies with "maximize single windows" and should be completely discarded
    if (client.isSingleMaximized) {
        client.tile = null;
        return;
    }
    if (maximized && client.isTiled) {
        this.manager.removeClient(client);
    } else if (!maximized && !client.isTiled) {
        if (client.lastTiledLocation != null) {
            // fancy and illegally long code to place tile in a similar position from when it was untiled
            let tile = this.workspace
                .tilingForScreen(client.screen)
                .bestTileForPosition(
                    client.lastTiledLocation.x,
                    client.lastTiledLocation.y,
                );
            // if its null then its root tile (usually)
            if (tile == null) {
                tile = this.workspace.tilingForScreen(client.screen).rootTile;
            }
            this.manager.putClientInTile(
                client,
                tile,
                new GRect(tile.absoluteGeometry).directionFromPoint(
                    client.lastTiledLocation,
                ),
            );
        } else {
            this.manager.addClient(client);
        }
    }
    this.manager.rebuildLayout(client.screen);
}
