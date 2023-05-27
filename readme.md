<div align="center">

# polonium
A successor to [Bismuth](https://github.com/Bismuth-Forge/bismuth) built on KWin 5.27.

The descendant of [autotile](https://github.com/zeroxoneafour/kwin-autotile).

![hot icon](res/logo.svg)

</div>

## features
* Works in Wayland Plasma 5.27 and up
* Actual tiling backend using binary trees and decent enough code where you can mod in your own
* In early beta so comes pre-packaged with bugs

## coming soon
* Edit tiles with the integrated KWin GUI
* Move and tile windows with your mouse and keyboard

## limitations
* X11 has been tested but is not officially supported
* Probably slow due to poor optimization

## building
Requires `tsc`, `npm`, and `kpackagetool5`

Commands -
* Build/Install/Start/Clean - `make`
* Build - `make build`
* Install/Reinstall - `make install`
* Start/Restart - `make start`
* Stop - `make stop`
* Uninstall/Stop - `make uninstall`
* Clean build - `make clean`
* Clean build and target - `make cleanall`

## license
* Majority of this project is MIT licensed, please bum my code if you can use to make something better. Make sure to give credit though!
* The implementation of bidirectional map (src/extern/bimap_external.js) is MIT licensed as well by somebody else

## name
Came from a comment on my old script, you can find the script and comment [here](https://www.pling.com/p/2003956/)
