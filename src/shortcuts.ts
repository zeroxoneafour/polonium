import { untileClient, tileClient } from "./main";
import { printDebug } from "./util";

export function retileWindow() {
    let client = workspace.activeClient;
    if (client == null) return;
    if (client.tile != null) {
        printDebug("Untiling client " + client.resourceClass, false);
        untileClient(client);
    } else {
        printDebug("Retiling client " + client.resourceClass, false);
        tileClient(client);
    }
}
