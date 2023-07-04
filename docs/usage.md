# Using Polonium

## Installation

Do one of the following -
* Go to [GitHub](https://github.com/zeroxoneafour/polonium/releases/) and download the `polonium.kwinscript` asset from a release of your choice, then install it in KWin Scripts in the settings menu
* Go to the [KWin Store](https://store.kde.org/p/2042756) and download the latest `polonium.kwinscript`, then install it in KWin Scripts
* Go to KWin Scripts settings panel and Get New Scripts, then search for and select Polonium

## General usage

### Adding new windows
Windows will be automatically tiled unless the whitelist option is enabled. Windows in the blacklist will be excluded from either being tiled or not being tiled, depending on the whitelist option.

### Removing windows
Windows will be removed from the tiling manager automatically as well

### Resizing tiled windows with your keyboard
The default keybinds to resize tiled windows with your keyboard are `Meta+Shift+<directional arrow key>`. In the Half and Three Column layouts, you can only resize windows left and right. In the BTree layout, you can resize windows in all directions.

### Resizing tiled windows with your mouse
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

### Tiling options
* Filter window titles (line input) - Window titles to filter out (ie. not tile)
* Filter processes (line input) - Processes to filter out
  - Invert (check box) - Whether to treat the filter processes input as a whitelist instead of a blacklist, and only tile things in the input
* Border visibility (dropdown) - How to display borders on tiled, untiled, and selected windows
* Tile popup windows (check box) - Whether to tile windows marked as popup windows
* Keep tiled below (check box) - Whether to keep tiled windows below other windows
* Maximize single windows (check box) - Whether to maximize solo windows on desktops. May be slightly buggy
* Unfullscreen windows when new windows are tiled (check box) - Whether to temporarily reduce windows from fullscreen when a new window is tiled
* Resize amount (slider) - The amount to resize windows by, from 1 to 450 pixels at a time
* Callback delay (slider) - The time in milliseconds to wait before callbacks to rebuild the layout or update the desktop, from 1 to 200. Slower computers want more time
* Default engine (dropdown) - The default tiling engine you want to use on new desktops
* BTree Insertion Point (dropdown) - Select where new windows should be inserted into the binary tree representation

### Debug options
* Debug mode (check box) - Whether to spam your user journal with debug messages or not

## Engines

The engines are specific to desktops and are cycled in this order by pressing the Polonium: Cycle layouts keybind -
1. BTree - Breadth-first binary tree engine, sort of balances windows
2. Half - Put one main window on the left and several on the right. Can also be the other way around
3. Three Column - Put one main window in the center and some on the left and right
4. Monocle - Place all of your windows in the center and stack them on top of each other
5. KWin - Float windows, but keep the Kwin tiling system intact so you can place them as you want and preserve their locations

The default engine setting determines which engine desktops will start with.

## Getting a log

Sometimes you may have to get a log. To do this, enable debug mode in the settings. Next, restart KWin. Then, execute the following command -

```
journalctl --user --no-pager -e | grep "Polonium"
```

Logs are required for bug reports if the bug has to do with tiling.
