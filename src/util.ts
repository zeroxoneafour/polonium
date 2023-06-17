import { EngineTypes } from "./engine/engine";

// config globals
export enum Borders {
    NoBorderAll = 0,
    NoBorderTiled,
    BorderSelected,
    BorderAll,
}

export enum BTreeInsertionPoint {
    Left = 0,
    Right,
    Active,
}

class Config {
    debug: boolean = readConfig("Debug", false);
    useProcessWhitelist: boolean = readConfig("UseProcessWhitelist", false);
    filterProcessName: Array<string> = readConfig("FilterProcessName", "krunner, yakuake, kded, polkit").split(',').map((x: string) => x.trim());
    filterClientCaption: Array<string> = readConfig("FilterClientCaption", "").split(',').map((x: string) => x.trim());
    tilePopups: boolean = readConfig("TilePopups", false);
    borders: Borders = readConfig("Borders", Borders.NoBorderTiled);
    btreeInsertionPoint: BTreeInsertionPoint = readConfig("BTreeInsertionPoint", BTreeInsertionPoint.Left);
    keepTiledBelow: boolean = readConfig("KeepTiledBelow", true);
    defaultEngine: EngineTypes = readConfig("DefaultEngine", EngineTypes.BTree);
};

export const config = new Config;

let filterProcessCache: Set<string> = new Set;
let filterCaptionCache: Set<string> = new Set;

export function printDebug(str: string, isError: boolean) {
    if (isError) {
        print("Polonium ERR: " + str);
    } else if (config.debug) {
        print("Polonium DBG: " + str);
    }
}

// whether to ignore a client or not
export function doTileClient(client: KWin.AbstractClient): boolean {
    // if the client is not movable, dont bother
    if (client.fullScreen || !client.moveable || !client.resizeable) {
        return false;
    }
    // check if client is a popup window or transient (placeholder window)
    if ((client.popupWindow || client.transient) && !config.tilePopups) {
        return false;
    }
    // check if client is a dock or something
    if (client.specialWindow) {
        return false;
    }

    // filter based on window caption (title)
    const cap = client.caption;
    if (filterCaptionCache.has(cap)) {
        return false;
    }
    for (const i of config.filterClientCaption) {
        if (i !== "" && cap.includes(i)) {
            filterProcessCache.add(cap);
            return false
        }
    }

    // filter based on process name
    const proc = client.resourceClass.toString();
    if (filterProcessCache.has(proc)) {
        return config.useProcessWhitelist;
    }
    for (const i of config.filterProcessName) {
        if (i !== "" && proc.includes(i)) {
            filterProcessCache.add(proc);
            return config.useProcessWhitelist;
        }
    }
	
    return !config.useProcessWhitelist;
}
