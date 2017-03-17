# PlatformIO

[![Join the chat at https://gitter.im/formulahendry/vscode-platformio](https://badges.gitter.im/formulahendry/vscode-platformio.svg)](https://gitter.im/formulahendry/vscode-platformio?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Integrate PlatformIO into Visual Studio Code on top of [PlatformIO Core](http://docs.platformio.org/en/stable/core.html).

## Features

* Build PlatformIO project 
* Upload firmware to devices
* Open Serial Monitor

## Prerequisites

* Install [PlatformIO Core](http://docs.platformio.org/en/stable/installation.html)

## Setup

* Use existing project

  If you have an existing PlatformIO project, open the project folder directly in VS Code

* Create new project

  In terminal, run `platformio init --board <your_board_identifier>` to initialize a new PlatformIO project, then open the project folder in VS Code. Refer to [User Guide](http://docs.platformio.org/en/stable/userguide/cmd_init.html) for `platformio init` command. For how to find Board Identifier, you could refer to [this](http://docs.platformio.org/en/stable/quickstart.html#board-identifier).

## Usage

* **Build PlatformIO project**: use shortcut `Ctrl+Alt+B`, or press `F1` and then select/type `PlatformIO: Build`, or right click the Text Editor and then click `PlatformIO: Build` in context menu

![build](images/build.gif)

* **Upload firmware to devices**: use shortcut `Ctrl+Alt+u`, or press `F1` and then select/type `PlatformIO: Upload`, or right click the Text Editor and then click `PlatformIO: Upload` in context menu

![upload](images/upload.gif)

* **Open Serial Monitor**: use shortcut `Ctrl+Alt+S`, or press `F1` and then select/type `PlatformIO: Open Serial Monitor`, or right click the Text Editor and then click `PlatformIO: Open Serial Monitor` in context menu

![openSerialMonitor](images/openSerialMonitor.gif)

## Telemetry data

By default, anonymous telemetry data collection is turned on to understand user behavior to improve this extension. To disable it, update the settings.json as below:
```json
{
    "platformio.enableTelemetry": false
}
```

## Change Log

See Change Log [here](CHANGELOG.md)