// index.ts - Entry point from QML to TypeScript

import { Api, Objects as QmlObjects } from "./extern/qml";
import Controller from "./controller";

export function main(api: Api, qmlObjects: QmlObjects)
{
    let controller = new Controller(api, qmlObjects);
    controller.init();
}
