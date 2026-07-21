/**
 * Move index — loads and normalizes move data from moves.json.
 * Contact / sound / wind / ball / spread flags are derived from tags.
 */
(function (global) {
    const BC = global.BattleCalc = global.BattleCalc || {};

    function normalizeMoveName(name) {
        return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function normalizeTag(tag) {
        return (tag || '').toLowerCase().replace(/[^a-z0-9&]+/g, '');
    }

    function hasTag(tags, ...needles) {
        if (!tags || !tags.length) return false;
        const normalized = tags.map(normalizeTag);
        return needles.some(n => normalized.includes(normalizeTag(n)));
    }

    function parseMoveRecord(m) {
        if (!m) return null;
        const battle = m.battle || {};
        const tags = Array.isArray(m.tags) ? m.tags.slice() : [];
        return {
            name: m.name,
            id: m.id,
            power: m.power == null ? 0 : parseInt(m.power, 10) || 0,
            type: m.type || 'Normal',
            category: m.damage_class || m.category || 'Physical',
            accuracy: m.accuracy,
            priority: m.priority || 0,
            tags,
            battle: {
                multiHit: battle.multiHit || null,
                variablePower: battle.variablePower || null,
                dynamicType: battle.dynamicType || null,
                alwaysCrit: !!battle.alwaysCrit,
                ignoresDefenseBoosts: !!battle.ignoresDefenseBoosts
            }
        };
    }

    const ALWAYS_CRIT_MOVES = new Set([
        'flowertrick', 'wickedblow', 'surgingstrikes',
        'stormthrow', 'frostbreath', 'zippyzap', 'wickedtorque'
    ]);
    const IGNORE_DEF_BOOST_MOVES = new Set([
        'darkestlariat', 'kowtowcleave', 'sacredsword'
    ]);

    function createMoveState(record, overrides = {}) {
        if (!record) {
            return { name: 'None', basePower: 0, type: 'Normal', category: 'Physical', crit: false, ...overrides };
        }
        const alwaysCrit = !!record.battle?.alwaysCrit || ALWAYS_CRIT_MOVES.has(normalizeMoveName(record.name));
        return {
            name: record.name,
            basePower: record.power,
            type: record.type,
            category: record.category,
            priority: record.priority,
            crit: alwaysCrit,
            ...overrides,
            // Always-crit moves stay forced even if overrides try to clear them
            ...(alwaysCrit ? { crit: true } : {})
        };
    }

    function resolveRecord(nameOrRecord) {
        if (!nameOrRecord) return null;
        if (typeof nameOrRecord === 'string') return MoveIndex.get(nameOrRecord);
        // Live move state objects only carry name/BP — resolve the catalog record for tags.
        if (nameOrRecord.name) {
            const fromIndex = MoveIndex.get(nameOrRecord.name);
            if (fromIndex) return fromIndex;
        }
        return nameOrRecord;
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

        hasTag(nameOrRecord, ...needles) {
            const rec = resolveRecord(nameOrRecord);
            return hasTag(rec?.tags, ...needles);
        },

        isSpread(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'All Pokemon', 'All Opponents');
        },

        isSound(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Sound-Based');
        },

        isContact(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Contact');
        },

        isWind(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Wind');
        },

        isBallBomb(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Ball & Bomb');
        },

        isPulse(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Pulse');
        },

        isPunching(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Punching');
        },

        isBiting(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Biting');
        },

        isSlicing(nameOrRecord) {
            return this.hasTag(nameOrRecord, 'Slicing');
        },

        isPriority(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            return (rec?.priority || 0) > 0;
        },

        getMultiHitInfo(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            return rec?.battle?.multiHit || null;
        },

        getVariablePower(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            return rec?.battle?.variablePower || null;
        },

        getDynamicType(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            return rec?.battle?.dynamicType || null;
        },

        isAlwaysCrit(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            if (rec?.battle?.alwaysCrit) return true;
            const key = normalizeMoveName(typeof nameOrRecord === 'string' ? nameOrRecord : rec?.name || nameOrRecord?.name);
            return ALWAYS_CRIT_MOVES.has(key);
        },

        ignoresDefenseBoosts(nameOrRecord) {
            const rec = resolveRecord(nameOrRecord);
            if (rec?.battle?.ignoresDefenseBoosts) return true;
            const key = normalizeMoveName(typeof nameOrRecord === 'string' ? nameOrRecord : rec?.name || nameOrRecord?.name);
            return IGNORE_DEF_BOOST_MOVES.has(key);
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
