// config globals
let debug: boolean = true;
let useWhitelist: boolean = false;
let blacklist: Array<string> = "krunner, yakuake, kded, polkit".split(',').map((x: string) => x.trim());
let tilePopups: boolean = false;

let blacklistCache: Set<string>;

function printDebug(str: string, isError: boolean) {
    if (isError) {
        print("Polonium ERR: " + str);
    } else if (debug) {
        print("Polonium DBG: " + str);
    }
}

// whether to ignore a client or not
function doTileClient(client: KWin.AbstractClient): boolean {
    // if the client is not movable, dont bother
    if (client.fullScreen || !client.moveable || !client.resizeable) {
        return false;
    }
    // check if client is a popup window or transient (placeholder window)
    if ((client.popupWindow || client.transient) && !tilePopups) {
        return false;
    }
    // check if client is a dock or something
    if (client.specialWindow) {
        return false;
    }
    let c = client.resourceClass.toString();
    // check if client is in blacklist cache (to save time)
    if (blacklistCache.has(c)) {
        return useWhitelist;
    }
    // check if client is black/whitelisted
    for (const i of blacklist) {
        if (c.includes(i) || i.includes(c)) {
            blacklistCache.add(c);
            return useWhitelist;
        }
    }
    return !useWhitelist;
}
