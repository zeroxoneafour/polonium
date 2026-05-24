import { Output, VirtualDesktop, Window } from "kwin-api";

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

type Event = TileWindowEvent | UntileWindowEvent | UpdateDriversEvent | RebuildDesktopsEvent | RemoveWindowEvent | WindowActivatedEvent;
export default Event;