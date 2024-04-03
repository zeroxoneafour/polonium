# Polonium FAQ

### How do I create a log for my issue?

Follow the instructions [here](usage.html#getting-a-log).

### Why isn't <feature> from Bismuth/Sway/other WM in Polonium?

Other window managers, including Bismuth, have a much finer degree of control over how tiles are managed. Polonium works with the KWin tiling API instead of against it, which both simplifies
it and makes it less configurable. This is a delibrate design choice made to make Polonium feel more integrated with Plasma.

If you are looking for a more configurable tiling approach, I suggest [Hyprland](https://hyprland.org).

### How do I move windows with my mouse?

You can drag windows using, by default, `Meta+LMB`. Dragging windows will untile them. Holding `Shift` will allow you to place windows into tiles. Note that you cannot move windows into the root tile by using the mouse. You can also "quick tile" windows by dragging them into borders of screens, which will place them into the root tile if it is the only tile available.

### How do I move windows with my keyboard / shortcuts not working?

Make sure the shortcuts are set under the KWin tab of the Shortcuts setting. After setting the shortcuts, make sure to restart KWin. They should set by default unless a different shortcut is conflicting.

### This works on Wayland but not X11

Plasma 6 has moved to Wayland by default. Support will not be provided for X11.

### Windows appear in strange places but go back to normal after I switch desktops/rebuild the layout

KWin, by default, remembers the location of windows. It will try to put them back into these locations if the windows request it. Known windows that do include Firefox. If this conflicts with tiling, try adding a KWin rule to all windows to force ignore requested geometry.

### Shortcuts don't work in monocle layout

See [the monocle usage page](usage.html#monocle) for help with the monocle layout.

### I want to move windows using my mouse while keeping them tiled

When moving a window, KWin untiles it. I could circumvent this issue by constantly forcing the window back into the nearest available tile, but it would be unoptimized, messy, and would not integrate well with the KWin tiling system. This script tries to work with instead of against the builtin tiling system whenever possible, and therefore supports moving floated windows into tiles when using the shift key (just as our founding fathers intended).
