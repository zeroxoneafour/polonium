// actions/basic.ts - Basic actions performed by the window manager, such as adding or deleting clients

import * as Kwin from "../../extern/kwin";
import { Controller } from "../";
import Log from "../../util/log";

function tileClient(c: Kwin.Client): boolean
{
    if (c.normalWindow)
    {
        return true;
    }
    else
    {
        return false;
    }
}

export function clientAdded(this: Controller, client: Kwin.Client)
{
    if (!tileClient(client))
    {
        Log.debug("Not tiling client", client.resourceClass);
        return;
    }
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
    // set geometry for all clients manually to avoid resizing when tiles are deleted
    const clientList = this.workspace.clientList();
    for (const client of clientList)
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
