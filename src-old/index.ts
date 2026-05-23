// index.ts - Entry point from QML to TypeScript

import { QmlApi, QmlObjects } from "./extern/qml";
import { createController } from "./controller";

export function main(api: QmlApi, qmlObjects: QmlObjects) {
    const ctrl = createController(api, qmlObjects);
}
