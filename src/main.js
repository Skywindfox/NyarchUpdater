/* main.js
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

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw?version=1';

import { NyarchupdaterWindow } from './window.js';
import { FAQWindow } from "./faq.js";
import { SettingsWindow } from "./settings.js";

pkg.initGettext();
pkg.initFormat();

export const NyarchupdaterApplication = GObject.registerClass(
    class NyarchupdaterApplication extends Adw.Application {
        constructor() {
            super({ application_id: 'moe.nyarchlinux.updater', flags: Gio.ApplicationFlags.DEFAULT_FLAGS });

            this.faqWindow = null;
            this.settingsWindow = null;

            const quitAction = new Gio.SimpleAction({ name: 'quit' });
                quitAction.connect('activate', () => {
                this.quit();
            });
            this.add_action(quitAction);
            this.set_accels_for_action('app.quit', ['<primary>q']);

            this.set_version(pkg.version);

            const showAboutAction = new Gio.SimpleAction({ name: 'about' });
            showAboutAction.connect('activate', () => {
                if (!this.active_window) return;

                const aboutWindow = Adw.AboutDialog.new_from_appdata('/moe/nyarchlinux/updater/moe.nyarchlinux.updater.metainfo.xml', pkg.version);
                aboutWindow.developers = ['Adam Billard'];
                aboutWindow.copyright = '© 2025 Nyarch Linux';
                // passing a window works
                aboutWindow.present(/** @type {any} */ (this.active_window));
            });

            const faqAction = new Gio.SimpleAction({ name: 'faq' });
            faqAction.connect('activate', () => {
                if (!this.faqWindow) {
                    this.faqWindow = new FAQWindow(this);
                }
                this.faqWindow.present();

                this.faqWindow.connect('close-request', () => {
                    this.faqWindow = null; // Clear the reference when the window is closed
                });
            });

            const settingsAction = new Gio.SimpleAction({ name: 'settings' });
            settingsAction.connect('activate', () => {
                if (!this.settingsWindow) {
                    this.settingsWindow = new SettingsWindow();
                }
                this.settingsWindow.present(/** @type {any} */ (this.active_window));
            });

            this.add_action(showAboutAction);
            this.add_action(faqAction);
            this.add_action(settingsAction);
        }

        vfunc_activate() {
            let { active_window } = this;

            if (!active_window) active_window = new NyarchupdaterWindow(this);

            active_window.present();
        }
    }
);

export function main(argv) {
    const application = new NyarchupdaterApplication();
    return application.runAsync(argv).catch((err) => {
        console.error('Failed to run the application:', err);
        return 1; // Return a non-zero exit code on error
    });
}
