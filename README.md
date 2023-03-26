# PaperMC-Auto-Updater

Easily setup a Paper Minecraft Server that auto updates whenever you start your server.
With optional support for auto installing and updating geyser and floodgate.
With the option of launching the windows version of playit when the server starts.


PaperMC Information: https://papermc.io/
<br>
Geyser/Floodgate Information: https://geysermc.org/
<br>
Playit Information: https://playit.gg/



## Installation Guide
### Prerequisite
Node.js: https://nodejs.org/
<br>
JDK17: https://www.oracle.com/java/technologies/downloads/#java17

### Steps
1. Clone or Download this repo and place it in the file location you want to run your server.
2. Then to run the server open ether the mcstart.bat file for windows or the mcstart file for linux.

### Extra

To use geyser or floodgate go into the config.json and set whichever ones you want to enable to true. For floodgate you may need to manually set auth-type to floodgate in geyser's config.yml located in /server-files/plugins/Geyser-Spigot/config.yml

For playit download playit.exe from https://playit.gg/download and place it anywhere and copy the path and paste it into the windows_playit section of the config.json (If there are any replace backslashes with forward slashes)
