// actions/basic.ts - Basic actions performed by the window manager, such as adding or deleting clients

import * as Kwin from "../../extern/kwin";
import { Controller } from "../";
import Log from "../../util/log";
import Config, { Borders } from "../../util/config";
import { attachClientHooks } from "./clienthooks";

function doTileClient(c: Kwin.Client): boolean
{
    if (c.normalWindow && !((c.popupWindow || c.transient) && !Config.tilePopups))
    {
        // check for things like max/min/fullscreen
        if (c.fullscreen || c.minimized)
        {
            return false;
        }
        // check if caption/resourceclass is substring as well
        for (const s of Config.filterProcess)
        {
            if (s.length > 0 && c.resourceClass.includes(s))
            {
                return false;
            }
        }
        for (const s of Config.filterCaption)
        {
            if (s.length > 0 && c.caption.includes(s))
            {
                return false;
            }
        }
        return true;
    }
    else
    {
        return false;
    }
}

export function clientAdded(this: Controller, client: Kwin.Client, checkDoTile: boolean = true)
{
    if (checkDoTile && !doTileClient(client))
    {
        Log.debug("Not tiling client", client.resourceClass);
        return;
    }
    if (Config.borders == Borders.NoAll)
    {
        client.noBorder = true;
    }
    attachClientHooks.bind(this)(client);
    Log.debug("Tiling client", client.resourceClass);
    this.manager.addClient(client);
    this.manager.rebuildLayout();
}

export function clientRemoved(this: Controller, client: Kwin.Client)
{
    Log.debug("Untiling client", client.resourceClass);
    this.manager.removeClient(client);
    this.manager.rebuildLayout();
}

export function currentDesktopChange(this: Controller)
{
    // have to set this because this function temp untiles all windows
    this.manager.buildingLayout = true;
    // set geometry for all clients manually to avoid resizing when tiles are deleted
    for (const client of Array.from(this.workspace.clientList()))
    {
        if (client.tile != null && client.activities.includes(this.workspace.lastActivity!) && client.desktop == this.workspace.lastDesktop)
        {
            const tile = client.tile;
            client.tile = null;
            client.frameGeometry = tile.absoluteGeometry;
            client.frameGeometry.width -= 2*tile.padding;
            client.frameGeometry.height -= 2*tile.padding;
            client.frameGeometry.x += tile.padding;
            client.frameGeometry.y += tile.padding;
        }
    }
    this.workspace.lastActivity = this.workspace.currentActivity;
    this.workspace.lastDesktop = this.workspace.currentDesktop;
    this.manager.rebuildLayout();
}

export function clientActivated(this: Controller, client: Kwin.Client)
{
    if (Config.borders == Borders.Selected)
    {
        client.noBorder = false;
        if (this.glob.lastActiveClient != null && this.glob.lastActiveClient.isTiled)
        {
            this.glob.lastActiveClient.noBorder = true;            
        }
    }
    this.glob.lastActiveClient = client;
}
