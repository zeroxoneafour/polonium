import { QmlApi, QmlObjects } from "../extern/qml";
import { VirtualDesktop, Output } from "kwin-api";
import { Workspace } from "kwin-api/qml";
import { KwinTilingDriver } from "../driver/driver";

class Controller {
    private workspace: Workspace;
    private drivers: Map<Output, Map<VirtualDesktop, KwinTilingDriver>> = new Map();
    constructor(qmlApi: QmlApi, qmlObjects: QmlObjects) {
        this.workspace = qmlApi.workspace;
    }

    rebuildTiling(VirtualDesktop: VirtualDesktop): void {

    }
}

let controller: Controller | null = null;
export function createController(qmlApi: QmlApi, qmlObjects: QmlObjects) {
    if (controller === null) {
        controller = new Controller(qmlApi, qmlObjects);
    }
}
export function sendEvent(ev: Event) {
    if (controller === null) {
        throw new Error("Controller not initialized");
    }
    return controller;
}
