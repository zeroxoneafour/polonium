import { Output, Tile, VirtualDesktop, Window } from "kwin-api";
import { Direction } from "../util/geometry";
import { TilingEngineType } from "../engine";

interface TileWindowEvent {
    t: "tileWindow";
    window: Window;
    desktops: VirtualDesktop[];
    output: Output;
}
interface UntileWindowEvent {
    t: "untileWindow";
    window: Window;
    desktops: VirtualDesktop[];
    output: Output;
}
interface UpdateDriversEvent {
    t: "updateDrivers";
}
interface RebuildDesktopsEvent {
    t: "rebuildDesktops";
}
// registering a window is immediate, but removing a window must happen after all refs have been resolved
// as such, removing is an event while registering/creating is not
interface RemoveWindowEvent {
    t: "removeWindow",
    window: Window,
}
interface WindowActivatedEvent {
    t: "windowActivated",
    window: Window,
    previousWindow: Window
}
interface PlaceWindowEvent {
    t: "placeWindow",
    window: Window,
    desktop: VirtualDesktop,
    output: Output,
    tile: Tile,
    direction?: Direction
}
interface UpdateTilesEvent {
    t: "updateTiles",
    desktop: VirtualDesktop,
    output: Output
}
interface ChangeEngineEvent {
    t: "changeEngine",
    desktop: VirtualDesktop,
    output: Output,
    engineType?: TilingEngineType,
    engineSettings?: object,
}

export type Event = TileWindowEvent
    | UntileWindowEvent
    | UpdateDriversEvent
    | RebuildDesktopsEvent
    | RemoveWindowEvent
    | WindowActivatedEvent
    | PlaceWindowEvent
    | UpdateTilesEvent
    | ChangeEngineEvent;

// check if two events operate on the same widnow, desktops, and output
// ev1 must be a tileWindow event and ev2 must be an untileWindow event
export function eventsAreParallel(ev1: TileWindowEvent, ev2: UntileWindowEvent): boolean {
    if (ev1.window !== ev2.window) return false;
    if (ev1.output !== ev2.output) return false;
    if (ev1.desktops.length !== ev2.desktops.length) return false;
    for (let i = 0; i < ev1.desktops.length; i++) {
        if (ev1.desktops[i] !== ev2.desktops[i]) return false;
    }
    return true;
}