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

import {Injectable} from '@angular/core';
import {DataTypeFormatter} from '@services/formatters/data-type.formatter.service';
import {Field, FieldMap} from 'common';
import {isVoid} from 'common';
import {LanguageStore} from '@store/language/language.store';
import {StringMap} from 'common';
import get from 'lodash-es/get';


export declare type TemplateValueFilter = (value: string) => string;
export declare type TemplateFieldFilter = (value: Field) => string;

export interface TemplateValueFilterMap {
    [key: string]: TemplateValueFilter;
}

export interface TemplateFieldFilterMap {
    [key: string]: TemplateFieldFilter;
}

export interface DynamicLabelServiceInterface {
    addValuePipe(name: string, processor: TemplateValueFilter): void;

    addFieldPipe(name: string, processor: TemplateFieldFilter): void;

    parse(template: string, context: { [key: string]: string }, fields: FieldMap): string;
}

@Injectable({
    providedIn: 'root'
})
export class DynamicLabelService implements DynamicLabelServiceInterface {
    protected valuePipes: TemplateValueFilterMap = {};
    protected fieldPipes: TemplateFieldFilterMap = {};

    constructor(protected typeFormatter: DataTypeFormatter, protected language: LanguageStore) {

        this.valuePipes.int = (value: string): string => this.valueTypeFormat('int', value);
        this.valuePipes.float = (value: string): string => this.valueTypeFormat('float', value);
        this.valuePipes.date = (value: string): string => this.valueTypeFormat('date', value);
        this.valuePipes.datetime = (value: string): string => this.valueTypeFormat('datetime', value);
        this.valuePipes.currency = (value: string): string => this.valueTypeFormat('currency', value);
        this.valuePipes.phone = (value: string): string => this.valueTypeFormat('phone', value);

        this.fieldPipes.int = (value: Field): string => this.fieldTypeFormat('int', value);
        this.fieldPipes.float = (value: Field): string => this.fieldTypeFormat('float', value);
        this.fieldPipes.date = (value: Field): string => this.fieldTypeFormat('date', value);
        this.fieldPipes.datetime = (value: Field): string => this.fieldTypeFormat('datetime', value);
        this.fieldPipes.currency = (value: Field): string => this.fieldTypeFormat('currency', value);
        this.fieldPipes.phone = (value: Field): string => this.fieldTypeFormat('phone', value);
        this.fieldPipes.enum = (value: Field): string => this.enumFormat(value);
        this.fieldPipes.dynamicenum = (value: Field): string => this.enumFormat(value);
        this.fieldPipes.multienum = (value: Field): string => this.multiEnumFormat(value);
    }

    addValuePipe(name: string, processor: TemplateValueFilter): void {
        this.valuePipes[name] = processor;
    }

    addFieldPipe(name: string, processor: TemplateFieldFilter): void {
        this.fieldPipes[name] = processor;
    }

    parse(template: string, context: StringMap, fields: FieldMap): string {

        if (!template) {
            return template;
        }

        const regex = /({{[\s\S]+?}})/g;

        const matches = template.match(regex);

        if (!matches || matches.length < 1) {
            return template;
        }

        let parsedTemplate = template;

        const module = (context && context.module) || '';

        matches.forEach((regexMatch) => {

            if (!parsedTemplate.includes(regexMatch)) {
                return;
            }

            let filter = '';
            let value = '';
            let source = 'context';
            let parts = [];

            let variableName = '' + regexMatch;
            variableName = variableName.replace('{{', '');
            variableName = variableName.replace('}}', '');
            variableName = variableName.trim();

            let path = variableName;

            if (variableName.includes('|')) {
                const [name, pipe] = variableName.split('|');
                filter = pipe.trim();
                variableName = name.trim();
                path = name.trim();
            }

            if (variableName.includes('.')) {
                parts = variableName.split('.');
                source = parts[0];
                variableName = parts[1];
            }


            let sourceValues: { [key: string]: string | Field } = context;
            if (source === 'fields') {
                sourceValues = fields;
            }

            if (!sourceValues || !(variableName in sourceValues)) {
                parsedTemplate = parsedTemplate.replace(regexMatch, value);
                return;
            }

            if (source === 'fields') {
                const field = fields[variableName];

                if (!field) {
                    parsedTemplate = parsedTemplate.replace(regexMatch, '');
                    return;
                }

                if (parts[2] && parts[2] === 'value' && field.type in this.fieldPipes) {
                    value = this.fieldPipes[field.type](field);
                    parsedTemplate = parsedTemplate.replace(regexMatch, value);
                    return;
                }

                if (parts[2] && parts[2] === 'label') {
                    value = this.getFieldLabel(field.labelKey, module);
                    parsedTemplate = parsedTemplate.replace(regexMatch, value);
                    return;
                }

                value = get({fields}, path, '');

                parsedTemplate = parsedTemplate.replace(regexMatch, value);
                return;
            }

            value = get({context}, path, '');

            if (filter in this.valuePipes) {
                value = this.valuePipes[filter](value);
            }

            parsedTemplate = parsedTemplate.replace(regexMatch, value);
        });

        return parsedTemplate;
    }

    protected valueTypeFormat(type: string, value: string): string {
        return this.typeFormatter.toUserFormat(type, value);
    }

    protected fieldTypeFormat(type: string, field: Field): string {
        return this.typeFormatter.toUserFormat(type, field.value);
    }

    protected enumFormat(field: Field): string {
        if (isVoid(field.definition.options) || isVoid(field.value)) {
            return '';
        }

        return this.language.getListLabel(field.definition.options, field.value);
    }

    protected multiEnumFormat(field: Field): string {
        if (isVoid(field.definition.options) || isVoid(field.valueList) || field.valueList.length < 1) {
            return '';
        }

        const result: string[] = [];

        field.valueList.forEach(value => {
            if (isVoid(value)) {
                return;
            }

            result.push(this.language.getListLabel(field.definition.options, value));
        });

        return result.join(', ');
    }

    protected getFieldLabel(labelKey: string, module = ''): string {
        if (isVoid(labelKey)) {
            return '';
        }

        return this.language.getFieldLabel(labelKey, module);
    }
}
