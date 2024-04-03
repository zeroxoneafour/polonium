# Using Polonium

## Installation

Do one of the following -

- Go to [GitHub](https://github.com/zeroxoneafour/polonium/releases/) and download the `polonium.kwinscript` asset from a release of your choice, then install it in KWin Scripts in the settings menu
- Go to the [KWin Store](https://store.kde.org/p/2140417) and download the latest `polonium.kwinscript`, then install it in KWin Scripts
- Go to KWin Scripts settings panel and Get New Scripts, then search for and select Polonium

### Extras

Unlike Bismuth, Polonium is just a KWin Script and is not a comprehensive set of packages capable of emulating a window manager. Here are some packages and config settings I suggest for a more fluid feel.

Config settings -

* Window activation - Focus follows mouse (mouse precedence)
* Delay focus - 0ms
* Window actions modifier key - Meta

Additional (completely optional) components -

* [dbus-saver](https://github.com/zeroxoneafour/dbus-saver) - A systemd service for saving settings after logging out. **Officially supported.**
* [Active accent borders](https://github.com/nclarius/Plasma-window-decorations) - Bismuth-like borders for tiled windows. [KDE store](https://store.kde.org/p/1678088) and [AUR](https://aur.archlinux.org/packages/plasma-active-accent-decorations) packages available. **NOT officially supported.**
* [Geometry Change](https://github.com/peterfajdiga/kwin4_effect_geometry_change) - Fluid tiling animations. Available on the [KDE store](https://store.kde.org/p/2136283).

### Uninstallation

To uninstall Polonium, simply uninstall it through KWin Scripts. If you want to remove old shortcuts, edit `~/.config/kglobalshortcutsrc` and remove all mentions of Polonium. To uninstall dbus-saver,
do `cargo uninstall dbus-saver` and remove the systemd service.

## General usage

### Adding new windows

Windows will be automatically tiled unless the whitelist option is enabled. Windows in the blacklist will be excluded from either being tiled or not being tiled, depending on the whitelist option.

### Removing windows

Windows will be removed from the tiling manager automatically as well. Windows can be added or removed manually with the Retile Window shortcut (default `Meta+Shift+Space`).

### Resizing tiled windows with your keyboard

The default keybinds to resize tiled windows with your keyboard are `Meta+Ctrl+<HJKL>`. In the Half and Three Column layouts, you can only resize windows left and right. In the BTree layout, you can resize windows in all directions.

### Resizing tiled windows with your mouse

By pressing the KWin tiles key (default - `Meta+T`) a tile configuration menu will appear. Adding or removing tiles will not have a lasting effect, but resizing tiles will for engines that support it. The clients of these tiles will be automatically resized as well. In this menu, you can also adjust gaps and padding by editing the setting in the top right corner.

### Moving windows with your keyboard

By default, Polonium uses the Vim H,J,K,L for left, down, up, right as directional modifier keys. The keybinds are as follows -

- Switch focus - `Meta` + directional key
- Push window into tile - `Meta+Shift` + directional key

Note that these keybinds will only work on tiled windows.

## Configuration

To configure Polonium, go to KWin Scripts and click the configuration icon next to it.

Polonium requires that KWin be restarted every time the configuration is changed. Usually, you can do this by logging out and back in.

### General config

- Filter window titles (line input) - Window titles to filter out (ie. not tile)
- Filter processes (line input) - Processes to filter out
  - Invert (check box) - Whether to treat the filter processes input as a whitelist instead of a blacklist, and only tile things in the input

- Border visibility (dropdown) - How to display borders on tiled, untiled, and selected windows
- Tile popup windows (check box) - Whether to tile windows marked as popup windows
- Keep tiled below (check box) - Whether to keep tiled windows below other windows
- Maximize single windows (check box) - Whether to maximize solo windows on desktops. May be slightly buggy
- Auto save settings after editing tiles (check box) - 

- Resize amount (slider) - The amount to resize windows by, from 1 to 450 pixels at a time
- Callback delay (slider) - The time in milliseconds to wait before certain callbacks, such as changing tile sizes, from 1 to 200. Slower computers want more time

### Engine options

- Layout engine (dropdown) - The default tiling engine you want to use on new desktops
- Insertion point (dropdown) - Select where new windows should be inserted into the layout
- Rotate layout (check box) - Whether to rotate the layout 90 degrees (split horizontally instead of vertically)

### Debug options

- Debug mode (check box) - Whether to spam your user journal with debug messages or not. Required for logs

## Engines

The engines are specific to desktops and are cycled in this order by pressing the Polonium: Cycle layouts keybind -

1. BTree (default)
2. Half
3. Three Column
4. Monocle
5. KWin

The default engine setting determines which engine desktops will start with.

### BTree

The Binary Tree (BTree) layout is the default layout. In this layout, windows are arranged in a binary tree with each node having 2 or 0 children.
Resizing is supported on this layout, but it does not save settings when logged out through dbus-saver.

### Half

The Half layout is the simplest and best supported layout. In this layout, one side is designated as master and one side is the stack. New windows are pushed into the stack while keeping the master
window intact. Resizing is supported for the middle separator only, but the middle separation amount is saved when logged out through dbus-saver.

### Three Column

Similar to the Half layout, but with stacks on both sides of a center master window. Resizing is supported for the stacks and therefore the middle window as well, but like Half it is not supported
for individual windows. Settings are saved when logged out through dbus-saver.

### Monocle

The only layout with stacking windows, Monocle is different from all other managers in that it cannot really be manipulated without Polonium shortcuts. The insert above and right shortcuts cycle
forward, and the insert below and left shortcuts cycle back through the windows. If you lose focus, all focus shortcuts focus the top window of the stack. No settings are saved.

### KWin

The floating layout. All windows will float when entering this layout by default. Tiles can be created and resized, and windows can be manually placed inside of them. No settings are saved.

### Engine settings

Pressing the Polonium: Show Settings Dialog keybind will allow you to configure setting overrides per-desktop. All [engine options](#engine-options) are supported, and some individual engines
save additional settings. See engine documentation for details.

### Setting preservation

Installing and enabling the optional [Polonium Setting Saver Daemon](https://github.com/zeroxoneafour/dbus-saver) will allow you to preserve settings across KWin restarts on a per-desktop basis.
Note that changes to default settings will not apply if custom settings are set for the desktop already. To remove custom settings on a specific desktop, you can use the "Remove custom
settings and close" button on the settings popup.

To remove all settings and reset all desktops to the default settings, stop the systemd user service and then delete `$XDG_CONFIG_HOME/SettingSaver/settings.txt`. `$XDG_CONFIG_HOME` by default is `~/.config`.

## Getting a log

Sometimes you may have to get a log. To do this, enable debug mode in the settings. Next, restart KWin by logging out and logging back in. Then, execute the following command -

```
journalctl --user --no-pager -e | grep -i "polonium"
```

Logs are required for bug reports. Bugs without them will be marked as log needed and will not be looked into until a log is provided.
