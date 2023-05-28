# Using Polonium

## Installation

Do one of the following -
* Go to the [KWin Store](https://store.kde.org/p/2042756) and download the latest `polonium.kwinscript`, then install it in KWin Scripts
* Go to KWin Scripts settings panel and Get New Scripts, then search for and select Polonium

## Configuration

To configure Polonium, go to KWin Scripts and click the configuration icon next to it.

Polonium requires that KWin be restarted every time the configuration is changed. Usually, you can do this by logging out and back in.

Options -
* Whitelist (check box) - Whether to use the field to the right (normally the blacklist) as a whitelist instead, and blacklist other windows
* Blacklist (line input) - Windows to not tile, or if whitelist is selected, the only windows to tile.
* Tile popup windows (check box) - Whether to tile windows marked as popup windows
* Tile borders (dropdown) - How to display borders on tiled, untiled, and selected windows
* Untile minimized (check box) - Whether to untile windows that have been minimized
* Keep tiled below (check box) - Whether to keep tiled windows below other windows
* Debug mode (check box) - Whether to spam your user journal with debug messages or not

## Getting a log

Sometimes you may have to get a log. To do this, enable debug mode in the settings. Next, restart KWin. Then, execute the following command -

```
journalctl --user --no-pager -e | grep "Polonium"
```

Logs are required for bug reports if the bug has to do with tiling.\

---

[Back](index.md)

<footer>
Polonium and its documentation is licensed under the MIT License as shown [here](https://github.com/zeroxoneafour/polonium/blob/master/license.txt)
</footer>
