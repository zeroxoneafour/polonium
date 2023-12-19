// kwin.d.ts - Declarations around the KWin API

import * as Qt from "./qt";

import { IDesktop } from "../driver";

// AbstractClient
interface BaseClient
{
    readonly minSize: Qt.QSize;
    readonly resourceClass: string;
    readonly caption: string;
    readonly desktop: number;
    readonly activities: string[];
    readonly screen: number;
    readonly normalWindow: boolean;
    readonly popupWindow: boolean;
    readonly transient: boolean;
    
    frameGeometry: Qt.QRect;
    tile: Tile | null;
    keepBelow: boolean;
    noBorder: boolean;
    fullScreen: boolean;
    minimized: boolean;
    
    setMaximize(v: boolean, h: boolean): void;
    
    desktopChanged: Qt.Signal<() => void>;
    activitiesChanged: Qt.Signal<() => void>;
    screenChanged: Qt.Signal<() => void>;
    tileChanged: Qt.Signal<() => void>;
    fullScreenChanged: Qt.Signal<() => void>;
    minimizedChanged: Qt.Signal<() => void>;
    clientMaximizedStateChanged: Qt.Signal<(c: Client, h: boolean, v: boolean) => void>;
}

// extensions on AbstractClient that make code easier to work with
export interface Client extends BaseClient
{
    // only store state of full maximization (who maximizes only directionally?)
    maximized: boolean | undefined;
    isSingleMaximized: boolean | undefined;
    previousDesktops: IDesktop[] | undefined;
    isTiled: boolean | undefined;
    lastTiledLocation: Qt.QPoint | null | undefined;
    hooksRegistered: boolean | undefined;
}

/** floating = 0
 * horizontal = 1
 * vertical = 2
*/
export type LayoutDirection = 0 | 1 | 2;

interface BaseTile
{
    tiles: Tile[];
    windows: Client[];
    readonly absoluteGeometry: Qt.QRect;
    relativeGeometry: Qt.QRect;
    layoutDirection: LayoutDirection;
    parent: Tile | null;
    padding: number;
    
    layoutModified: Qt.Signal<() => void>;
    
    split(direction: LayoutDirection): void;
    remove(): void;
}

export interface Tile extends BaseTile
{
    managed: boolean | undefined;
}

export interface RootTile extends Tile
{
    parent: null;
}

export interface TileManager
{
    rootTile: RootTile;
    
    bestTileForPosition(x: number, y: number): Tile | null;
}

interface BaseWorkspace
{
    readonly numScreens: number;
    readonly activeScreen: number;
    readonly cursorPos: Qt.QPoint;
    
    activeClient: Client | null;
    currentDesktop: number;
    desktops: number;
    currentActivity: string;
    
    clientList(): Client[];
    tilingForScreen(scr: number): TileManager;
    
    clientAdded: Qt.Signal<(c: Client) => void>;
    clientRemoved: Qt.Signal<(c: Client) => void>;
    clientActivated: Qt.Signal<(c: Client) => void>;
    currentDesktopChanged: Qt.Signal<(d: number) => void>;
    numberScreensChanged: Qt.Signal<() => void>;
}

export interface Workspace extends BaseWorkspace
{
    // things added that we need
    lastActivity: string | undefined;
    lastDesktop: number | undefined;
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
