#!/bin/bash
set -e

APPID="moe.nyarchlinux.updater"
BUILD_DIR="flatpak-app"

flatpak-builder --force-clean "$BUILD_DIR" "$APPID.json"
flatpak-builder --run "$BUILD_DIR" "$APPID.json" "$APPID"