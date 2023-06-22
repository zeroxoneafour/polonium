import { TilingEngine, Direction } from "./common";
import { config, printDebug } from "../util";

// engines and engine enum
import * as BTree from "./btree";
import * as Half from "./half";
import * as ThreeColumn from "./threecolumn";
import * as Kwin from "./kwin";

export enum EngineTypes {
    BTree = 0,
    Half,
    ThreeColumn,
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

function engineForEnum(engine: EngineTypes): TilingEngine | null {
    switch (engine) {
        case EngineTypes.BTree:
            return new BTree.TilingEngine;
        case EngineTypes.Half:
            return new Half.TilingEngine;
        case EngineTypes.ThreeColumn:
            return new ThreeColumn.TilingEngine;
        case EngineTypes.Kwin:
            return new Kwin.TilingEngine;
        default:
            return null;
    }
}

export class EngineManager {
    engineTypes: Map<string, EngineTypes> = new Map;
    engines: Map<string, TilingEngine> = new Map;
    layoutBuilding: boolean = false;
    tileRebuildTimers: Map<KWin.RootTile, QTimer> = new Map;
    
    createNewEngine(desktop: Desktop): boolean {
        this.engineTypes.set(desktop.toString(), config.defaultEngine);
        const engine = engineForEnum(config.defaultEngine);
        if (engine == null) {
            printDebug("Could not create default engine for desktop " + desktop, true);
            return false;
        }
        this.engines.set(desktop.toString(), engine);
        return true;
    }
    
    cycleEngine(desktop: Desktop): boolean {
        let engineType = this.engineTypes.get(desktop.toString());
        if (engineType == undefined) {
            printDebug("No engine found for desktop " + desktop, true);
            return false;
        }
        engineType += 1;
        engineType %= EngineTypes._loop;
        printDebug("Setting engine for " + desktop + " to engine " + engineType, false);
        this.engineTypes.set(desktop.toString(), engineType);
        const engine = engineForEnum(engineType);
        if (engine == null) {
            printDebug("Failed to cycle engine for desktop " + desktop, true);
            return false;
        }
        this.engines.set(desktop.toString(), engine);
        return true;
    }
    
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): boolean {
        // disconnect layout modified signal temporarily to stop them from interfering
        this.layoutBuilding = true;
        printDebug("Building layout for desktop " + desktop, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return false;
            }
        }
        // wipe rootTile clean
        while (rootTile.tiles.length > 0) {
            rootTile.tiles[0].remove();
        }
        const ret = this.engines.get(desktop.toString())!.buildLayout(rootTile);
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
            this.tileRebuildTimers.set(rootTile, new QTimer());
            const timer = this.tileRebuildTimers.get(rootTile)!;
            timer.singleShot = true;
            timer.timeout.connect(this.updateTiles.bind(this, rootTile));
        }
        this.tileRebuildTimers.get(rootTile)!.start(config.timerDelay);
    }
    
    updateTiles(rootTile: KWin.RootTile): boolean {
        // do not execute while layout is building
        if (this.layoutBuilding) return true;
        // should work as you can only modify tiles on the current desktop
        const desktop = new Desktop;
        printDebug("Updating tiles for desktop " + desktop, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return false;
            }
        }
        return this.engines.get(desktop.toString())!.updateTiles(rootTile);
    }
    
    resizeTile(tile: KWin.Tile, direction: Direction, amount: number): boolean {
        // set layoutBuilding to prevent updateTiles from being called
        this.layoutBuilding = true;
        const desktop = new Desktop;
        printDebug("Resizing tile in direction " + direction + " by " + amount + " of screen space on desktop " + desktop, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return false;
            }
        }
        const ret = this.engines.get(desktop.toString())!.resizeTile(tile, direction, amount);
        this.layoutBuilding = false;
        return ret;
    }
    
    placeClients(desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile | null]> {
        printDebug("Placing clients for desktop " + desktop, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return new Array;
            }
        }
        return this.engines.get(desktop.toString())!.placeClients();
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
            if (!this.engines.has(desktop.toString())) {
                if (!this.createNewEngine(desktop)) {
                    return false;
                }
            }
            if (!this.engines.get(desktop.toString())!.addClient(client)) {
                return false;
            }
        }
        return true;
    }
    
    updateClientDesktop(client: KWin.AbstractClient, oldDesktops: Array<Desktop>): boolean {
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
        const desktop = new Desktop;
        printDebug("Placing " + client.resourceClass + " in " + tile, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return false;
            }
        }
        return this.engines.get(desktop.toString())!.putClientInTile(client, tile, direction);
    }
    
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null {
        const desktop = new Desktop;
        printDebug("Getting client of " + tile, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return null;
            }
        }
        return this.engines.get(desktop.toString())!.clientOfTile(tile);
    }
    
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean {
        const desktop = new Desktop;
        printDebug("Swapping clients of " + tileA + " and " + tileB, false);
        if (!this.engines.has(desktop.toString())) {
            if (!this.createNewEngine(desktop)) {
                return false;
            }
        }
        return this.engines.get(desktop.toString())!.swapTiles(tileA, tileB);
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
            if (!this.engines.has(desktop.toString())) {
                if (!this.createNewEngine(desktop)) {
                    return false;
                }
            }
            if (!this.engines.get(desktop.toString())!.removeClient(client)) {
                return false;
            }
        }
        return true;
    }
}
