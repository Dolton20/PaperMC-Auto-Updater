@echo off

node easy_auto.js && (
  cd ./server-files
  java -Xmx1024M -Xms1024M -jar server.jar nogui
) || (
  PAUSE
)