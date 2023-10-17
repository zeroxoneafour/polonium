import * as Kwin from "../../extern/kwin";
import { Controller } from "../";
import { Desktop } from "../../driver";
import Log from "../../util/log";

export function attachClientHooks(this: Controller, client: Kwin.Client)
{
    client.previousDesktops = Desktop.fromClient(client);
    client.desktopChanged.connect(clientDesktopChanged.bind(this, client));
}

function clientDesktopChanged(this: Controller, client: Kwin.Client)
{
    if (client.previousDesktops == undefined || !client.wasTiled)
    {
        return;
    }
    const currentDesktops = Desktop.fromClient(client);
    const removeDesktops = [];
    for (const desktop of client.previousDesktops)
    {
        if (!currentDesktops.includes(desktop))
        {
            removeDesktops.push(desktop);
        }
    }
    this.manager.removeClient(client, removeDesktops);
    const addDesktops = [];
    for (const desktop of currentDesktops)
    {
        if (!client.previousDesktops.includes(desktop))
        {
            addDesktops.push(desktop);
        }
    }
    this.manager.addClient(client, addDesktops);
    client.previousDesktops = currentDesktops;
    this.manager.rebuildLayout();
}
