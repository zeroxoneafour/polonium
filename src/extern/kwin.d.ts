declare namespace KWin {
    interface Api {
        readConfig(key: string, defaultValue?: any): any;
        registerShortcut(id: string, desc: string, keybind: string, callback: Function): void;
    }
    interface Toplevel {
        readonly popupWindow: boolean;
        readonly frameGeometry: Qt.QRect;
        readonly desktop: number;
        frameGeometryChanged: Signal<(client: AbstractClient, oldGeometry: Qt.QRect) => void>;
        windowClosed: Signal<(client: AbstractClient, deleted: object) => void>;
        screenChanged: Signal<() => void>;
    }
    interface AbstractClient extends Toplevel {
        readonly resizeable: boolean;
        readonly moveable: boolean;
        readonly transient: boolean;
        // added these three after looking at bismuth, lets see if they work
        readonly dialog: boolean;
        readonly splash: boolean;
        readonly utility: boolean;
        readonly specialWindow: boolean;
        tile: Tile | null;
        keepAbove: boolean;
        keepBelow: boolean;
        noBorder: boolean;
        fullScreen: boolean;
        minimized: boolean;
        activities: Array<string>;
        resourceClass: Qt.QByteArray;
        caption: string;
        // frameGeometry is read/write for abstractclient
        frameGeometry: Qt.QRect;
        screen: number;
        // custom tiling stuff that isnt in base kwin but we need it
        // has been tiled at least once
        hasBeenTiled: boolean | undefined;
        // was just tiled
        wasTiled: boolean | undefined;
        oldTile: Tile | null | undefined;
        // stuff to keep tabs on changes between locations
        oldActivities: Array<string> | undefined;
        oldDesktop: number | undefined;
        oldScreen: number | undefined;
        // for some reason, kwin doesn't include whether the window is maximized, so we add it ourselves
        maximized: MaximizeMode | undefined;
        // whether the client is the only tile on their screen or not
        isSingleTile: boolean | undefined;
        // signals
        desktopPresenceChanged: Signal<(client: AbstractClient, desktop: number) => void>;
        desktopChanged: Signal<() => void>;
        fullScreenChanged: Signal<() => void>;
        activitiesChanged: Signal<(client: AbstractClient) => void>;
        clientMaximizedStateChanged: Signal<(client: AbstractClient, mode: MaximizeMode) => void>;
        quickTileModeChanged: Signal<() => void>;
        minimizedChanged: Signal<() => void>;
        // functions
        setMaximize(vertically: boolean, horizontally: boolean): void;
    }
    interface Tile {
        tiles: Array<Tile>;
        windows: QList<AbstractClient>;
        absoluteGeometry: Qt.QRect;
        relativeGeometry: Qt.QRect;
        layoutDirection: LayoutDirection;
        oldRelativeGeometry: Qt.QRect | undefined;
        // null for root tile
        parent: Tile | null;
        padding: number;
        split(direction: LayoutDirection): void;
        remove(): void;
        // whether the engine generated the tile or not
        generated: boolean | undefined;
    }
    enum LayoutDirection {
        Floating = 0,
        Horizontal,
        Vertical,
    }
    enum MaximizeMode {
        MaximizeRestore = 0,
        MaximizeVertical,
        MaximizeHorizontal,
        MaximizeFull,
    }
    interface RootTile extends Tile {
        parent: null;
        layoutModified: Signal<() => void>;
        // extra thing used in engine
        connected: boolean | undefined;
    }
    interface TileManager {
        rootTile: RootTile;
        bestTileForPosition(x: number, y: number): Tile | null;
    }

    interface WorkspaceWrapper {
        readonly virtualScreenGeometry: Qt.QRect;
        activeClient: AbstractClient | null;
        activeScreen: number;
        currentActivity: string;
        currentDesktop: number;
        desktops: number;
        numScreens: number;
        // found it
        cursorPos: Qt.QPoint;
        tilingForScreen(desktop: number): KWin.TileManager;
        supportInformation(): string;
        clientList(): QList<AbstractClient>;
        // doesnt actually exist in api but convenient place to keep state
        tmpLastActiveClient: AbstractClient | null | undefined;
        previousActiveClient: AbstractClient | null | undefined;
        lastActiveScreen: number | undefined;
        lastActivity: string | undefined;
        lastDesktop: number | undefined;
        // signals
        clientAdded: Signal<(client: AbstractClient) => void>;
        clientRemoved: Signal<(client: AbstractClient) => void>;
        clientActivated: Signal<(client: AbstractClient) => void>;
        clientMinimized: Signal<(client: AbstractClient) => void>;
        clientUnminimized: Signal<(client: AbstractClient) => void>;
        // idk what user does
        clientFullScreenSet: Signal<(client: AbstractClient, fullscreen: boolean, user: any) => void>;
        // signals for workspace
        currentDesktopChanged: Signal<(desktop: number, client: AbstractClient) => void>;
        currentActivityChanged: Signal<(activity: string) => void>;
    }
    interface Options {
        configChanged: Signal<() => void>;
    }
}
