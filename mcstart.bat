@echo off

node "%~dp0easy_auto.js" && (
  cd ./server-files
  java -Xmx1024M -Xms1024M -jar server.jar nogui
) || (
  PAUSE
)