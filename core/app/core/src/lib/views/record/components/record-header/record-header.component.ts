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


import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {RecordViewStore} from '../../store/record-view/record-view.store';
import {ModuleNavigation} from '../../../../services/navigation/module-navigation/module-navigation.service';
import {RecordActionsAdapter} from '../../adapters/actions.adapter';
import {ActionContext} from '../../../../common/actions/action.model';
import {ButtonInterface} from '../../../../common/components/button/button.model';
import {Record} from '../../../../common/record/record.model';
import {ViewMode} from '../../../../common/views/view.model';
import {AppStateStore} from "../../../../store/app-state/app-state.store";
import {Router} from "@angular/router";

@Component({
    selector: 'scrm-record-header',
    templateUrl: 'record-header.component.html'
})
export class RecordHeaderComponent implements OnInit, OnDestroy {

    record: Record;
    mode: ViewMode = 'detail';
    loading: boolean = true;
    isScrolled: boolean = false;
    backButtonConfig: ButtonInterface;

    protected subs: Subscription[] = [];

    @HostListener('window:scroll') onScroll() {
        const scrollPosition = window.pageYOffset;
        //ScrollThreshold is set to 1em
        const scrollThreshold = parseFloat(getComputedStyle(document.documentElement).fontSize);

        if (scrollPosition > scrollThreshold) {
            //5 is just a random safezone number
            if (scrollPosition - scrollThreshold < 5) return;
            this.isScrolled = true;
        } else {
            if (scrollThreshold - scrollPosition < 5) return;
            this.isScrolled = false;
        }
    }

    constructor(
        public actionsAdapter: RecordActionsAdapter,
        protected recordViewStore: RecordViewStore,
        protected moduleNavigation: ModuleNavigation,
        protected appState: AppStateStore,
        protected router: Router
    ) {
    }

    ngOnInit(): void {
        this.mode = this.recordViewStore.getMode();
        this.setBackButtonConfig();

        this.subs.push(this.recordViewStore.mode$.subscribe(mode => {
            this.mode = mode;
        }));
        this.subs.push(this.recordViewStore.record$.subscribe(record => {
            this.record = record;
        }));

        this.subs.push(this.recordViewStore.loading$.subscribe(loading => {
            this.loading = loading;
        }))
    }

    ngOnDestroy(): void {
        this.subs.forEach(sub => sub.unsubscribe());
    }

    get moduleTitle(): string {
        const module = this.recordViewStore.vm.appData.module;
        const appListStrings = this.recordViewStore.vm.appData.language.appListStrings;
        return this.moduleNavigation.getModuleLabel(module, appListStrings);
    }

    /**
     * Get Summary template
     *
     * @returns {string} template label
     */
    getSummaryTemplate(): string {
        return this.recordViewStore.getSummaryTemplate();
    }

    /**
     * Build action context
     * @param record
     */
    getActionContext(record: Record): ActionContext {
        if (!record) {
            return {} as ActionContext
        }

        return {
            module: record.module || '',
            record
        } as ActionContext
    }

    setBackButtonConfig(): void {
        const moduleRoute= this.moduleNavigation.getModuleRoute(this.recordViewStore.vm.appData.module);

        this.backButtonConfig = {
            icon: 'paginate_previous',
            klass: 'back-button',
            onClick: () => {
                this.router.navigate([moduleRoute.route], { queryParams: { keepPagination: true } }).then();
            }
        }
    }
}
