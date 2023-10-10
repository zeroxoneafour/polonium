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
    this.manager.addClient(client);
}

export function clientRemoved(this: Controller, client: Kwin.Client)
{
    this.manager.removeClient(client);
}
