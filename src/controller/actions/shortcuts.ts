// actions/shortcuts.ts - Shortcuts invoked directly by the user

import * as Kwin from "../../extern/kwin";
import { clientAdded, clientRemoved } from "./basic";
import { Controller } from "../";

export function retileWindow(this: Controller)
{
    const client = this.workspace.activeClient;
    if (client == null)
    {
        return;
    }
    if (client.isTiled)
    {
        clientRemoved.bind(this)(client);
    }
    else
    {
        clientAdded.bind(this)(client);
    }
}
