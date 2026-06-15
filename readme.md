<div align="center">

# polonium

An autotile manager for Plasma 6.

An (unofficial) spiritual successor to [Bismuth](https://github.com/Bismuth-Forge/bismuth) built on KWin 6.

The descendant of [autotile](https://github.com/zeroxoneafour/kwin-autotile).

![hot icon](https://raw.githubusercontent.com/zeroxoneafour/polonium/master/docs/logo.svg)

[![KDE Store](https://img.shields.io/badge/KDE%20Store-Install-blue?style=for-the-badge&logo=KDE&logoColor=white&labelColor=blue)](https://store.kde.org/p/2140417)
[![GitHub](https://img.shields.io/badge/GitHub-Source%20Code-grey?style=for-the-badge&logo=GitHub&logoColor=white&labelColor=grey)](https://github.com/zeroxoneafour/polonium)

[![wayland: supported](https://img.shields.io/badge/Wayland-Ready-blue?logo=kde)](https://community.kde.org/KWin/Wayland)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)

</div>

## features

- Works in Wayland Plasma 6.4 and up (6.7 recommended)
- Custom moddable tiling engine backend
- Edit tile sizes with the integrated KWin GUI
- Move and tile windows with your mouse and keyboard
- Set layouts independently of desktop and screen
- DBus integration to save layouts and configurations after logging out

## x11

X11 is not supported. If you encounter an issue running the script on X11, make sure it is reproducible in Wayland before submitting a bug report.

## building/installing

Requires `npm` and `kpackagetool6`

Commands -

- Build/Install/Clean - `make`
- Build - `make build`
- Install/Reinstall - `make install`
- Clean build - `make clean`
- Clean build and target - `make cleanall`
- Build and install DBus service - `make dbus`

## getting logs

To get logs, do the following -

- Set log level to "Log" in settings
- Log out and log in again, and immediately reproduce the issue if possible after logging in
- Run the below command. An explanation is provided if you are wary about running it. It only works if all of the required executables are installed.
- `journalctl --since="$(journalctl -g "Polonium LOG: controller initialized" -n 1 --output=short-iso | cut -d ' ' -f1)" -g "[Pp]olonium" | wl-copy`
    1. Gets the timestamp of the first controller message
    2. Gets the journalctl log since that message
    3. Greps for Polonium-related output
    4. Copies the output into your clipboard
- If you don't have `wl-copy`, remove that part from the end of the command and run it, and manually copy the output

Depending on the issue, more precise logs may be needed. For these logs, set log level to "Debug" instead.

## license

Majority of this project is [MIT licensed](https://github.com/zeroxoneafour/polonium/blob/master/license.txt)

## name

Came from a comment on my old script, you can find the script and comment [here](https://store.kde.org/p/2003956)
