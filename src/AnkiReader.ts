/*
 *   LLPSI.net - Learning platform for Lingua Latina per se illustrata
 *   Copyright (C) 2020 Folke Will <folko@solhost.org>
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Affero General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Affero General Public License for more details.
 *
 *   You should have received a copy of the GNU Affero General Public License
 *   along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import AdmZip = require("adm-zip");
import sqlite3 = require("sqlite3");
import path = require("path");
import { tmpdir } from "os";
import { writeFileSync } from "fs";

interface CardType {
    id: number;
    name: string;
    fields: Map<string, number>;
}

export class AnkiReader {
    private db: sqlite3.Database;
    private cardTypes: Map<number, CardType> = new Map();

    constructor(apkg: string) {
        const sqlFile = this.extractDB(apkg);
        this.db = new sqlite3.Database(sqlFile, sqlite3.OPEN_READONLY);
    }

    private extractDB(apkg: string): string {
        const zip = new AdmZip(apkg);
        const buffer = zip.readFile('collection.anki2');
        const sqlFile = path.join(tmpdir(), "llpsi.sqlite3");
        writeFileSync(sqlFile, buffer);
        return sqlFile;
    }

    public async readWords(): Promise<any[]> {
        await this.readCardTypes();
        return new Promise((resolve, reject) => {
            const words: any[] = [];
            this.db.each(`SELECT mid, flds, tags FROM notes ORDER BY sfld ASC`, (err: any, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                const modelId = row.mid;
                const fields = row.flds.split('\u001f');
                const tags = row.tags.split(' ');
                const word = this.analyzeWord(modelId, fields, tags);
                words.push(word);
            }, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(words);
            });
        });
    }

    private async readCardTypes(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT models FROM col LIMIT 1', (err: any, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const cardTypes = JSON.parse(row.models);
                this.analyzeCardTypes(cardTypes);
                resolve();
            });
        });
    }

    private analyzeCardTypes(jsonDesc: any) {
        for (const idx in jsonDesc) {
            const model = jsonDesc[idx];
            const type: CardType = {
                id: model.id,
                name: model.name,
                fields: new Map(),
            };

            for (const field of model.flds) {
                type.fields.set(field.name, field.ord);
            }

            this.cardTypes.set(type.id, type);
        }
    }

    private analyzeWord(modelId: number, fields: string[], tags: string[]): any {
        const model = this.cardTypes.get(modelId);
        if (!model) {
            throw Error(`Unknown model id: ${modelId}`);
        }

        const word = this.fieldsToObject(model, fields);
        this.addTagInfo(word, tags);
        return word;
    }

    private fieldsToObject(model: CardType, fields: string[]): any {
        const obj: any = new Object();
        obj.wordType = model.name;
        for (const entry of model.fields) {
            const fieldName = this.toCamelCase(entry[0]);
            const fieldIndex = entry[1];
            obj[fieldName] = this.removeHTML(fields[fieldIndex]);
        }
        return obj;
    }

    private toCamelCase(str: string): string {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    private removeHTML(str: string): string {
        str = str.replace('&nbsp;', ' ');
        str = str.replace(/<div>([^<]*)<\/div>/g, ';$1')
        return str;
    }

    private addTagInfo(word: any, tags: string[]) {
        word.chapter = 0;
        word.grammaticalTerm = false;

        for (const tag of tags) {
            const match = tag.match(/chap(\d+)/);
            if (match) {
                word.chapter = Number.parseInt(match[1], 10);
            } else if (tag == 'grammar') {
                word.grammaticalTerm = true;
            }
        }
        if (!word.chapter) {
            throw Error(`No chapter for word ${word.english}`);
        }
    }
}
