<div align="center">

# polonium
A successor to [Bismuth](https://github.com/Bismuth-Forge/bismuth) built on KWin 5.27.

The descendant of [autotile](https://github.com/zeroxoneafour/kwin-autotile).

![hot icon](res/icon.svg)

## features
* Works in Wayland Plasma 5.27 and up
* Actual tiling backend using binary trees and decent enough code where you can mod in your own
* Edit tiles with the integrated KWin GUI
* Move and tile windows with your mouse and keyboard
* In early beta so comes pre-packaged with bugs

## limitations
* X11 support is not provided, but it may work
* Probably slow due to poor optimization

## building
Requires `tsc` and `kpackagetool5`

Commands -
* Build/Install/Start - `make`
* Build - `make build`
* Install/Reinstall - `make install`
* Start/Restart - `make start`
* Stop - `make stop`
* Uninstall/Stop - `make uninstall`
* Clean build - `make clean`
* Clean build and target - `make cleanall`

## license
MIT licensed, please bum my code if you can use it in your own projects. Make sure to give credit though!
