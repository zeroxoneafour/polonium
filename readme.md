<div align="center">

# polonium
An (unofficial) successor to [Bismuth](https://github.com/Bismuth-Forge/bismuth) built on KWin 5.27.

The descendant of [autotile](https://github.com/zeroxoneafour/kwin-autotile).

![hot icon](res/logo.svg)

[![wayland: supported](https://img.shields.io/badge/Wayland-Ready-blue?logo=kde)](https://community.kde.org/KWin/Wayland)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com) 
[![ko-fi](https://img.shields.io/badge/-Support%20me%20on%20Ko--Fi-orange?logo=kofi&logoColor=white)](https://ko-fi.com/zeroxoneafour)

</div>

## features
* Works in Wayland Plasma 5.27 and up
* Actual tiling backend using binary trees and decent enough code where you can mod in your own
* Edit tile sizes with the integrated KWin GUI
* Move and tile windows with your mouse and keyboard
* Set layouts independently of desktop

## bugs/limitations
* X11 has been tested but is not officially supported
* Probably slow due to poor optimization

## building
Requires `npm` and `kpackagetool5`

Commands -
* Build/Install/Clean - `make`
* Build - `make build`
* Install/Reinstall - `make install`
* Clean build - `make clean`
* Clean build and target - `make cleanall`

## license
* Majority of this project is MIT licensed, please bum my code if you can use to make something better. Make sure to give credit though!

## name
Came from a comment on my old script, you can find the script and comment [here](https://store.kde.org/p/2003956)
