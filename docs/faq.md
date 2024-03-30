# Polonium FAQ

### How do I create a log for my issue?

Follow the instructions [here](usage.html#getting-a-log).

### How do I move windows with my mouse?

You can drag windows using, by default, `Meta+LMB`. Dragging windows will untile them. Holding `Shift` will allow you to place windows into tiles. Note that you cannot move windows into the root tile by using the mouse.

### How do I move windows with my keyboard / shortcuts not working?

Make sure the shortcuts are set under the KWin tab of the Shortcuts setting. After setting the shortcuts, make sure to restart KWin. They should set by default unless a different shortcut is conflicting.

### This works on Wayland but not X11

X11 is not officially supported, but you can drop an issue and I can see if I can fix it. Include a log! If I personally don't encounter the error, there is a good chance it will not be fixed.

### Windows appear in strange places but go back to normal after I switch desktops/rebuild the layout

KWin, by default, remembers the location of windows. It will try to put them back into these locations if the windows request it. Known windows that do include Firefox. If this conflicts with tiling, try adding a KWin rule to all windows to force ignore requested geometry.

### Shortcuts don't work in monocle layout

See [the monocle usage page](usage.html#monocle) for help with the monocle layout.

### I want to move windows using my mouse while keeping them tiled

When moving a window, KWin untiles it. I could circumvent this issue by constantly forcing the window back into the nearest available tile, but it would be unoptimized, messy, and would not integrate well with the KWin tiling system. This script tries to work instead of against the builtin tiling system whenever possible, and therefore supports moving floated windows into tiles when using the shift key (just as our founding fathers intended).
