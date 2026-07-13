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

import GLib from 'gi://GLib';
import Gio from "gi://Gio?version=2.0";

export function isFlatpak() {
    return !!GLib.getenv("container");

}

/**
 * @typedef {Object} RunSpawnSuccessOptions
 * @property {boolean} [throwOnError] If false, the function resolves with an object describing the result instead of throwing
 * @property {{ [key: string]: string }} [extraEnv] Extra environment variables to set
 * @property {number} [stderrLimit] Maximum chars from stderr included into thrown Error message
 */

/**
 * @typedef {Object} RunSpawnFailureResult
 * @property {string} stdout
 * @property {string} stderr
 * @property {boolean} success
 * @property {number|null} exitStatus
 */

/**
 * @overload
 * @param {string[]} args
 * @returns {Promise<string>}
 */
/**
 * @overload
 * @param {string[]} args
 * @param {RunSpawnSuccessOptions & { throwOnError?: true }} [options]
 * @returns {Promise<string>}
 */
/**
 * @overload
 * @param {string[]} args
 * @param {RunSpawnSuccessOptions & { throwOnError: true }} options
 * @returns {Promise<string>}
 */
/**
 * @overload
 * @param {string[]} args
 * @param {RunSpawnSuccessOptions & { throwOnError: false }} options
 * @returns {Promise<RunSpawnFailureResult>}
 */
/**
 * @param {string[]} args
 * @param {RunSpawnSuccessOptions} [options]
 * @returns {Promise<string|RunSpawnFailureResult>}
 */
export async function runSpawn(args, options) {
    const opts = /** @type {RunSpawnSuccessOptions} */ (options || {});

    return new Promise((resolve, reject) => {
        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: (Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE)
            });

            launcher.setenv("LANG", "C", true);
            for (const [k, v] of Object.entries(opts.extraEnv || {})) {
                launcher.setenv(k, v, true);
            }

            const proc = launcher.spawnv(args);
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    const [, stdout, stderr] = proc.communicate_utf8_finish(res);

                    const success = proc.get_successful();
                    let exitStatus = null;

                    if (typeof proc.get_exit_status === 'function') {
                        try { exitStatus = proc.get_exit_status(); } catch (_) { exitStatus = null; }
                    }

                    if (success) {
                        if (opts.throwOnError === false) resolve({ stdout, stderr, success: true, exitStatus: 0 });
                        else resolve(stdout);
                    } else {
                        const stderrText = (stderr || '').trim();
                        if (opts.throwOnError === false) {
                            // backward-compat: resolve with an object instead of rejecting
                            resolve({ stdout, stderr: stderrText, success: false, exitStatus });
                        } else {
                            const stderrLimit = opts && opts.stderrLimit ? opts.stderrLimit : 10000;
                            const shortStderr = stderrText.length > stderrLimit ? stderrText.slice(0, stderrLimit) + '…(truncated)' : stderrText;
                            const errMsg = shortStderr || `Process exited with status ${exitStatus}`;
                            const err = new Error(errMsg);
                            err.exitStatus = exitStatus;
                            err.stderr = stderrText;
                            err.stdout = stdout;
                            reject(err);
                        }
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

export function getSpawnCommand(bash) {
    const command = [];
    if (isFlatpak()) command.push(...["flatpak-spawn", "--host"]);
    if (bash) command.push(...["bash", "-c"])
    return command;
}

/**
 * Used to log in the console with a small stack trace saying where the log was called from
 * @param {keyof Console} type The type of log to be used (console[type])
 * @param {...any} args The arguments to be logged
 */
export function stackLog(type, ...args) {
    let initiator = 'unknown place';

    const stack = (new Error()).stack;
    if (typeof stack === 'string') {
        const lines = stack.split('\n');

        for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;

            if (line.includes('stackLog@')) continue;
            if (line.includes('resource:///org/gnome/gjs/modules/')) continue;
            if (line.startsWith('Error')) continue;

            initiator = line;
            break;
        }
    }

    const fn = /** @type {((...data: any[]) => void) | undefined} */ (console[type]);
    if (typeof fn === 'function') {
        fn.call(console, ...args, '\n', `  at ${initiator}`);
    } else {
        console.log(...args, '\n', `  at ${initiator}`);
    }
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

