# Using Polonium

## Installation

Do one of the following -
* Go to [GitHub](https://github.com/zeroxoneafour/polonium) and download the latest `polonium.kwinscript`, then install it in KWin Scripts in the settings menu
* Go to the [KWin Store](https://store.kde.org/p/2042756) and download the latest `polonium.kwinscript`, then install it in KWin Scripts
* Go to KWin Scripts settings panel and Get New Scripts, then search for and select Polonium

## General usage

### Adding new windows
Windows will be automatically tiled unless the whitelist option is enabled. Windows in the blacklist will be excluded from either being tiled or not being tiled, depending on the whitelist option.

### Removing windows
Windows will be removed from the tiling manager automatically as well

### Resizing tiled windows
By pressing the KWin tiles key (default - `Meta+T`) a tile configuration menu will appear. Adding or removing tiles will not have a lasting effect, but resizing tiles will for engines that support it. The clients of these tiles will be automatically resized as well.

### Moving windows with your keyboard
By default, Polonium uses the Vim H,J,K,L for left, down, up, right as directional modifier keys. The keybinds are as follows -
* Switch focus - `Meta` + directional key
* Swap windows - `Ctrl+Meta` + directional key
* Push window into tile - `Meta+Shift` + directional key

Note that these keybinds will only work on tiled windows.

### Moving windows with your mouse
By default, holding shift while moving windows will cause the windows to snap into available tiles. Moving a window into a tile will cause it to tile in there. If there is only one tiled window on the screen, a tile menu will not appear. In this case, press the Untile/Retile window keybind to add it back to the tiling.

## Configuration

To configure Polonium, go to KWin Scripts and click the configuration icon next to it.

Polonium requires that KWin be restarted every time the configuration is changed. Usually, you can do this by logging out and back in.

Options -
* Whitelist (check box) - Whether to use the field to the right (normally the blacklist) as a whitelist instead, and blacklist other windows
* Blacklist (line input) - Windows to not tile, or if whitelist is selected, the only windows to tile
* Tile popup windows (check box) - Whether to tile windows marked as popup windows
* Tile borders (dropdown) - How to display borders on tiled, untiled, and selected windows
* Invert insertion (check box) - Inverts how windows are inserted on certain engines (BTree)
* Keep tiled below (check box) - Whether to keep tiled windows below other windows
* Default engine (dropdown) - The default tiling engine you want to use on new desktops
* Debug mode (check box) - Whether to spam your user journal with debug messages or not

## Engines

The engines are specific to desktops and are cycled in this order by pressing the Polonium: Cycle layouts keybind -
1. BTree - Breadth-first binary tree engine, sort of balances windows
2. Half - Put one main window on the left and several on the right. Can also be the other way around
3. Floating - Basically turns off Polonium on that desktop

The default engine setting determines which engine desktops will start with.

## Getting a log

Sometimes you may have to get a log. To do this, enable debug mode in the settings. Next, restart KWin. Then, execute the following command -

```
journalctl --user --no-pager -e | grep "Polonium"
```

Logs are required for bug reports if the bug has to do with tiling.

---

<div align="center"><sub>
Polonium and its documentation are licensed under the MIT License as shown <a href="https://github.com/zeroxoneafour/polonium/blob/master/license.txt">here</a>
</sub></div>
