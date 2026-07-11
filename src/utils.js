/* utils.js
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

/**
 * Used to log in the console with a small stack trace saying where the log was called from
 * @param {string} type The type of log to be used (console[type])
 * @param {any[]} args The arguments to be logged
 */
import GLib from 'gi://GLib';
import Gio from "gi://Gio?version=2.0";

export function is_flatpak() {
    return !!GLib.getenv("container");

}

export async function runSpawn(args, extraEnv = {}) {
    return new Promise((resolve, reject) => {
        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)
            });
            launcher.setenv("LANG", "C", true);
            for (const k of Object.keys(extraEnv)) launcher.setenv(k, extraEnv[k], true);

            const proc = launcher.spawnv(args);
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        resolve(stdout);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function get_spawn_command() {
    if (is_flatpak()) {
        return ["flatpak-spawn", "--host"];
    } else {
        return [];
    }
}

export function stackLog(type, ...args) {
    let initiator = 'unknown place';
    const e = new Error();
    if (typeof e.stack === 'string') {
        let isFirst = true;
        for (const line of e.stack.split('\n')) {
            const matches = line.match(/^\s+at\s+(.*)/);
            if (matches) {
                // first line - current function
                if (!isFirst) {
                    // second line - caller (what we are looking for)
                    initiator = matches[1];
                    break;
                }
                isFirst = false;
            }
        }
    }
    console[type](...args, '\n', `  at ${initiator}`);
}

/**
 * Compare two version strings
 * @param old The old version string
 * @param newer The new version string
 * @returns {number} -1 if the old version is greater, 1 if the new version is greater, 0 if they are equal
 */
export function compareVersions(old, newer) {
    const oldParts = old.split('.').map(Number);
    const newParts = newer.split('.').map(Number);

    for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
        const oldPart = oldParts[i] || 0;
        const newPart = newParts[i] || 0;

        if (oldPart > newPart) {
            return -1;
        } else if (oldPart < newPart) {
            return 1;
        }
    }
    return 0;
}

const _programExistsCache = new Map();
export async function programExists(program, useCache = true) {
    if (useCache && _programExistsCache.has(program)) {
        return _programExistsCache.get(program);
    }

    if (GLib.find_program_in_path(program)) {
        _programExistsCache.set(program, true);
        return true;
    }

    if (is_flatpak()) {
        const spawn_cmd = get_spawn_command();
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
 * @returns {Promise<string|null>}
 */
export async function getAURHelper() {
    const supported = ['paru', 'yay', 'pikaur', 'pakku', 'trizen', 'yaourt'];

    const envChoice = (GLib.getenv('AUR_HELPER') || GLib.getenv('aur_helper') || '').trim();
    if (envChoice) {
        if (!supported.includes(envChoice)) {
            stackLog('warn', `AUR_HELPER environment variable is set to '${envChoice}', which is not a supported AUR helper. Supported helpers are: ${supported.join(', ')}`);
            return null;
        }
        if (await programExists(envChoice)) return envChoice;
    }

    // TODO Settings

    for (const prog of supported) {
        if (await programExists(prog)) return prog;
    }

    return null;
}