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

import { AnkiReader as AnkiReader } from "./AnkiReader";
import { writeFileSync } from "fs";
import { argv, exit, mainModule } from "process";

async function ankiToJSON(inPath: string, outPath: string): Promise<void> {
    console.log(`Reading ${inPath}`);
    const anki = new AnkiReader(inPath);
    const words = await anki.readWords();
    console.log(`Read ${words.length} entries`);
    console.log(`Writing ${outPath}`);
    writeFileSync(outPath, JSON.stringify(words, undefined, 2));

    console.log(`Converted ${words.length} words`);
}

async function main() {
    if (argv.length != 4) {
        console.error(`Usage: ${argv[0]} <in.apkg> <out.json>`);
        exit(1);
    }
    
    try {
        await ankiToJSON(argv[2], argv[3]);
        exit(0);
    } catch (e) {
        console.error(e);
        exit(2);
    }
}

main();
