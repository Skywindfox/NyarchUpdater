/* settings.js
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
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';

export const SettingsWindow = GObject.registerClass({
    GTypeName: 'SettingsWindow',
    Template: 'resource:///moe/nyarchlinux/updater/settings.ui',
    InternalChildren: [
        'aur_updates_row',
        'aur_helper_row',
        'update_command_row'
    ]
}, class SettingsWindow extends Adw.PreferencesDialog {
    constructor() {
        super();

        this.settings = new Gio.Settings({ schema_id: 'moe.nyarchlinux.updater' });

        this.settings.bind(
            'aur-updates-enabled',
            this._aur_updates_row,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        this.settings.bind(
            'system-update-command',
            this._update_command_row,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        const helpers = ['auto', 'paru', 'yay', 'pikaur', 'trizen'];
        const currentHelper = this.settings.get_string('aur-helper');
        const initialIndex = helpers.indexOf(currentHelper);
        if (initialIndex !== -1) {
            this._aur_helper_row.selected = initialIndex;
        }

        this._aur_helper_row.connect('notify::selected', () => {
            const selectedIndex = this._aur_helper_row.selected;
            if (selectedIndex >= 0 && selectedIndex < helpers.length) {
                this.settings.set_string('aur-helper', helpers[selectedIndex]);
            }
        });
    }
});
