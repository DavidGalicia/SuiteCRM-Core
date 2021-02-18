/**
 * SuiteCRM is a customer relationship management program developed by SalesAgility Ltd.
 * Copyright (C) 2021 SalesAgility Ltd.
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License version 3 as published by the
 * Free Software Foundation with the addition of the following permission added
 * to Section 15 as permitted in Section 7(a): FOR ANY PART OF THE COVERED WORK
 * IN WHICH THE COPYRIGHT IS OWNED BY SALESAGILITY, SALESAGILITY DISCLAIMS THE
 * WARRANTY OF NON INFRINGEMENT OF THIRD PARTY RIGHTS.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * In accordance with Section 7(b) of the GNU Affero General Public License
 * version 3, these Appropriate Legal Notices must retain the display of the
 * "Supercharged by SuiteCRM" logo. If the display of the logos is not reasonably
 * feasible for technical reasons, the Appropriate Legal Notices must display
 * the words "Supercharged by SuiteCRM".
 */

import {RecordViewStore} from '@views/record/store/record-view/record-view.store';
import {combineLatest, Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {MetadataStore, RecordViewMetadata} from '@store/metadata/metadata.store.service';
import {map} from 'rxjs/operators';
import {LanguageStore} from '@store/language/language.store';
import {Panel, PanelRow} from 'common';
import {RecordContentConfig, RecordContentDataSource} from '@components/record-content/record-content.model';
import {Record} from 'common';
import {RecordActionManager} from '@views/record/actions/record-action-manager.service';
import {RecordActionData} from '@views/record/actions/record.action';

@Injectable()
export class RecordContentAdapter implements RecordContentDataSource {
    inlineEdit: true;

    constructor(
        protected store: RecordViewStore,
        protected metadata: MetadataStore,
        protected language: LanguageStore,
        protected actions: RecordActionManager
    ) {
    }

    getEditAction(): void {
        const data: RecordActionData = {
            store: this.store
        };

        this.actions.run('edit', this.store.getMode(), data);
    }

    getDisplayConfig(): Observable<RecordContentConfig> {

        return combineLatest(
            [this.metadata.recordViewMetadata$, this.store.mode$]
        ).pipe(
            map(([meta, mode]) => {
                const layout = this.getLayout(meta);
                const maxColumns = meta.templateMeta.maxColumns || 2;
                const tabDefs = meta.templateMeta.tabDefs;

                return {
                    layout,
                    mode,
                    maxColumns,
                    tabDefs
                } as RecordContentConfig;
            })
        );
    }

    getPanels(): Observable<Panel[]> {
        return combineLatest(
            [this.metadata.recordViewMetadata$, this.store.stagingRecord$, this.language.vm$]
        ).pipe(
            map(([meta, record, languages]) => {

                const panels = [];
                const module = (record && record.module) || '';

                meta.panels.forEach(panelDefinition => {
                    const label = this.language.getFieldLabel(panelDefinition.key.toUpperCase(), module, languages);
                    const panel = {label, key: panelDefinition.key, rows: []} as Panel;

                    panelDefinition.rows.forEach(rowDefinition => {
                        const row = {cols: []} as PanelRow;
                        rowDefinition.cols.forEach(cellDefinition => {
                            row.cols.push({...cellDefinition});
                        });
                        panel.rows.push(row);
                    });

                    panels.push(panel);
                });

                return panels;
            })
        );
    }

    getRecord(): Observable<Record> {
        return this.store.stagingRecord$;
    }

    protected getLayout(recordMeta: RecordViewMetadata): string {
        let layout = 'panels';
        if (recordMeta.templateMeta.useTabs) {
            layout = 'tabs';
        }

        return layout;
    }
}
