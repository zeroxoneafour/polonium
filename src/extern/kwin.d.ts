// kwin.d.ts - Declarations around the KWin API

import * as Qt from "./qt";

// AbstractClient
export interface Client
{
    readonly minSize: Qt.QSize;
    readonly resourceClass: string;
    readonly desktop: number;
    readonly activities: string[];
    readonly screen: number;
    readonly normalWindow: boolean;
    tile: Tile;
}

export enum LayoutDirection
{
    Floating = 0,
    Horizontal,
    Vertical,
}

export interface Tile
{
    tiles: Tile[];
    windows: Client[];
    absoluteGeometry: Qt.QRect;
    relativeGeometry: Qt.QRect;
    layoutDirection: LayoutDirection;
    parent: Tile | null;
    padding: number;
    
    layoutModified: Qt.Signal<() => void>;
    
    split(direction: LayoutDirection): void;
    remove(): void;
}

export interface RootTile extends Tile
{
    parent: null;
}

export interface Workspace
{
    readonly numScreens: number;
    readonly activeScreen: number;
    
    activeClient: Client | null;
    currentDesktop: number;
    desktops: number;
    currentActivity: string;
    
    tilingForScreen(scr: number): RootTile;
    
    clientAdded: Qt.Signal<(c: Client) => void>;
    clientRemoved: Qt.Signal<(c: Client) => void>;
    currentDesktopChanged: Qt.Signal<(d: number) => void>;
}

export interface Options
{
    configChanged: Qt.Signal<() => void>;
}

export interface Api
{
    readConfig<T>(key: string, defaultValue?: T): T;
    registerShortcut(id: string, desc: string, keybind: string, callback: Function): void;
}
