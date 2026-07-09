/**
 * Team interaction engine — weather wars, Encore/Taunt, backup setters, matchup-aware brings.
 * Used by opponent-analysis.js (load before it).
 */

const SETUP_MOVE_KEYS = new Set([
    'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'bulkup', 'quiverdance',
    'geomancy', 'bellydrum', 'irondefense', 'amnesia', 'growth', 'coil', 'victorydance',
    'tailglow', 'workup', 'howl', 'agility', 'rockpolish', 'shellsmash'
]);

const STATUS_SETUP_KEYS = new Set(['willowisp', 'thunderwave', 'toxic', 'spore', 'sleeppowder', 'yawn', 'hypnosis']);

const WEATHER_MANUAL = {
    raindance: 'rain',
    sunnyday: 'sun',
    sandstorm: 'sand',
    snowscape: 'snow',
    hail: 'snow',
    chillyreception: 'snow'
};

const WEATHER_ABILITY = {
    drizzle: 'rain',
    drought: 'sun',
    sandstream: 'sand',
    snowwarning: 'snow',
    primordialsea: 'rain',
    desolateland: 'sun'
};

const INTERACTION_MOVES = {
    encore: {
        label: 'Encore',
        bringBonus(our) {
            let b = 0;
            if (our.setupUsers.length) b += 30;
            if (our.choiceUsers.length) b += 18;
            if (our.protectUsers.length) b += 14;
            if (our.statusMoveUsers.length) b += 10;
            return b;
        },
        warn(our, oppMon) {
            const targets = [];
            our.setupUsers.forEach(m => targets.push(`${m.species} (setup moves)`));
            our.choiceUsers.forEach(m => targets.push(`${m.species} (Choice item — locked into one move)`));
            our.protectUsers.forEach(m => targets.push(`${m.species} (Protect scouting)`));
            if (!targets.length) return null;
            const prank = getMonAbilityKey(oppMon) === 'prankster' ? ' **Prankster** gives priority — ' : ' ';
            return `${oppMon.species} can Encore after you commit a move.${prank}Vulnerable: ${targets.slice(0, 3).join(', ')}. Switch or use a different slot before repeating the same move.`;
        }
    },
    taunt: {
        label: 'Taunt',
        bringBonus(our) {
            let b = 0;
            if (our.setupUsers.length) b += 24;
            if (our.statusMoveUsers.length) b += 16;
            if (our.trSetters.length) b += 20;
            return b;
        },
        warn(our, oppMon) {
            if (!our.setupUsers.length && !our.trSetters.length) return null;
            const t = [...our.setupUsers, ...our.trSetters].map(m => m.species).slice(0, 3).join(', ');
            return `${oppMon.species} Taunt blocks non-attacking moves for 3 turns — cannot set up with ${t}. KO the Taunt user or attack through it.`;
        }
    },
    disable: {
        label: 'Disable',
        bringBonus(our) { return our.choiceUsers.length ? 12 : 0; }
    },
    torment: {
        label: 'Torment',
        bringBonus(our) { return our.setupUsers.length ? 10 : 0; }
    },
    haze: {
        label: 'Haze',
        bringBonus(our) { return our.setupUsers.length ? 22 : 0; },
        warn(our, oppMon) {
            if (!our.setupUsers.length) return null;
            return `${oppMon.species} Haze wipes your stat boosts — commit setup only after dealing with them.`;
        }
    },
    clearsmog: {
        label: 'Clear Smog',
        bringBonus(our) { return our.setupUsers.length ? 18 : 0; }
    },
    defog: {
        label: 'Defog',
        bringBonus(our) { return our.hasHazards ? 20 : 0; }
    },
    rapidspin: {
        label: 'Rapid Spin',
        bringBonus(our) { return our.hasHazards ? 16 : 0; }
    },
    courtchange: {
        label: 'Court Change',
        bringBonus(our) { return (our.hasHazards || our.hasScreens) ? 18 : 0; }
    },
    trickroom: {
        label: 'Trick Room',
        bringBonus() { return 0; }
    },
    yawn: {
        label: 'Yawn',
        bringBonus(our) { return our.fastSweepers.length ? 12 : 0; }
    },
    willowisp: {
        label: 'Will-O-Wisp',
        bringBonus(our) { return our.physicalSweepers.length ? 14 : 0; }
    },
    thunderwave: {
        label: 'Thunder Wave',
        bringBonus(our) { return our.fastSweepers.length ? 14 : 0; }
    },
    partingshot: {
        label: 'Parting Shot',
        bringBonus() { return 8; }
    },
    uturn: {
        label: 'U-turn',
        bringBonus() { return 6; }
    },
    voltswitch: {
        label: 'Volt Switch',
        bringBonus() { return 6; }
    },
    fakeout: {
        label: 'Fake Out',
        bringBonus(our) { return our.fastSweepers.length ? 16 : 10; }
    },
    followme: {
        label: 'Follow Me',
        bringBonus() { return 10; }
    },
    ragepowder: {
        label: 'Rage Powder',
        bringBonus() { return 10; }
    },
    helpinghand: {
        label: 'Helping Hand',
        bringBonus() { return 8; }
    },
    wideguard: {
        label: 'Wide Guard',
        bringBonus(our) { return our.spreadMoves ? 14 : 0; }
    },
    quickguard: {
        label: 'Quick Guard',
        bringBonus(our) { return our.priorityUsers.length ? 12 : 0; }
    },
    snarl: {
        label: 'Snarl',
        bringBonus(our) { return our.specialSweepers.length ? 10 : 0; }
    },
    icywind: {
        label: 'Icy Wind',
        bringBonus(our) { return our.fastSweepers.length ? 12 : 0; }
    },
    electroweb: {
        label: 'Electroweb',
        bringBonus(our) { return our.fastSweepers.length ? 12 : 0; }
    },
    knockoff: {
        label: 'Knock Off',
        bringBonus(our) {
            let b = 0;
            if (our.choiceUsers.length) b += 10;
            if (our.megaUsers.length) b += 12;
            return b;
        },
        warn(our, oppMon) {
            if (!our.megaUsers.length && !our.choiceUsers.length) return null;
            const t = [...our.megaUsers, ...our.choiceUsers].map(m => m.species).slice(0, 3).join(', ');
            return `${oppMon.species} Knock Off removes items — threatens ${t} (Mega Stones, Choice items).`;
        }
    },
    trick: {
        label: 'Trick',
        bringBonus(our) { return our.choiceUsers.length ? 16 : 0; },
        warn(our, oppMon) {
            if (!our.choiceUsers.length) return null;
            return `${oppMon.species} Trick swaps items — can trap your Choice users into a bad lock.`;
        }
    },
    switcheroo: {
        label: 'Switcheroo',
        bringBonus(our) { return our.choiceUsers.length ? 14 : 0; }
    },
    imprison: {
        label: 'Imprison',
        bringBonus(our) { return our.setupUsers.length ? 14 : 8; },
        warn(our, oppMon) {
            return `${oppMon.species} Imprison blocks shared moves — avoid copying their movepool if they share your setup.`;
        }
    },
    skillswap: {
        label: 'Skill Swap',
        bringBonus(our) {
            let b = 0;
            if (our.weatherAbusers.length) b += 12;
            return b;
        }
    },
    worryseed: {
        label: 'Worry Seed',
        bringBonus(our) { return our.weatherAbusers.length ? 14 : 0; }
    },
    gastroacid: {
        label: 'Gastro Acid',
        bringBonus(our) {
            let b = 0;
            if (our.hasDrought || our.hasDrizzle) b += 18;
            if (our.weatherAbusers.length) b += 10;
            return b;
        }
    },
    snatch: {
        label: 'Snatch',
        bringBonus(our) { return our.setupUsers.length ? 12 : 0; }
    },
    substitute: {
        label: 'Substitute',
        bringBonus(our) { return our.statusMoveUsers.length ? 8 : 0; }
    },
    perishsong: {
        label: 'Perish Song',
        bringBonus() { return 6; }
    },
    healblock: {
        label: 'Heal Block',
        bringBonus() { return 8; }
    },
    spite: {
        label: 'Spite',
        bringBonus() { return 4; }
    },
    tailwind: {
        label: 'Tailwind',
        bringBonus(our) { return our.fastSweepers.length ? 10 : 6; }
    },
    reflect: {
        label: 'Reflect',
        bringBonus(our) { return our.physicalSweepers.length ? 10 : 0; }
    },
    lightscreen: {
        label: 'Light Screen',
        bringBonus(our) { return our.specialSweepers.length ? 10 : 0; }
    },
    auroraveil: {
        label: 'Aurora Veil',
        bringBonus(our) { return (our.physicalSweepers.length || our.specialSweepers.length) ? 12 : 0; }
    },
    stealthrock: {
        label: 'Stealth Rock',
        bringBonus(our) { return our.megaUsers.length ? 10 : 6; }
    },
    spore: {
        label: 'Spore',
        bringBonus(our) { return our.fastSweepers.length ? 14 : 10; },
        warn(our, oppMon) {
            const prank = getEffectiveAbilityKey(oppMon) === 'prankster' ? ' (Prankster priority)' : '';
            return `${oppMon.species} Spore${prank} — have a sleep answer or Protect scout before committing setup.`;
        }
    },
    sleeppowder: {
        label: 'Sleep Powder',
        bringBonus(our) { return our.fastSweepers.length ? 10 : 0; }
    }
};

function getEffectiveAbilityKey(mon) {
    if (typeof getBattleFormeInfo === 'function') {
        const info = getBattleFormeInfo(mon);
        if (info.isMega || info.isPrimal) {
            const battleAb = (info.battleDb?.Ability?.[0] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (battleAb && battleAb !== 'none') return battleAb;
        }
    }
    const fromSlot = (mon.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fromSlot) return fromSlot;
    const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
    const ab = db?.Ability?.[0] || '';
    return ab.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getMonAbilityKey(mon) {
    return getEffectiveAbilityKey(mon);
}

function getMonMoveKeys(mon) {
    return (mon.moves || []).filter(Boolean).map(m => normalizeMoveKey(m));
}

function scanOurThreatProfile(ourMons) {
    const profile = {
        hasRain: false, hasSun: false, hasSand: false, hasSnow: false,
        hasDrizzle: false, hasDrought: false,
        hasHazards: false, hasScreens: false, spreadMoves: false,
        setupUsers: [], choiceUsers: [], protectUsers: [], statusMoveUsers: [],
        trSetters: [], fastSweepers: [], physicalSweepers: [], specialSweepers: [],
        priorityUsers: [], weatherAbusers: [], megaUsers: [], solarBeamUsers: []
    };

    ourMons.forEach(mon => {
        const moves = getMonMoveKeys(mon);
        const ab = getEffectiveAbilityKey(mon);
        const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
        const roles = typeof detectRole === 'function' ? detectRole(mon, db) : [];
        const item = (mon.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const spe = db ? parseInt(db.Speed, 10) : 0;

        if (ab === 'drizzle' || ab === 'primordialsea' || moves.includes('raindance')) {
            profile.hasRain = true;
            if (ab === 'drizzle' || ab === 'primordialsea') profile.hasDrizzle = true;
        }
        if (ab === 'drought' || ab === 'desolateland' || moves.includes('sunnyday')) {
            profile.hasSun = true;
            if (ab === 'drought' || ab === 'desolateland') profile.hasDrought = true;
        }
        if (ab === 'sandstream' || moves.includes('sandstorm')) profile.hasSand = true;
        if (ab === 'snowwarning' || moves.includes('snowscape') || moves.includes('hail')) profile.hasSnow = true;

        if (moves.some(m => ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb'].includes(m))) profile.hasHazards = true;
        if (moves.some(m => ['reflect', 'lightscreen', 'auroraveil'].includes(m))) profile.hasScreens = true;
        if (moves.some(m => ['earthquake', 'heatwave', 'rockslide', 'dazzlinggleam', 'snarl', 'muddywater', 'surf', 'hypervoice', 'expandingforce'].includes(m))) profile.spreadMoves = true;

        if (moves.some(m => SETUP_MOVE_KEYS.has(m))) profile.setupUsers.push(mon);
        if (item.includes('choiceband') || item.includes('choicespecs') || item.includes('choicescarf')) profile.choiceUsers.push(mon);
        if (moves.includes('protect') || moves.includes('detect')) profile.protectUsers.push(mon);
        if (moves.some(m => STATUS_SETUP_KEYS.has(m))) profile.statusMoveUsers.push(mon);
        if (moves.includes('trickroom')) profile.trSetters.push(mon);
        if (spe >= 100 || roles.some(r => r.includes('Sweeper'))) profile.fastSweepers.push(mon);
        if (roles.includes('Physical Sweeper') || roles.includes('Wallbreaker')) profile.physicalSweepers.push(mon);
        if (roles.includes('Special Sweeper')) profile.specialSweepers.push(mon);
        if (moves.some(m => ['extremespeed', 'suckerpunch', 'aquajet', 'machpunch', 'bulletpunch', 'iceshard', 'grassyglide', 'fakeout'].includes(m))) profile.priorityUsers.push(mon);
        if (roles.includes('Weather Abuser')) profile.weatherAbusers.push(mon);
        if (moves.includes('solarbeam') || moves.includes('solarblade')) profile.solarBeamUsers.push(mon);
        if (typeof isMegaCapable === 'function' && isMegaCapable(mon)) {
            profile.megaUsers.push(mon);
            const megaAb = getEffectiveAbilityKey(mon);
            if (megaAb === 'drought' || megaAb === 'desolateland') {
                profile.hasSun = true;
                profile.hasDrought = true;
            }
            if (megaAb === 'drizzle' || megaAb === 'primordialsea') {
                profile.hasRain = true;
                profile.hasDrizzle = true;
            }
        }
    });

    return profile;
}

function scanOpponentInteractionProfile(oppMons, format) {
    const profile = {
        weather: { rain: [], sun: [], sand: [], snow: [] },
        disruption: [],
        screens: [],
        speedControl: [],
        tr: [],
        mega: [],
        byIndex: []
    };

    oppMons.forEach((mon, i) => {
        const moves = getMonMoveKeys(mon);
        const ab = getEffectiveAbilityKey(mon);
        const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
        const key = normalizeSpeciesKey(mon.species);
        const entry = { mon, i, moves, ab, key, species: mon.species };

        if (WEATHER_ABILITY[ab]) {
            profile.weather[WEATHER_ABILITY[ab]].push({ ...entry, role: 'primary', source: 'ability' });
        }
        ['pelipper', 'politoed', 'kyogre'].forEach(s => {
            if (key === s && !profile.weather.rain.some(x => x.i === i)) {
                profile.weather.rain.push({ ...entry, role: 'primary', source: 'species' });
            }
        });
        ['torkoal', 'ninetalesalola'].forEach(s => {
            if (key === s && !profile.weather.sun.some(x => x.i === i)) {
                profile.weather.sun.push({ ...entry, role: 'primary', source: 'species' });
            }
        });

        moves.forEach(mv => {
            const w = WEATHER_MANUAL[mv];
            if (w) {
                const isPrimary = profile.weather[w].some(x => x.i === i && x.role === 'primary');
                if (!isPrimary) {
                    profile.weather[w].push({ ...entry, role: 'backup', source: 'move', move: mv });
                }
            }
            const def = INTERACTION_MOVES[mv];
            if (def) {
                profile.disruption.push({ ...entry, move: mv, label: def.label, def });
            }
        });

        if (moves.includes('reflect') || moves.includes('lightscreen') || moves.includes('auroraveil')) {
            profile.screens.push(entry);
        }
        if (moves.includes('tailwind') || moves.includes('icywind') || moves.includes('electroweb')) {
            profile.speedControl.push(entry);
        }
        if (moves.includes('trickroom')) profile.tr.push(entry);
        if (typeof isMegaCapable === 'function' && isMegaCapable(mon)) profile.mega.push(entry);

        profile.byIndex[i] = entry;
    });

    return profile;
}

function scoreWeatherCandidate(mon, i, weatherType, ourThreats, archetypeInfo, oppProfile) {
    const moves = getMonMoveKeys(mon);
    const ab = getMonAbilityKey(mon);
    const key = normalizeSpeciesKey(mon.species);
    const roles = archetypeInfo.roles[i] || [];
    const reasons = [];

    const isPrimary = (WEATHER_ABILITY[ab] === weatherType) ||
        (weatherType === 'rain' && ['pelipper', 'politoed', 'kyogre'].includes(key) && roles.includes('Weather Setter')) ||
        (weatherType === 'sun' && ['torkoal', 'ninetalesalola'].includes(key));

    const manualKey = weatherType === 'rain' ? 'raindance' : weatherType === 'sun' ? 'sunnyday' : weatherType === 'sand' ? 'sandstorm' : 'snowscape';
    const isBackup = moves.includes(manualKey) && !isPrimary;

    if (!isPrimary && !isBackup) return null;

    let score = 0;
    let role = isPrimary ? 'primary' : 'backup';

    if (isPrimary) {
        score = 44;
        reasons.push(`Primary ${weatherType} setter — immediate weather on switch-in`);

        if (weatherType === 'rain' && (ourThreats.hasSun || ourThreats.hasDrought)) {
            score -= 18;
            reasons.push('Less auto-value vs your Sun — they may prefer manual Rain over committing Drizzle lead');
        }
        if (weatherType === 'sun' && (ourThreats.hasRain || ourThreats.hasDrizzle)) {
            score -= 18;
            reasons.push('Less auto-value vs your Rain');
        }
        const hasStrongBackup = (oppProfile.weather[weatherType] || []).some(x => x.role === 'backup' && x.i !== i);
        if (hasStrongBackup && (ourThreats.hasSun || ourThreats.hasDrought || ourThreats.hasRain || ourThreats.hasDrizzle)) {
            score -= 12;
            reasons.push('Flexible backup weather setter on team — primary not guaranteed in bring');
        }
        if (archetypeInfo.roles.some((r, idx) => idx !== i && r.includes('Weather Abuser'))) {
            score += 14;
            reasons.push('Enables weather abusers when committed');
        }
    }

    if (isBackup) {
        score = 30;
        reasons.push(`Manual ${weatherType === 'rain' ? 'Rain Dance' : weatherType === 'sun' ? 'Sunny Day' : weatherType} — flexible, no ability slot required`);

        if (weatherType === 'rain' && (ourThreats.hasSun || ourThreats.hasDrought)) {
            score += 42;
            reasons.push('Hard counters your Drought/Sun — can override Torkoal/Ninetales and ruin Chlorophyll');
        }
        if (weatherType === 'sun' && (ourThreats.hasRain || ourThreats.hasDrizzle)) {
            score += 42;
            reasons.push('Counters your Rain/Drizzle');
        }
        if (moves.includes('encore')) {
            score += 24;
            reasons.push('Encore punishes your repeated/setup moves');
        }
        if (ab === 'prankster') {
            score += 18;
            reasons.push('Prankster priority on status/Encore');
        }
        if (moves.includes('lightscreen') || moves.includes('reflect')) {
            score += 14;
            reasons.push('Screens support while controlling weather');
        }
        if (moves.includes('willowisp') || moves.includes('recover') || roles.includes('Disruptor')) {
            score += 8;
        }
        if (roles.includes('Screener') || roles.includes('Damage Mitigation')) {
            score += 10;
            reasons.push('Support role — valuable even when primary weather is benched');
        }
    }

    return { i, score, role, weatherType, species: mon.species, reasons, mon };
}

function scoreDisruptionFit(mon, i, ourThreats, oppProfile) {
    const moves = getMonMoveKeys(mon);
    let bonus = 0;
    const tags = [];

    moves.forEach(mv => {
        const def = INTERACTION_MOVES[mv];
        if (!def || !def.bringBonus) return;
        const b = def.bringBonus(ourThreats);
        if (b > 0) {
            bonus += b;
            tags.push(def.label);
        }
    });

    if (getMonAbilityKey(mon) === 'prankster' && moves.includes('encore')) {
        bonus += 12;
        tags.push('Prankster Encore');
    }
    if (getMonAbilityKey(mon) === 'intimidate') {
        bonus += ourThreats.physicalSweepers.length ? 14 : 6;
        tags.push('Intimidate');
    }

    return { bonus, tags };
}

function resolveWeatherCores(mons, archetypeInfo, ourThreats, oppProfile, format) {
    const cores = new Map();
    const weatherTypes = [];
    if (archetypeInfo.archetypes.includes('rain')) weatherTypes.push('rain');
    if (archetypeInfo.archetypes.includes('sun')) weatherTypes.push('sun');
    if (archetypeInfo.archetypes.includes('sand') || archetypeInfo.ctx?.utils?.sand) weatherTypes.push('sand');
    if (archetypeInfo.archetypes.includes('snow') || archetypeInfo.ctx?.utils?.snow) weatherTypes.push('snow');

    weatherTypes.forEach(wt => {
        const candidates = [];
        mons.forEach((m, i) => {
            const c = scoreWeatherCandidate(m, i, wt, ourThreats, archetypeInfo, oppProfile);
            if (c) candidates.push(c);
        });
        if (!candidates.length) return;

        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        cores.set(best.i, { score: best.score, reason: best.reasons.join('; '), type: 'weather', role: best.role });

        const primary = candidates.find(c => c.role === 'primary');
        const backup = candidates.find(c => c.role === 'backup');

        if (primary && backup && primary.i !== backup.i) {
            const sunRainWar = (wt === 'rain' && (ourThreats.hasSun || ourThreats.hasDrought)) ||
                (wt === 'sun' && (ourThreats.hasRain || ourThreats.hasDrizzle));

            if (sunRainWar && backup.score >= primary.score) {
                cores.delete(primary.i);
                cores.set(backup.i, { score: backup.score, reason: backup.reasons.join('; '), type: 'weather', role: 'backup' });
            } else if (sunRainWar && backup.score >= primary.score - 10 && format === 'Doubles') {
                cores.set(backup.i, { score: backup.score, reason: backup.reasons.join('; '), type: 'weather', role: 'backup' });
            } else if (!sunRainWar && primary.score >= backup.score) {
                if (cores.has(backup.i) && backup.score < primary.score + 5) cores.delete(backup.i);
            }
        }
    });

    return cores;
}

function getCoreBringIndices(mons, archetypeInfo, ourThreats, oppProfile, format) {
    const cores = new Map();

    resolveWeatherCores(mons, archetypeInfo, ourThreats, oppProfile, format).forEach((v, k) => cores.set(k, v));

    if (archetypeInfo.archetypes.includes('trickroom')) {
        const trSetter = oppProfile.tr[0];
        const trAbuser = mons.findIndex((m, i) => (archetypeInfo.roles[i] || []).includes('Trick Room Abuser'));
        if (trSetter) cores.set(trSetter.i, { score: 48, reason: 'Trick Room setter', type: 'tr' });
        if (trAbuser >= 0) cores.set(trAbuser, { score: 38, reason: 'Trick Room abuser', type: 'tr' });
    }

    if (archetypeInfo.archetypes.includes('tailwind') && format === 'Doubles') {
        const tw = oppProfile.speedControl.find(e => getMonMoveKeys(e.mon).includes('tailwind'));
        if (tw) cores.set(tw.i, { score: 40, reason: 'Tailwind speed control', type: 'speed' });
    }

    oppProfile.disruption.forEach(d => {
        if (d.move !== 'encore' && d.move !== 'taunt') return;
        const fit = scoreDisruptionFit(d.mon, d.i, ourThreats, oppProfile);
        if (fit.bonus >= 20) {
            const existing = cores.get(d.i);
            const reason = `${d.label} — punishes your ${fit.tags.join(', ')}`;
            if (!existing || fit.bonus > 15) {
                cores.set(d.i, { score: (existing?.score || 0) + fit.bonus, reason, type: 'disruption' });
            }
        }
    });

    return cores;
}

function buildInteractionWarnings(ourMons, oppMons, oppBring) {
    const ourThreats = scanOurThreatProfile(ourMons);
    const warnings = [];
    const brought = new Set((oppBring?.mons || []).map(m => m.species));

    oppMons.forEach(opp => {
        const inBring = brought.has(opp.species);
        const moves = getMonMoveKeys(opp);

        moves.forEach(mv => {
            const def = INTERACTION_MOVES[mv];
            if (!def?.warn) return;
            const msg = def.warn(ourThreats, opp);
            if (msg) {
                warnings.push({ species: opp.species, move: def.label, inBring, severity: inBring ? 'high' : 'scout', text: msg });
            }
        });

        if (moves.includes('raindance') && (ourThreats.hasSun || ourThreats.hasDrought)) {
            const megaNote = ourThreats.megaUsers.some(m => {
                const a = getEffectiveAbilityKey(m);
                return a === 'drought' || a === 'desolateland';
            }) ? ' Mega Drought (e.g. Charizard Y) is **cancelled** by manual Rain.' : '';
            warnings.push({
                species: opp.species, move: 'Rain Dance', inBring, severity: 'high',
                text: `**Weather war:** ${opp.species} can manually set Rain to **cancel your Sun/Drought** — including vs Mega Drought users.${megaNote} ${inBring ? 'Expect this in their bring.' : 'Bench scout — they may swap Pelipper for this flex slot.'}`
            });
        }
        if (moves.includes('sunnyday') && (ourThreats.hasRain || ourThreats.hasDrizzle)) {
            warnings.push({
                species: opp.species, move: 'Sunny Day', inBring, severity: 'high',
                text: `**Weather war:** ${opp.species} can set Sun to override your Rain/Drizzle.`
            });
        }
    });

    ourThreats.megaUsers.forEach(m => {
        oppMons.forEach(opp => {
            if (getMonMoveKeys(opp).includes('willowisp')) {
                warnings.push({
                    species: opp.species, move: 'Will-O-Wisp', inBring: brought.has(opp.species), severity: 'medium',
                    text: `${opp.species} Will-O-Wisp neuters your physical Mega **${m.species}** — burn before or after Mega depending on speed.`
                });
            }
        });
    });

    const seen = new Set();
    return warnings.filter(w => {
        const k = w.species + w.move + w.text.slice(0, 40);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function buildInteractionPlaybook(ourMons, oppMons, oppBring, ourThreats, oppProfile, ourBringMons, format) {
    const plays = [];
    const brought = (oppBring?.mons || []);
    const ourBring = ourBringMons || ourMons;

    const backupRain = oppProfile.weather.rain.filter(x => x.role === 'backup');
    const primaryRain = oppProfile.weather.rain.filter(x => x.role === 'primary');

    if (backupRain.length && (ourThreats.hasSun || ourThreats.hasDrought)) {
        const b = backupRain[0];
        const broughtBackup = brought.some(m => m.species === b.species);
        plays.push(`**Weather counterplay:** ${b.species} carries manual Rain — ${broughtBackup ? 'likely IN' : 'possible flex'} vs your Sun. Consider denying weather Turn 1 (Taunt, KO) or leaning into your own override.`);
    }
    if (primaryRain.length && backupRain.length) {
        const p = primaryRain[0];
        const b = backupRain[0];
        const pIn = brought.some(m => m.species === p.species);
        const bIn = brought.some(m => m.species === b.species);
        if (bIn && !pIn) {
            plays.push(`**Read:** They benched **${p.species}** and brought **${b.species}** — rainless flex with backup Rain Dance, Encore, and screens. Vs your Sun team this is often **better** than auto-Drizzle.`);
        } else if (pIn && bIn) {
            plays.push(`**Read:** Both **${p.species}** and **${b.species}** in — layered weather. Remember **last weather wins** on Turn 1; backup Rain Dance after your Sunny Day still leaves Rain up.`);
        }
    }

    if (format === 'Doubles' && ourBring.length && brought.length) {
        const sim = simulateTurn1Weather(ourBring, brought, format);
        if (sim?.slowerOppRainWins) {
            const ourSunAll = [...sim.ourSunMoves, ...sim.ourActors.filter(a => a.weather === 'sun' && a.phase === 'switchin')];
            const fastSun = ourSunAll.reduce((a, b) => (a.speed > b.speed ? a : b));
            const slowRain = sim.oppRainMoves.reduce((a, b) => (a.speed < b.speed ? a : b));
            plays.unshift(`**Critical:** ${fastSun.species} (${fastSun.speed} Spe) outspeeds ${slowRain.species} (${slowRain.speed} Spe), but **${slowRain.species} Rain Dance goes last** — Rain stays, Solar Beam charges, and your Sun plan fails Turn 1.`);
        } else if (sim?.contested && sim.lastSetter) {
            plays.push(`**Turn 1 weather:** ends as **${weatherLabel(sim.activeWeather)}** after ${sim.lastSetter.species} (${sim.lastSetter.source}). Last setter wins — plan around that, not who is faster.`);
        }
    }

    const gaps = analyzeMatchupGaps(ourMons, ourBring, oppMons, oppBring, format || 'Doubles');
    gaps.filter(g => g.severity === 'critical').slice(0, 3).forEach(g => {
        if (!plays.some(p => p.includes(g.title))) {
            plays.unshift(`**${g.title}:** ${g.text}${g.fix ? ` *Fix:* ${g.fix}` : ''}`);
        }
    });

    oppProfile.disruption.filter(d => d.move === 'encore').forEach(d => {
        if (!brought.some(m => m.species === d.species)) return;
        plays.push(`**Encore line:** After ${d.species} Encores, you have 3 turns locked — never repeat Protect/setup into active Encore. Use doubles switch games or KO ${d.species} first.`);
    });

    if (ourThreats.setupUsers.length) {
        const tauntUsers = oppProfile.disruption.filter(d => d.move === 'taunt' && brought.some(m => m.species === d.species));
        tauntUsers.forEach(t => {
            plays.push(`**Setup denied:** ${t.species} Taunt blocks your ${ourThreats.setupUsers.map(m => m.species).join('/')} setup — win with raw damage or KO Taunt.`);
        });
    }

    return plays;
}

function getInteractionTagsForMon(mon, archetypeInfo, idx) {
    const tags = [];
    const moves = getMonMoveKeys(mon);
    const ab = getEffectiveAbilityKey(mon);
    const roles = archetypeInfo?.roles?.[idx] || [];

    if (moves.includes('raindance') && ab !== 'drizzle' && ab !== 'primordialsea') tags.push('Rain Dance flex');
    if (moves.includes('sunnyday') && ab !== 'drought' && ab !== 'desolateland') tags.push('Sunny Day flex');
    if (moves.includes('encore')) tags.push(ab === 'prankster' ? 'Prankster Encore' : 'Encore');
    if (moves.includes('taunt')) tags.push('Taunt');
    if (moves.includes('fakeout')) tags.push('Fake Out');
    if (moves.includes('trickroom')) tags.push('Trick Room');
    if (moves.includes('tailwind')) tags.push('Tailwind');
    if (moves.includes('reflect') || moves.includes('lightscreen') || moves.includes('auroraveil')) tags.push('Screens');
    if (moves.includes('willowisp')) tags.push('Burn');
    if (moves.includes('haze')) tags.push('Haze');
    if (roles.includes('Weather Setter') && ab === 'drizzle') tags.push('Auto-Rain');
    if (roles.includes('Weather Setter') && ab === 'drought') tags.push('Auto-Sun');

    return tags;
}

function getMonBattleSpeed(mon, format) {
    if (typeof getSpeedSnapshot === 'function') {
        const snap = getSpeedSnapshot(mon, format);
        return snap.battleSpeed ?? snap.baseSpeed ?? 0;
    }
    const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
    if (typeof getMonSpeed === 'function') return getMonSpeed(mon, db, format) ?? 0;
    return parseInt(db?.Speed, 10) || 0;
}

function collectWeatherActors(mons, format) {
    const actors = [];
    (mons || []).forEach(mon => {
        const moves = getMonMoveKeys(mon);
        const ab = getEffectiveAbilityKey(mon);
        const speed = getMonBattleSpeed(mon, format);
        const key = normalizeSpeciesKey(mon.species);

        if (moves.includes('sunnyday')) {
            actors.push({ mon, species: mon.species, weather: 'sun', source: 'Sunny Day', speed, phase: 'move' });
        }
        if (moves.includes('raindance')) {
            actors.push({ mon, species: mon.species, weather: 'rain', source: 'Rain Dance', speed, phase: 'move' });
        }
        if (moves.includes('sandstorm')) {
            actors.push({ mon, species: mon.species, weather: 'sand', source: 'Sandstorm', speed, phase: 'move' });
        }
        if (moves.includes('snowscape') || moves.includes('hail')) {
            actors.push({ mon, species: mon.species, weather: 'snow', source: 'Snowscape', speed, phase: 'move' });
        }

        if (ab === 'drought' || ab === 'desolateland') {
            actors.push({ mon, species: mon.species, weather: 'sun', source: ab === 'desolateland' ? 'Desolate Land' : 'Drought', speed, phase: 'switchin' });
        }
        if (ab === 'drizzle' || ab === 'primordialsea') {
            actors.push({ mon, species: mon.species, weather: 'rain', source: ab === 'primordialsea' ? 'Primordial Sea' : 'Drizzle', speed, phase: 'switchin' });
        }
        if (['pelipper', 'politoed', 'kyogre'].includes(key) && !actors.some(a => a.mon === mon && a.weather === 'rain')) {
            actors.push({ mon, species: mon.species, weather: 'rain', source: 'Drizzle', speed, phase: 'switchin' });
        }
        if (['torkoal', 'ninetalesalola'].includes(key) && !actors.some(a => a.mon === mon && a.weather === 'sun')) {
            actors.push({ mon, species: mon.species, weather: 'sun', source: 'Drought', speed, phase: 'switchin' });
        }
    });
    return actors;
}

function simulateTurn1Weather(ourBringMons, oppBringMons, format) {
    const ourActors = collectWeatherActors(ourBringMons, format);
    const oppActors = collectWeatherActors(oppBringMons, format);
    if (!ourActors.length && !oppActors.length) return null;

    const events = [
        ...ourActors.map(a => ({ ...a, side: 'you' })),
        ...oppActors.map(a => ({ ...a, side: 'opp' }))
    ];

    const switchIns = events.filter(e => e.phase === 'switchin').sort((a, b) => a.speed - b.speed);
    const moves = events.filter(e => e.phase === 'move').sort((a, b) => a.speed - b.speed);
    const timeline = [...switchIns, ...moves];

    let activeWeather = null;
    let lastSetter = null;
    timeline.forEach(e => {
        activeWeather = e.weather;
        lastSetter = e;
    });

    const ourSunMoves = ourActors.filter(a => a.weather === 'sun' && a.phase === 'move');
    const ourSunSwitch = ourActors.filter(a => a.weather === 'sun' && a.phase === 'switchin');
    const oppRainMoves = oppActors.filter(a => a.weather === 'rain' && a.phase === 'move');
    const ourSunAll = [...ourSunMoves, ...ourSunSwitch];
    const slowerOppRainWins = oppRainMoves.length && ourSunAll.length && (() => {
        const slowestOppRain = oppRainMoves.reduce((a, b) => (a.speed < b.speed ? a : b));
        const fastestOurSun = ourSunAll.reduce((a, b) => (a.speed > b.speed ? a : b));
        return fastestOurSun.speed > slowestOppRain.speed && activeWeather === 'rain';
    })();

    const ourWeatherTypes = new Set(ourActors.map(a => a.weather));
    const oppWeatherTypes = new Set(oppActors.map(a => a.weather));
    const contested = ourWeatherTypes.size > 0 && oppWeatherTypes.size > 0 &&
        ((ourWeatherTypes.has('sun') && oppWeatherTypes.has('rain')) ||
         (ourWeatherTypes.has('rain') && oppWeatherTypes.has('sun')));

    return {
        activeWeather,
        lastSetter,
        timeline,
        contested,
        slowerOppRainWins,
        ourActors,
        oppActors,
        ourSunMoves,
        ourSunSwitch,
        oppRainMoves
    };
}

function weatherLabel(w) {
    return { sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow' }[w] || w;
}

function analyzeMatchupGaps(ourMons, ourBringMons, oppMons, oppBring, format) {
    const gaps = [];
    const ourThreats = scanOurThreatProfile(ourMons);
    const oppBringMons = oppBring?.mons || [];
    const sim = simulateTurn1Weather(ourBringMons, oppBringMons, format);

    if (sim?.contested && sim.activeWeather) {
        const weWantSun = ourThreats.hasSun || ourThreats.hasDrought || sim.ourActors.some(a => a.weather === 'sun');
        const weWantRain = ourThreats.hasRain || ourThreats.hasDrizzle || sim.ourActors.some(a => a.weather === 'rain');
        const rainBeatsOurSun = sim.activeWeather === 'rain' && weWantSun;
        const sunBeatsOurRain = sim.activeWeather === 'sun' && weWantRain;

        if (rainBeatsOurSun || sunBeatsOurRain) {
            const seq = sim.timeline.map(e =>
                `${e.species} (${e.source}, ${e.speed} Spe)`
            ).join(' → ');
            const last = sim.lastSetter;
            const ourSunAll = [...sim.ourSunMoves, ...sim.ourActors.filter(a => a.weather === 'sun' && a.phase === 'switchin')];
            const fasterOurSun = ourSunAll.length
                ? ourSunAll.reduce((a, b) => (a.speed > b.speed ? a : b))
                : null;
            const slowerOppRain = sim.oppRainMoves.length
                ? sim.oppRainMoves.reduce((a, b) => (a.speed < b.speed ? a : b))
                : null;

            let detail = `Turn 1 weather resolves **${weatherLabel(sim.activeWeather)}** (${last?.species}, ${last?.source}).`;
            if (sim.slowerOppRainWins && fasterOurSun && slowerOppRain) {
                detail += ` **${fasterOurSun.species}** is faster than **${slowerOppRain.species}** but **last weather wins** — ${slowerOppRain.species} Rain Dances after your ${fasterOurSun.source}, so you **cannot** hold Sun Turn 1.`;
            } else if (fasterOurSun && slowerOppRain && fasterOurSun.speed > slowerOppRain.speed) {
                detail += ` Even though your ${fasterOurSun.species} outspeeds their ${slowerOppRain.species}, their Rain Dance goes **second** and overwrites your weather.`;
            }

            gaps.push({
                severity: 'critical',
                title: 'Weather war lost on Turn 1',
                text: `${detail} Sequence: ${seq}.`,
                fix: 'KO their rain setter before it moves, Taunt it, or stop relying on Sun/Solar Beam this game. Leading manual Sun into backup Rain Dance is often a trap.'
            });
        }
    }

    if (sim?.activeWeather === 'rain') {
        const solarInBring = ourThreats.solarBeamUsers.filter(m =>
            ourBringMons.some(b => b.species === m.species)
        );
        solarInBring.forEach(m => {
            gaps.push({
                severity: 'critical',
                title: `${m.species} — Solar Beam disabled`,
                text: `Rain stays up Turn 1, so **Solar Beam** needs a charge turn. ${m.species} cannot threaten a same-turn Grass hit and becomes setup bait for their rain abusers.`,
                fix: `Drop ${m.species}, swap Solar Beam for a rain-neutral attack, or guarantee Sun before ${m.species} acts (usually impossible if their backup Rain is slower).`
            });
        });

        const droughtMons = ourBringMons.filter(m => {
            const ab = getEffectiveAbilityKey(m);
            return ab === 'drought' || ab === 'desolateland';
        });
        droughtMons.forEach(m => {
            gaps.push({
                severity: 'high',
                title: `${m.species} Drought neutralized`,
                text: `Mega ${m.species} Drought is **overwritten by Rain** — Fire moves are weakened, Solar Power chip is gone, and your sun-reliant gameplan stalls.`,
                fix: 'Win without weather, or remove their rain setter Turn 1 with a double-target or priority.'
            });
        });
    }

    const oppRainBackupInBring = oppBringMons.filter(m => {
        const mv = getMonMoveKeys(m);
        return mv.includes('raindance') && getEffectiveAbilityKey(m) !== 'drizzle' && getEffectiveAbilityKey(m) !== 'primordialsea';
    });
    const ourDroughtInBring = ourBringMons.filter(m => {
        const ab = getEffectiveAbilityKey(m);
        return ab === 'drought' || ab === 'desolateland';
    });
    const ourSolarInBring = ourBringMons.filter(m => getMonMoveKeys(m).includes('solarbeam') || getMonMoveKeys(m).includes('solarblade'));

    oppRainBackupInBring.forEach(setter => {
        const setterMoves = getMonMoveKeys(setter);
        const hasScreens = setterMoves.includes('lightscreen') || setterMoves.includes('reflect');
        const hasEncore = setterMoves.includes('encore');
        ourDroughtInBring.concat(ourSolarInBring).forEach(target => {
            if (gaps.some(g => g.title.includes(setter.species) && g.title.includes(target.species))) return;
            let line = `**${setter.species}** can Rain Dance to kill your ${target.species} gameplan`;
            const parts = [];
            if (ourSolarInBring.some(m => m.species === target.species)) parts.push('Solar Beam charges in rain');
            if (ourDroughtInBring.some(m => m.species === target.species)) parts.push('Drought/Sun never sticks');
            if (hasScreens) parts.push('screens blunt your burst');
            if (hasEncore) parts.push('Encore punishes Protect/Sun repeats');
            gaps.push({
                severity: 'critical',
                title: `${setter.species} hard-counters ${target.species}`,
                text: `${line}: ${parts.join('; ')}. Their rain abusers (e.g. Swift Swim) then force a KO.`,
                fix: `Do not assume ${target.species} wins this matchup — double-target ${setter.species} Turn 1, or bench ${target.species}.`
            });
        });
    });

    const encoreInBring = oppBringMons.filter(m => getMonMoveKeys(m).includes('encore'));
    if (encoreInBring.length && (ourThreats.protectUsers.length || ourThreats.setupUsers.length)) {
        const setter = encoreInBring[0];
        const prank = getEffectiveAbilityKey(setter) === 'prankster';
        gaps.push({
            severity: 'high',
            title: 'Encore trap on weather turns',
            text: `${setter.species}${prank ? ' (Prankster)' : ''} can Encore after you use Sunny Day / Protect — you are locked into a non-threatening move while rain stays up.`,
            fix: 'Stagger weather moves across turns only if you outspeed and KO; otherwise KO Encore user first.'
        });
    }

    return gaps;
}

function scoreWeatherWarPenalty(ourMons, ourBringMons, oppBring, format) {
    const gaps = analyzeMatchupGaps(ourMons, ourBringMons, [], oppBring, format);
    let penalty = 0;
    gaps.forEach(g => {
        if (g.severity === 'critical') penalty += 40;
        else if (g.severity === 'high') penalty += 18;
    });
    return { penalty, gaps };
}

if (typeof globalThis !== 'undefined') {
    globalThis.getMonAbilityKey = getMonAbilityKey;
    globalThis.getEffectiveAbilityKey = getEffectiveAbilityKey;
    globalThis.getMonMoveKeys = getMonMoveKeys;
    globalThis.scanOurThreatProfile = scanOurThreatProfile;
    globalThis.scanOpponentInteractionProfile = scanOpponentInteractionProfile;
    globalThis.getCoreBringIndices = getCoreBringIndices;
    globalThis.scoreDisruptionFit = scoreDisruptionFit;
    globalThis.buildInteractionWarnings = buildInteractionWarnings;
    globalThis.buildInteractionPlaybook = buildInteractionPlaybook;
    globalThis.getInteractionTagsForMon = getInteractionTagsForMon;
    globalThis.analyzeMatchupGaps = analyzeMatchupGaps;
    globalThis.simulateTurn1Weather = simulateTurn1Weather;
    globalThis.scoreWeatherWarPenalty = scoreWeatherWarPenalty;
}
