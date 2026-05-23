// controller/event.ts - Events that can be sent out

import { Window, WindowRef } from "../engine";

interface AddWindowEvent {
    type: "addWindow";
    window: Window;
    
}
interface RemoveWindowEvent {
    type: "removeWindow";
    window: WindowRef;
}
interface UpdateTileEvent {
    type: "updateTile";
    tiles: Tile[];
}
interface UpdateDesktopsEvent {

}

type Event = AddWindowEvent | RemoveWindowEvent;

// consolidate events into as few as possible
export function mergeEvents(events: Event[]): Event[] {
}