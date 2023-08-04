import copy from "fast-copy";

import { EngineManager, Desktop } from "./engine/engine";
import { Direction } from "./engine/common";
// to build with a different engine, change this to a different file
import { Borders, config, printDebug, doTileClient, clientOnDesktop, GeometryTools } from "./util";
import { workspace, createTimer, createDBusCall, dbusClientInstalled } from "./index";

// change this to set the engine, may have a feature to edit this in real time in the future
export let engine: EngineManager;
let setSettingsDbus: KWin.DBusCall;
let removeSettingsDbus: KWin.DBusCall;

export function initMain(): void {
    engine = new EngineManager;
    
    setSettingsDbus = createDBusCall();
    setSettingsDbus.service = "org.polonium.SettingSaver";
    setSettingsDbus.path = "/saver";
    setSettingsDbus.dbusInterface = "org.polonium.SettingSaver";
    setSettingsDbus.method = "SetSettings";

    removeSettingsDbus = createDBusCall();
    removeSettingsDbus.service = "org.polonium.SettingSaver";
    removeSettingsDbus.path = "/saver";
    removeSettingsDbus.dbusInterface = "org.polonium.SettingSaver";
    removeSettingsDbus.method = "RemoveSettings";

}

// boolean to stop geometrychange from interfering
let buildingLayout: boolean = false;
export function rebuildLayout(this: any, isRepeat = false) {
    buildingLayout = true;
    let repeatRebuild = false;
    let desktops = new Array<Desktop>();
    for (let i = 0; i < workspace.numScreens; i += 1) {
        let desktop = new Desktop;
        desktop.screen = i;
        desktops.push(desktop);
    }
    for (const desktop of desktops) {
        let tileManager = workspace.tilingForScreen(desktop.screen);
        if (tileManager == undefined) {
            printDebug("No root tile found for desktop " + desktop, true);
            return;
        }
        engine.buildLayout(tileManager.rootTile, desktop);
        const clientTiles = engine.placeClients(desktop);
        for (const clientTile of clientTiles) {
            const client = clientTile[0];
            const tile = clientTile[1];
            if (client == undefined) {
                printDebug("Undefined client found", true);
                continue;
            }
            if (client.isSingleTile) {
                client.setMaximize(false, false);
                repeatRebuild = true;
            }
            // maximize' single windows if enabled in config
            if (tile != null) {
                if (config.maximizeSingle && (tile == tileManager.rootTile || clientTiles.length == 1)) {
                    client.isSingleTile = true;
                    client.setMaximize(true, true);
                }
                client.wasTiled = true;
                if (config.borders == Borders.NoBorderTiled) {
                    client.noBorder = true;
                }
                if (config.keepTiledBelow) {
                    client.keepBelow = true;
                }
                if (!client.isSingleTile) {
                    client.tile = tile;
                }
                client.lastTileCenter = GeometryTools.rectCenter(tile.absoluteGeometry);
                // attempt once to resize tiles to fit larger clients
                if (tile.absoluteGeometry.width < client.minSize.width) {
                    const resizeAmount = client.minSize.width - tile.absoluteGeometry.width + (tile.padding * 2);
                    const screenArea = workspace.clientArea(6, client);
                    const tileCenter = GeometryTools.rectCenter(tile.absoluteGeometry);
                    // if on the right, resize to the left
                    if (GeometryTools.directionFromPointInRect(screenArea, tileCenter).right) {
                        engine.resizeTile(tile, new Direction(true, false, false), resizeAmount);
                    } else {
                        engine.resizeTile(tile, new Direction(true, true, false), resizeAmount);
                    }
                    repeatRebuild = true;
                }
                if (tile.absoluteGeometry.height < client.minSize.height) {
                    const resizeAmount = client.minSize.height - tile.absoluteGeometry.height + (tile.padding * 2);
                    const screenArea = workspace.clientArea(6, client);
                    const tileCenter = GeometryTools.rectCenter(tile.absoluteGeometry);
                    // if above, resize down
                    if (GeometryTools.directionFromPointInRect(screenArea, tileCenter).above) {
                        engine.resizeTile(tile, new Direction(false, true, true), resizeAmount);
                    } else {
                        engine.resizeTile(tile, new Direction(true, true, true), resizeAmount);
                    }
                    repeatRebuild = true;
                }
            } else {
                client.wasTiled = false;
                if (config.borders == Borders.NoBorderTiled) {
                    client.noBorder = false;
                }
                if (config.keepTiledBelow) {
                    client.keepBelow = false;
                }
                client.tile = null;
            }
            if (client.hasBeenTiled == undefined) {
                client.desktopChanged.connect(clientDesktopChange.bind(this, client));
                client.activitiesChanged.connect(clientDesktopChange);
                client.screenChanged.connect(clientDesktopChange.bind(this, client));
                client.minimizedChanged.connect(clientMinimized.bind(this, client));
                client.quickTileModeChanged.connect(clientQuickTiled.bind(this, client));
                client.frameGeometryChanged.connect(clientGeometryChange);
                client.clientMaximizedStateChanged.connect(clientMaximized);
                client.fullScreenChanged.connect(clientFullScreen.bind(this, client));
                client.hasBeenTiled = true;
            }
        }
    }
    buildingLayout = false;

    // workaround for setMaximize(false,false) breaking the layout on first run
    if (!isRepeat && repeatRebuild) {
        let timer = createTimer();
        timer.repeat = false;
        timer.interval = config.timerDelay
        timer.triggered.connect(rebuildLayout.bind(this, true));
        timer.start();
    }
}

export function currentDesktopChange(): void {
    // set geometry for all clients manually to avoid resizing when tiles are deleted
    const clientList = workspace.clientList();
    for (let i = 0; i < clientList.length; i += 1) {
        const client = clientList[i];
        if (client.tile != null && client.screen == workspace.lastActiveScreen && client.activities.includes(workspace.lastActivity!) && client.desktop == workspace.lastDesktop) {
            const tile = client.tile;
            client.tile = null;
            client.frameGeometry = tile.absoluteGeometry;
            client.frameGeometry.width -= tile.padding;
            client.frameGeometry.height -= tile.padding;
        }
    }
    workspace.lastActiveScreen = workspace.activeScreen;
    workspace.lastActivity = workspace.currentActivity;
    workspace.lastDesktop = workspace.currentDesktop;
    rebuildLayout();
}

export function clientDesktopChange(this: any, client: KWin.AbstractClient) {
    if (client.oldScreen == undefined || client.oldActivities == undefined || client.oldDesktop == undefined || !client.wasTiled) {
        client.oldDesktop = client.desktop;
        client.oldScreen = client.screen;
        client.oldActivities = new Array;
        for (const activity of client.activities) client.oldActivities.push(activity);
        return;
    }
    const vdesktop = client.oldDesktop;
    const oldScreen = client.oldScreen;
    const activities = copy(client.oldActivities);
    client.oldDesktop = client.desktop;
    client.oldScreen = client.screen;
    client.oldActivities = new Array;
    for (const activity of client.activities) client.oldActivities.push(activity);
    printDebug("Desktop, screen, or activity changed on " + client.resourceClass, false);
    let oldDesktops: Array<Desktop> = new Array;
    if (vdesktop == -1) {
        for (let i = 0; i < workspace.desktops; i += 1) {
            for (const activity of activities) {
                const desktop = new Desktop(oldScreen, activity, i);
                oldDesktops.push(desktop);
            }
        }
    } else {
        for (const activity of activities) {
            const desktop = new Desktop(oldScreen, activity, vdesktop);
            oldDesktops.push(desktop);
        }
    }
    engine.updateClientDesktop(client, oldDesktops);
    rebuildLayout();
}

// if tile is defined, only tiles on a single desktop
export function tileClient(this: any, client: KWin.AbstractClient, tile?: KWin.Tile, direction?: Direction): void {
    // if a tile is specified, make sure to tile normally on other desktops where the tile doesnt exist
    if (tile != undefined) {
        let currentDesktop = new Desktop;
        let desktops: Array<Desktop> = new Array;
        if (client.desktop == -1) {
            for (let i = 0; i < workspace.desktops; i += 1) {
                for (const activity of client.activities) {
                    const desktop = new Desktop(client.screen, activity, i);
                    desktops.push(desktop);
                }
            }
        } else {
            for (const activity of client.activities) {
                const desktop = new Desktop(client.screen, activity, client.desktop);
                desktops.push(desktop);
            }
        }
        for (const desktop of desktops) {
            if (desktop.toString() == currentDesktop.toString()) {
                engine.putClientInTile(client, tile, direction);
            } else {
                engine.addClient(client, desktop);
            }
        }
    } else if (client.lastTileCenter != undefined) {
        const currentDesktop = new Desktop;
        let desktops: Array<Desktop> = new Array;
        if (client.desktop == -1) {
            for (let i = 0; i < workspace.desktops; i += 1) {
                for (const activity of client.activities) {
                    const desktop = new Desktop(client.screen, activity, i);
                    desktops.push(desktop);
                }
            }
        } else {
            for (const activity of client.activities) {
                const desktop = new Desktop(client.screen, activity, client.desktop);
                desktops.push(desktop);
            }
        }
        let tile = workspace.tilingForScreen(client.screen).bestTileForPosition(client.lastTileCenter.x, client.lastTileCenter.y);
        if (tile == null) {
            tile = workspace.tilingForScreen(client.screen).rootTile;
        }
        for (const desktop of desktops) {
            if (desktop.toString() == currentDesktop.toString()) {
                const directionA = GeometryTools.directionFromPointInRect(tile.absoluteGeometry, client.lastTileCenter);
                engine.putClientInTile(client, tile, directionA);
            } else {
                engine.addClient(client, desktop);
            }
        }
    } else {
        engine.addClient(client);
    }
    if (config.unfullscreen) {
        const clientList = workspace.clientList();
        const desktop = new Desktop;
        for (let i = 0; i < clientList.length; i += 1) {
            if (clientList[i].fullScreen == true && clientOnDesktop(clientList[i], desktop)) {
                clientList[i].fullScreen = false;
                client.refullscreen = clientList[i];
            }
        }
    }
    rebuildLayout();
}

export function untileClient(this: any, client: KWin.AbstractClient, keepWasTiled: boolean = false): void {
    if (!keepWasTiled) {
        client.wasTiled = false;
    }
    client.tile = null;
    engine.removeClient(client);
    if (config.borders == Borders.NoBorderTiled) {
        client.noBorder = false;
    }
    if (config.keepTiledBelow) {
        client.keepBelow = false;
    }
    if (client.refullscreen != undefined) {
        client.refullscreen.fullScreen = true;
        client.refullscreen = undefined;
    }
    rebuildLayout();
}

export function clientGeometryChange(this: any, client: KWin.AbstractClient, _oldgeometry: Qt.QRect): void {
    // dont interfere with minimizing, maximizing, fullscreening, being the single tile, or layout building
    if (client.minimized || buildingLayout || client.maximized == true || client.fullScreen || client.isSingleTile) return;
    // because kwin doesnt have a separate handler for screen changing, add it here
    if (client.oldScreen != client.screen) {
        clientDesktopChange(client);
        return;
    }
    // only allow this function to handle movements when the client is visible
    let desktop = new Desktop;
    if (client.screen != desktop.screen || !client.activities.includes(desktop.activity) || !(client.desktop == desktop.desktop || client.desktop == -1)) return;
    // if removed from tile
    if (client.wasTiled && client.tile == null) {
        printDebug(client.resourceClass + " was moved out of a tile", false);
        untileClient(client);
    } else if (!client.wasTiled && client.tile != null) { // if added to tile
        printDebug(client.resourceClass + " was moved into a tile", false);
        tileClient(client, client.tile, GeometryTools.directionFromPointInRect(client.tile.absoluteGeometry, workspace.cursorPos));
    }
}


// What even is quick tiling
export function clientQuickTiled(this: any, client: KWin.AbstractClient): void {
    // if the client is removed from a tile or put into a generated tile, this triggers so make it not trigger
    if (client.tile == null || client.tile.generated || buildingLayout) return;
    printDebug(client.resourceClass + " has been quick tiled", false);
    const tileCenter = GeometryTools.rectCenter(client.tile.absoluteGeometry);
    untileClient(client);
    let tile = workspace.tilingForScreen(client.screen).bestTileForPosition(tileCenter.x, tileCenter.y);
    if (tile == null) {
        tile = workspace.tilingForScreen(client.screen).rootTile;
    }
    const direction = GeometryTools.directionFromPointInRect(workspace.virtualScreenGeometry, tileCenter);
    tileClient(client, tile, direction);
}


export function addClient(client: KWin.AbstractClient): void {
    client.oldDesktop = client.desktop;
    client.oldScreen = client.screen;
    client.oldActivities = new Array;
    client.maximized = false;
    client.isSingleTile = false;
    for (const activity of client.activities) client.oldActivities.push(activity);
    
    if (config.borders == Borders.NoBorderAll || config.borders == Borders.BorderSelected) {
        client.noBorder = true;
    }
    
    if (doTileClient(client)) {
        printDebug("Adding and tiling " + client.resourceClass, false);
        tileClient(client);
    } else {
        printDebug("Adding and not tiling " + client.resourceClass, false);
    }
}

export function removeClient(client: KWin.AbstractClient): void {
    printDebug(client.resourceClass + " was removed", false);
    if (client.tile != null || client.wasTiled == true) {
        untileClient(client);
    }
}

export function clientFullScreen(client: KWin.AbstractClient): void {
    if (!client.wasTiled) return;
    if (client.fullScreen) {
        printDebug(client.resourceClass + " enabled fullscreen", false);
        untileClient(client, true);
    } else {
        printDebug(client.resourceClass + " disabled fullscreen", false);
        tileClient(client);
    }
}

export function clientMinimized(client: KWin.AbstractClient): void {
    if (!client.wasTiled) return;
    if (client.minimized) {
        printDebug(client.resourceClass + " was minimized", false);
        untileClient(client, true);
    } else {
        printDebug(client.resourceClass + " was unminimized", false);
        tileClient(client);
    }
}

export function clientMaximized(client: KWin.AbstractClient, h: boolean, v: boolean) {
    const maximized = h || v;
    client.maximized = maximized;
    if (!client.wasTiled) return;
    if (client.isSingleTile && maximized == false) {
        client.isSingleTile = false;
        return;
    } else if (client.isSingleTile) {
        client.wasTiled = true;
        return;
    }
    printDebug("Maximize mode on " + client.resourceClass + " was changed to " + maximized, false);
    if (!maximized) {
        tileClient(client);
    } else {
        untileClient(client);
    }
    client.wasTiled = true;
}

// for borders
export function clientActivated(client: KWin.AbstractClient) {
    if (workspace.tmpLastActiveClient != null) {
        if (config.borders == Borders.BorderSelected) {
            workspace.tmpLastActiveClient.noBorder = true;
        }
        workspace.previousActiveClient = workspace.tmpLastActiveClient;
    }
    workspace.tmpLastActiveClient = client;
    if (config.borders == Borders.BorderSelected && client.tile != null) {
        client.noBorder = false;
    }
}

export function settingsDialogRemove(qmlDesktop: Qml.Desktop): void {
    const desktop = new Desktop(qmlDesktop.screen, qmlDesktop.activity, qmlDesktop.desktop);
    printDebug("Removing settings for desktop " + desktop.toString(), false);
    if (engine.engineTypes.get(desktop.toString()) != config.defaultEngine) {
        const clients = engine.placeClients(desktop).map(x => x[0]);
        for (const client of clients) {
            client.wasTiled = false;
            client.tile = null;
        }
        engine.setEngine(desktop, config.defaultEngine);
        for (const client of clients) {
            if (client != undefined) { 
                engine.addClient(client, desktop);
            }
        }
    } else {
        engine.removeSettings(desktop);
    }
    rebuildLayout();
    if (dbusClientInstalled) {
        removeSettingsDbus.arguments = [desktop.toString()];
        removeSettingsDbus.call();
    }
}

export function settingsDialogSave(settings: Qml.Settings, qmlDesktop: Qml.Desktop): void {
    const desktop = new Desktop(qmlDesktop.screen, qmlDesktop.activity, qmlDesktop.desktop);
    printDebug("Settings saved as " + JSON.stringify(settings) + " for desktop " + desktop.toString(), false);
    if (engine.engineTypes.get(desktop.toString()) != settings.engine) {
        const clients = engine.placeClients(desktop).map(x => x[0]);
        for (const client of clients) {
            client.wasTiled = false;
            client.tile = null;
        }
        engine.setEngine(desktop, settings.engine);
        for (const client of clients) {
            if (client != undefined) { 
                engine.addClient(client, desktop);
            }
        }
    }
    engine.setSettings(desktop, settings);
    rebuildLayout();
    if (dbusClientInstalled) {
        setSettingsDbus.arguments = [desktop.toString(), JSON.stringify(settings)];
        setSettingsDbus.call();
    }
}
