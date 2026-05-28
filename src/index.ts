// index.ts - Entry point from QML to TypeScript

import { QmlApi, QmlObjects } from "./extern";
import { initializeController } from "./controller";

export function main(api: QmlApi, qmlObjects: QmlObjects) {
    const ctrl = initializeController(api, qmlObjects);
}