# Polonium FAQ

### How do I create a log for my issue?

Follow the instructions [here](usage.md#getting-a-log).

### How do I move windows with my mouse?

You need to hold down the KWin tile snapping key and drag the window with your mouse into one of the available tiles. By default, this key is shift.

### How do I move windows with my keyboard / shortcuts not working?

Make sure the shortcuts are set under the KWin tab of the Shortcuts setting. After setting the shortcuts, make sure to restart KWin. They should set by default unless a different shortcut is conflicting.

### Fullscreen isn't working correctly

Some apps do not handle fullscreen correctly.

### This works on Wayland but not X11

X11 is not officially supported, but you can drop an issue and I can see if I can fix it. Include a log!

### There is a latency before windows are fixed/tiles are updated OR windows will not fix/tiles won't update

You can turn the latency down to 1ms or up to 200ms in the settings, under callback delay. Higher latencies should fix issues with slow computers, but lower ones will make the script smoother.

### Windows appear in strange places but go back to normal after I switch desktops/rebuild the layout

KWin, by default, remembers the location of windows. It will try to put them back into these locations if the windows request it. Known windows that do include Firefox. If this conflicts with tiling, try adding a KWin rule to all windows to force ignore requested geometry.

---

<div align="center"><sub>
Polonium and its documentation are licensed under the MIT License as shown <a href="https://github.com/zeroxoneafour/polonium/blob/master/license.txt">here</a>
</sub></div>
