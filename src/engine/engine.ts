import { TilingEngine, Direction } from "./common";
import { config, printDebug } from "../util";
import { workspace, showDialog, createTimer } from "../index";

// engines and engine enum
import * as BTree from "./btree";
import * as Half from "./half";
import * as ThreeColumn from "./threecolumn";
import * as Monocle from "./monocle";
import * as Kwin from "./kwin";

export enum EngineTypes {
    BTree = 0,
    Half,
    ThreeColumn,
    Monocle,
    Kwin,
    // this enum member is used to loop the enum when iterating it
    _loop,
}

export class Desktop {
    screen: number;
    activity: string;
    desktop: number;
    toString(): string {
        return "(" + this.screen + ", " + this.activity + ", " + this.desktop + ")";
    }
    constructor(screen?: number, activity?: string, desktop?: number) {
        if (screen == undefined || activity == undefined || desktop == undefined) {
            this.screen = workspace.activeScreen;
            this.activity = workspace.currentActivity;
            this.desktop = workspace.currentDesktop;
        } else {
            this.screen = screen;
            this.activity = activity;
            this.desktop = desktop;
        }
    }
}

function engineForEnum(engine: EngineTypes): TilingEngine {
    switch (engine) {
        case EngineTypes.BTree:
            return new BTree.TilingEngine;
        case EngineTypes.Half:
            return new Half.TilingEngine;
        case EngineTypes.ThreeColumn:
            return new ThreeColumn.TilingEngine;
        case EngineTypes.Monocle:
            return new Monocle.TilingEngine;
        case EngineTypes.Kwin: default:
            return new Kwin.TilingEngine;
    }
}

export class EngineManager {
    engineTypes: Map<string, EngineTypes> = new Map;
    engines: Map<string, TilingEngine> = new Map;
    layoutBuilding: boolean = false;
    tileRebuildTimers: Map<KWin.RootTile, Qt.QTimer> = new Map;
    
    private createNewEngine(desktop: Desktop): TilingEngine {
        this.engineTypes.set(desktop.toString(), config.defaultEngine);
        const engine = engineForEnum(config.defaultEngine);
        this.engines.set(desktop.toString(), engine);
        return engine;
    }

    private getEngine(desktop?: Desktop): TilingEngine {
        if (desktop === undefined) {
            desktop = new Desktop();
        }
        return this.engines.get(desktop.toString()) ?? this.createNewEngine(desktop);
    }
    
    cycleEngine(desktop: Desktop): boolean {
        let engineType = this.engineTypes.get(desktop.toString());
        if (engineType == undefined) {
            printDebug("No engine found for desktop " + desktop, true);
            return false;
        }
        engineType += 1;
        engineType %= EngineTypes._loop;
        printDebug("Setting engine for " + desktop + " to engine " + EngineTypes[engineType], false);
        this.engineTypes.set(desktop.toString(), engineType);
        const engine = engineForEnum(engineType);
        this.engines.set(desktop.toString(), engine);
        showDialog(EngineTypes[engineType]);
        return true;
    }
    
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): boolean {
        // disconnect layout modified signal temporarily to stop them from interfering
        this.layoutBuilding = true;
        printDebug("Building layout for desktop " + desktop, false);
        // wipe rootTile clean
        while (rootTile.tiles.length > 0) {
            rootTile.tiles[0].remove();
        }
        const ret = this.getEngine(desktop).buildLayout(rootTile);
        // set the generated property on all tiles
        let stack: Array<KWin.Tile> = [rootTile];
        let stackNext: Array<KWin.Tile> = [];
        while (stack.length != 0) {
            for (const tile of stack) {
                tile.generated = true;
                for (let i = 0; i < tile.tiles.length; i += 1) {
                    stackNext.push(tile.tiles[i]);
                }
            }
            stack = stackNext;
            stackNext = [];
        }
        this.layoutBuilding = false;
        if (!rootTile.connected) {
            rootTile.connected = true;
            rootTile.layoutModified.connect(this.updateTilesSignal.bind(this, rootTile));
        }
        return ret;
    }

    private updateTilesSignal(rootTile: KWin.RootTile): void {
        // do not execute while layout is building
        if (this.layoutBuilding) return;
        if (!this.tileRebuildTimers.has(rootTile)) {
            printDebug("Creating tile update timer", false);
            this.tileRebuildTimers.set(rootTile, createTimer());
            const timer = this.tileRebuildTimers.get(rootTile)!;
            timer.repeat = false;
            timer.triggered.connect(this.updateTiles.bind(this, rootTile));
            timer.interval = config.timerDelay;
        }
        this.tileRebuildTimers.get(rootTile)!.restart();
    }

    updateTiles(rootTile: KWin.RootTile): boolean {
        // do not execute while layout is building
        if (this.layoutBuilding) return true;
        // should work as you can only modify tiles on the current desktop
        const desktop = new Desktop;
        printDebug("Updating tiles for desktop " + desktop, false);
        return this.getEngine(desktop).updateTiles(rootTile);
    }
    
    resizeTile(tile: KWin.Tile, direction: Direction, amount: number): boolean {
        // set layoutBuilding to prevent updateTiles from being called
        this.layoutBuilding = true;
        // there are some new things that go on behind the scenes
        // all of the engines deal with sizes in relatives (QRectF) but the amount given in the function is now in pixels
        // this means some new math must be added, putting it here so that the engine code can remain simple across new engines as well
        const desktop = new Desktop;
        const parent = tile.parent;
        // cant even resize root tile so yeah
        if (parent == null) return false;
        // convert pixels into a relative size based on the parent
        let relativeAmount = 0;
        // resizing vertically
        if (direction.primary == true) {
            relativeAmount = amount / parent.absoluteGeometry.height;
        } else { // horizontally
            relativeAmount = amount / parent.absoluteGeometry.width;
        }
        printDebug("Resizing tile " + tile.absoluteGeometry + " in direction " + direction + " by " + amount + " pixels on desktop " + desktop, false);
        const ret = this.getEngine(desktop).resizeTile(tile, direction, relativeAmount);
        this.layoutBuilding = false;
        return ret;
    }
    
    placeClients(desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile | null]> {
        printDebug("Placing clients for desktop " + desktop, false);
        return this.getEngine(desktop).placeClients();
    }
    
    addClient(client: KWin.AbstractClient, optionalDesktop?: Desktop): boolean {
        let desktops: Array<Desktop> = new Array;
        if (!optionalDesktop) {
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
        } else {
            desktops.push(optionalDesktop);
        }
        for (const desktop of desktops) {
            printDebug("Adding " + client.resourceClass + " to desktop " + desktop, false);
            if (!this.getEngine(desktop).addClient(client)) {
                return false;
            }
        }
        return true;
    }
    
    updateClientDesktop(client: KWin.AbstractClient, oldDesktops: Array<Desktop>): boolean {
        printDebug("Updating desktop for client " + client.resourceClass, false);
        let newDesktops = new Array<Desktop>();
        if (client.desktop == -1) {
            for (let i = 0; i < workspace.desktops; i += 1) {
                for (const activity of client.activities) {
                    const desktop = new Desktop(client.screen, activity, i);
                    newDesktops.push(desktop);
                }
            }
        } else {
            for (const activity of client.activities) {
                const desktop = new Desktop(client.screen, activity, client.desktop);
                newDesktops.push(desktop);
            }
        }
        // have to do this because of js object equality
        let newDesktopsStrings = newDesktops.map(x => x.toString());
        let oldDesktopsStrings = oldDesktops.map(x => x.toString());
        for (const desktop of oldDesktops) {
            // do not retile on desktops that the window is already on
            if (newDesktopsStrings.includes(desktop.toString())) continue;
            if (!this.removeClient(client, desktop)) {
                return false;
            }
        }
        for (const desktop of newDesktops) {
            // do not readd client to windows it is on
            if (oldDesktopsStrings.includes(desktop.toString())) continue;
            if (!this.addClient(client, desktop)) {
                return false;
            }
        }
        return true;
    }
    
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile, direction?: Direction): boolean {
        printDebug("Placing " + client.resourceClass + " in " + tile.absoluteGeometry + " with direction " + direction, false);
        return this.getEngine().putClientInTile(client, tile, direction);
    }
    
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null {
        printDebug("Getting client of " + tile.absoluteGeometry, false);
        return this.getEngine().clientOfTile(tile);
    }
    
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean {
        printDebug("Swapping clients of " + tileA.absoluteGeometry + " and " + tileB.absoluteGeometry, false);
        return this.getEngine().swapTiles(tileA, tileB);
    }
    
    removeClient(client: KWin.AbstractClient, optionalDesktop?: Desktop): boolean {
        let desktops: Array<Desktop> = new Array;
        if (!optionalDesktop) {
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
        } else {
            desktops.push(optionalDesktop);
        }
        for (const desktop of desktops) {
            printDebug("Removing " + client.resourceClass + " from desktop " + desktop, false);
            if (!this.getEngine(desktop).removeClient(client)) {
                return false;
            }
        }
        return true;
    }
}
