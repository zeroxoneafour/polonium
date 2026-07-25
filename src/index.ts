// index.ts - Entry point from QML to TypeScript

import { QmlApi, QmlObjects } from "./extern";
import { initializeController } from "./controller";
import { Display } from "./controller/event";

export function main(api: QmlApi, qmlObjects: QmlObjects) {
    Display.setWorkspace(api.workspace);
    const ctrl = initializeController(api, qmlObjects);
}
