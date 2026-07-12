/* aur.js
 *
 * Copyright 2025 Nyarch Linux
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from "gi://GLib";
import { getSpawnCommand, isFlatpak, runSpawn, stackLog } from "./utils.js";

export const _programExistsCache = new Map();
export const _sanitizer = [" | awk '{print $1, $2, $3, $4}'"];
// pakku is not supported because it does not allow a script-friendly output and only updates query from AUR, yaourt doesn't exist anymore and aura doesn't allow simply querying updates
const supported = ['paru', 'yay', 'pikaur', 'trizen'];
const outputParseRegex = /^(\S+)\s+(\S+)\s+->\s+(\S+)$/;

/**
 * Checks if a program exists in the system PATH
 * @param program
 * @param useCache
 * @returns {Promise<boolean>}
 */
export async function programExists(program, useCache = true) {
    if (useCache && _programExistsCache.has(program)) {
        return _programExistsCache.get(program);
    }

    if (GLib.find_program_in_path(program)) {
        _programExistsCache.set(program, true);
        return true;
    }

    if (isFlatpak()) {
        const spawn_cmd = getSpawnCommand();
        const args = [...spawn_cmd, 'which', program];

        try {
            const out = await runSpawn(args).catch(() => null);
            const exists = !!(out && out.trim().length);
            _programExistsCache.set(program, exists);
            return exists;
        } catch (e) {
            _programExistsCache.set(program, false);
            return false;
        }
    }

    _programExistsCache.set(program, false);
    return false;
}

/**
 * Returns the user's AUR Helper
 * @param {Gio.Settings} settings
 * @returns {Promise<string|null>}
 */
export async function getAURHelper(settings) {
    const envChoice = (GLib.getenv('AUR_HELPER') || GLib.getenv('aur_helper') || '').trim();
    if (envChoice) {
        if (!supported.includes(envChoice)) {
            stackLog('warn', `AUR_HELPER environment variable is set to '${envChoice}', which is not a supported AUR helper. Supported helpers are: ${supported.join(', ')}`);
            return null;
        }
        if (await programExists(envChoice)) return envChoice;
    }

    const aurHelper = settings.get_string('aur-helper');
    if (aurHelper && aurHelper !== 'auto') {
        if (await programExists(aurHelper)) return aurHelper;
    }

    for (const prog of supported) {
        if (await programExists(prog)) return prog;
    }

    return null;
}

/**
 * Executes AUR updates for a given aur helper
 * @param helper
 * @returns {Promise<void>}
 */
export async function doUpdateForHelper(helper) {
    switch(helper) {
        case 'paru':
            await doParuUpdate();
            break;
        case 'yay':
            await doYayUpdate();
            break;
        case 'pikaur':
            await doPikaurUpdate();
            break;
        case 'trizen':
            await doTrizenUpdate();
            break;
        default:
            throw new Error(`Unsupported AUR helper: ${helper}`);
    }
}

export function getUpdatesForHelper(helper) {
    switch (helper) {
        case 'paru':
            return listParuUpdates();
        case 'yay':
            return listYayUpdates();
        case 'pikaur':
            return listPikaurUpdates();
        case 'trizen':
            return listTrizenUpdates();
        default:
            throw new Error(`Unsupported AUR helper: ${helper}`);
    }
}

export function doUpdate(command) {
    const spawnCommand = getSpawnCommand();
    const args = [...spawnCommand, 'gnome-terminal', '--', 'bash', '-c', command];

    return runSpawn(args, { throwOnError: true });
}

/* AUR Helper Updates */

export async function doParuUpdate() {
    return doUpdate('paru -Sua');
}
export async function doYayUpdate() {
    return doUpdate('yay -Sua');
}
export async function doPikaurUpdate() {
    return doUpdate('pikaur -Sua');
}
export async function doTrizenUpdate() {
    return doUpdate('trizen -Sua');
}

export async function listParuUpdates() {
    const spawnCommand = getSpawnCommand(true);

    const out = await runSpawn([...spawnCommand, 'paru -Qua 2>/dev/null' + _sanitizer], { throwOnError: true });
    return getAURUpdatesFromHelperOutput(out);
}
export async function listYayUpdates() {
    const spawnCommand = getSpawnCommand(true);

    const out = await runSpawn([...spawnCommand, 'yay --sudo true -Qua 2>/dev/null' + _sanitizer], { throwOnError: true });
    return getAURUpdatesFromHelperOutput(out);
}
export async function listTrizenUpdates() {
    const spawnCommand = getSpawnCommand(true);

    const out = await runSpawn([...spawnCommand, 'trizen -Qua 2>/dev/null' + _sanitizer], { throwOnError: true });
    return getAURUpdatesFromHelperOutput(out);
}

export async function listPikaurUpdates() {
    const spawnCommand = getSpawnCommand(true);

    const out = await runSpawn([...spawnCommand, 'pikaur -Qua 2>/dev/null' + _sanitizer], { throwOnError: true });
    return getAURUpdatesFromHelperOutput(out);
}

/**
 * Makes an array of Updates from the awk sanitized aur updates output
 * @param {string} out
 * @returns {{ name: string; latest: string; current: string; }[]}
 */
export function getAURUpdatesFromHelperOutput(out) {
    const updates = [];
    const lines = out.split('\n');

    for (const line of lines) {
        const match = line.match(outputParseRegex);
        if (match) {
            updates.push({
                name: match[1],
                current: match[2],
                latest: match[3]
            });
        }
    }

    return updates;
}