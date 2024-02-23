// actions/basic.ts - Basic actions performed by the window manager, such as adding or deleting clients

import * as Kwin from "kwin-api";
import { Controller } from "../";
import Log from "../../util/log";
import Config, { Borders } from "../../util/config";
import { attachClientHooks } from "./clienthooks";

function doTileWindow(c: Kwin.Window): boolean {
    if (
        c.normalWindow &&
        !((c.popupWindow || c.transient) && !Config.tilePopups)
    ) {
        // check for things like max/min/fullscreen
        if (c.fullScreen || c.minimized) {
            return false;
        }
        // check if caption/resourceclass is substring as well
        for (const s of Config.filterProcess) {
            if (s.length > 0 && c.resourceClass.includes(s)) {
                return false;
            }
        }
        for (const s of Config.filterCaption) {
            if (s.length > 0 && c.caption.includes(s)) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

export function clientAdded(
    this: Controller,
    client: Kwin.Window,
) {
    if (!doTileClient(client)) {
        Log.debug("Not tiling client", client.resourceClass);
        return;
    }
    if (Config.borders == Borders.NoAll) {
        client.noBorder = true;
    }
    attachClientHooks.bind(this)(client);
    this.driverManager.addClient(client);
    this.driverManager.rebuildLayout();
}

export function windowRemoved(this: Controller, window: Kwin.Window) {
    this.driverManager.removeClient(window);
    this.driverManager.rebuildLayout();
}

export function currentDesktopChange(this: Controller) {
    // have to set this because this function temp untiles all windows
    this.driverManager.buildingLayout = true;
    // set geometry for all clients manually to avoid resizing when tiles are deleted
    for (const client of Array.from(this.workspace.clientList())) {
        if (
            client.tile != null &&
            client.activities.includes(this.workspace.lastActivity!) &&
            client.desktop == this.workspace.lastDesktop
        ) {
            const tile = client.tile;
            client.tile = null;
            client.frameGeometry = tile.absoluteGeometry;
            client.frameGeometry.width -= 2 * tile.padding;
            client.frameGeometry.height -= 2 * tile.padding;
            client.frameGeometry.x += tile.padding;
            client.frameGeometry.y += tile.padding;
        }
    }
    this.workspace.lastActivity = this.workspace.currentActivity;
    this.workspace.lastDesktop = this.workspace.currentDesktop;
    this.driverManager.rebuildLayout();
}

export function clientActivated(this: Controller, client: Kwin.Client) {
    if (Config.borders == Borders.Selected) {
        client.noBorder = false;
        if (
            this.glob.lastActiveClient != null &&
            this.glob.lastActiveClient.isTiled
        ) {
            this.glob.lastActiveClient.noBorder = true;
        }
    }
    this.glob.lastActiveClient = client;
}
