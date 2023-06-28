import { EngineTypes } from "./engine/engine";
import { Direction } from "./engine/common";
import { kwin, print } from "./index";

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
    debug: boolean = kwin.readConfig("Debug", false);
    useProcessWhitelist: boolean = kwin.readConfig("UseProcessWhitelist", false);
    filterProcessName: Array<string> = kwin.readConfig("FilterProcessName", "krunner, yakuake, kded, polkit, plasmashell").split(',').map((x: string) => x.trim());
    filterClientCaption: Array<string> = kwin.readConfig("FilterClientCaption", "").split(',').map((x: string) => x.trim());
    tilePopups: boolean = kwin.readConfig("TilePopups", false);
    borders: Borders = kwin.readConfig("Borders", Borders.NoBorderTiled);
    btreeInsertionPoint: BTreeInsertionPoint = kwin.readConfig("BTreeInsertionPoint", BTreeInsertionPoint.Left);
    keepTiledBelow: boolean = kwin.readConfig("KeepTiledBelow", true);
    defaultEngine: EngineTypes = kwin.readConfig("DefaultEngine", EngineTypes.BTree);
    maximizeSingle: boolean = kwin.readConfig("MaximizeSingle", false);
    resizeAmount: number = kwin.readConfig("ResizeAmount", 10) / 1000;
    timerDelay: number = kwin.readConfig("TimerDelay", 10);
};

export let config: Config;
export function createConfig(): void {
    config = new Config();
    printDebug("Config set - " + JSON.stringify(config), false);
}

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
    if ((client.dialog || client.splash || client.utility || client.transient) && !config.tilePopups) {
        return false;
    }
    
    // check if client is a dock or something (kwin at least marks plasmashell as this)
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

export namespace GeometryTools {
    // makable qpoint
    export class QPoint implements Qt.QPoint {
        x: number;
        y: number;
        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }
        toString(): string {
            return "GtQPoint(" + this.x + ", " + this.y + ")";
        }
    }

    export function directionFromPointInRect(rect: Qt.QRect, point: Qt.QPoint): Direction {
        const relativePoint = new QPoint(point.x - rect.x, point.y - rect.y)
        // vertical split
        if (relativePoint.x < (rect.width / 2)) { // left
            // horizontal split
            if (relativePoint.y < (rect.height / 2)) { // left top
                // position in diagonal cutting rect in half
                // math here is too complicated for me to understand for comments
                if (relativePoint.x > (rect.width * relativePoint.y / rect.height)) {
                    return new Direction(true, false, true); // left top, top leaning
                } else {
                    return new Direction(true, false, false); // left top, left leaning
                }
            } else { // left bottom
                if (relativePoint.x > (rect.width * relativePoint.y / rect.height)) {
                    return new Direction(false, false, true); // left bottom, bottom leaning
                } else {
                    return new Direction(false, false, false); // left bottom, left leaning
                }
            }
        } else { // right
            if (relativePoint.y < (rect.height / 2)) { // right top
                if (relativePoint.x < (rect.width * relativePoint.y / rect.height)) {
                    return new Direction(true, true, true); // right top, top leaning
                } else {
                    return new Direction(true, true, false); // right top, right leaning
                }
            } else { // right bottom
                if (relativePoint.x < (rect.width * relativePoint.y / rect.height)) {
                    return new Direction(false, true, true); // right bottom, bottom leaning
                } else {
                    return new Direction(false, true, false); // right bottom, right leaning
                }
            }
        }
    }
    
    export function isPointInRect(rect: Qt.QRect, point: Qt.QPoint): boolean {
        if (point.x < rect.x) return false;
        if (point.y < rect.y) return false;
        if (point.x > rect.x + rect.width) return false;
        if (point.y > rect.y + rect.height) return false;
        return true;
    }
    
    // close enough
    export function rectCenter(rect: Qt.QRect): Qt.QPoint {
        return new QPoint(rect.x + (rect.width + 1) / 2, rect.y + (rect.width + 1) / 2);
    }
    
    export function invertDirection(direction: Direction): Direction {
        return new Direction(!direction.above, !direction.right, direction.primary);
    }
}
