/**
 * Move index — loads and normalizes move data from moves.json.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};

    function normalizeMoveName(name) {
        return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function parseMoveRecord(m) {
        if (!m) return null;
        const battle = m.battle || {};
        return {
            name: m.name,
            id: m.id,
            power: m.power == null ? 0 : parseInt(m.power, 10) || 0,
            type: m.type || 'Normal',
            category: m.damage_class || m.category || 'Physical',
            accuracy: m.accuracy,
            priority: m.priority || 0,
            tags: m.tags || [],
            battle: {
                spread: !!battle.spread,
                sound: !!battle.sound,
                contact: !!battle.contact,
                priority: battle.priority != null ? !!battle.priority : (m.priority || 0) > 0,
                multiHit: battle.multiHit || null,
                variablePower: battle.variablePower || null,
                dynamicType: battle.dynamicType || null
            }
        };
    }

    function createMoveState(record, overrides = {}) {
        if (!record) {
            return { name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false, ...overrides };
        }
        return {
            name: record.name,
            basePower: record.power,
            type: record.type,
            category: record.category,
            priority: record.priority,
            crit: false,
            ...overrides
        };
    }

    const MoveIndex = {
        _byName: new Map(),
        _list: [],

        init(movesArray) {
            this._byName.clear();
            this._list = [];
            (movesArray || []).forEach(raw => {
                const rec = parseMoveRecord(raw);
                if (!rec?.name) return;
                this._list.push(rec);
                this._byName.set(normalizeMoveName(rec.name), rec);
            });
        },

        get(name) {
            if (!name || name === 'None') return null;
            return this._byName.get(normalizeMoveName(name)) || null;
        },

        getAll() {
            return this._list;
        },

        createMoveState(name, overrides) {
            return createMoveState(this.get(name), overrides);
        },

        isSpread(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return !!rec?.battle?.spread;
        },

        isSound(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return !!rec?.battle?.sound;
        },

        isPriority(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return !!rec?.battle?.priority || (rec?.priority || 0) > 0;
        },

        getMultiHitInfo(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return rec?.battle?.multiHit || null;
        },

        getVariablePower(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return rec?.battle?.variablePower || null;
        },

        getDynamicType(nameOrRecord) {
            const rec = typeof nameOrRecord === 'string' ? this.get(nameOrRecord) : nameOrRecord;
            return rec?.battle?.dynamicType || null;
        },

        findInArray(movesDb, name) {
            if (!name) return null;
            const key = normalizeMoveName(name);
            const fromIndex = this.get(name);
            if (fromIndex) return fromIndex;
            const raw = (movesDb || []).find(m => normalizeMoveName(m.name) === key);
            return raw ? parseMoveRecord(raw) : null;
        }
    };

    BC.MoveIndex = MoveIndex;
    BC.normalizeMoveName = normalizeMoveName;
    BC.parseMoveRecord = parseMoveRecord;
    BC.createMoveState = createMoveState;
})(typeof globalThis !== 'undefined' ? globalThis : this);
