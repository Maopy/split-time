"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntryList extends Array {
    constructor(entries) {
        super(...entries);
        this._entries = entries;
    }
    getEntries() {
        return this._entries;
    }
    getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
    }
    getEntriesByName(name, type) {
        return this._entries
            .filter((e) => e.name === name)
            .filter((e) => (type ? e.entryType === type : true));
    }
}
exports.default = EntryList;
//# sourceMappingURL=entry-list.js.map