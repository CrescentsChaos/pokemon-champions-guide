/**
 * Opponent Team Prep — matchup analysis for Team Builder
 * Requires: analysis.js, damage-calc.js, utils.js
 */

(function injectOpponentStyles() {
    const sub = ['/builds/', '/teambuilder/', '/calc/', '/compare/', '/counter/'];
    const isSub = sub.some(d => window.location.pathname.toLowerCase().includes(d));
    const prefix = isSub ? '../' : '';
    if (!document.getElementById('opponent-analysis-css')) {
        const link = document.createElement('link');
        link.id = 'opponent-analysis-css';
        link.rel = 'stylesheet';
        link.href = prefix + 'css/opponent-analysis.css';
        document.head.appendChild(link);
    }
})();

const BRING_COUNT = { Singles: 3, Doubles: 4 };

let _opponentTopMetaCache = null;
let _opponentSearchRequestId = 0;

function getBaseMonDb(mon) {
    if (!mon?.species || typeof allPokemon === 'undefined') return null;
    const key = normalizeSpeciesKey(mon.species);
    return allPokemon.find(x => normalizeSpeciesKey(x.Name) === key) || null;
}

function isMegaStoneItem(item) {
    const it = (item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!it || it === 'eviolite' || it === 'meteorite') return false;
    return it.endsWith('ite') || it.endsWith('itex') || it.endsWith('itey') || it.endsWith('itez');
}

function isMegaCapable(mon) {
    return isMegaStoneItem(mon?.item);
}

function getBattleFormeInfo(mon) {
    const baseDb = getBaseMonDb(mon);
    let battleDb = baseDb;
    if (typeof getEffectivePokemonData === 'function' && typeof allPokemon !== 'undefined') {
        battleDb = getEffectivePokemonData(mon, allPokemon) || baseDb;
    }
    const isMega = !!(baseDb && battleDb && normalizeSpeciesKey(baseDb.Name) !== normalizeSpeciesKey(battleDb.Name));
    const isPrimal = !!(battleDb?.Name || '').toLowerCase().includes('primal');
    const battleLabel = isMega
        ? (battleDb?.Name || `Mega ${mon.species}`)
        : (isPrimal ? battleDb.Name : mon.species);
    return { baseDb, battleDb, isMega, isPrimal, battleLabel, item: mon?.item || '' };
}

function getMonSpeedForDb(mon, db, format) {
    if (!db || typeof getMonSpeed !== 'function') return null;
    return getMonSpeed(mon, db, format);
}

function getSpeedSnapshot(mon, format) {
    const info = getBattleFormeInfo(mon);
    const baseSpeed = getMonSpeedForDb(mon, info.baseDb, format);
    const battleSpeed = getMonSpeedForDb(mon, info.battleDb, format);
    return {
        species: mon.species,
        info,
        baseSpeed,
        battleSpeed,
        speedDelta: (baseSpeed != null && battleSpeed != null) ? battleSpeed - baseSpeed : 0
    };
}

function compareSpeedLabels(ourSpeed, oppSpeed) {
    if (ourSpeed == null || oppSpeed == null) return 'unknown';
    if (ourSpeed > oppSpeed) return 'faster';
    if (ourSpeed < oppSpeed) return 'slower';
    return 'tie';
}

function weatherSimToFieldWeather(sim) {
    if (!sim?.activeWeather) return null;
    return { sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow' }[sim.activeWeather] || null;
}

function buildMatchupField(format, weatherSim) {
    const field = typeof getDefaultField === 'function' ? getDefaultField(format) : { format, weather: 'None' };
    const w = weatherSimToFieldWeather(weatherSim);
    if (w) field.weather = w;
    return field;
}

function canAddMegaToPick(idx, picked, mons) {
    if (!isMegaCapable(mons[idx])) return true;
    return !picked.some(i => isMegaCapable(mons[i]));
}

function filterDisplayRoles(roles, intTags) {
    const tagSet = new Set((intTags || []).map(t => t.toLowerCase()));
    const redundant = new Set();
    if (tagSet.has('fake out')) redundant.add('Fake Out Pressure');
    if (tagSet.has('trick room')) redundant.add('Trick Room Setter');
    if (tagSet.has('tailwind')) redundant.add('Speed Control');
    if (tagSet.has('auto-rain') || tagSet.has('auto-sun') || tagSet.has('rain dance flex') || tagSet.has('sunny day flex')) {
        redundant.add('Weather Setter');
    }
    if (tagSet.has('burn') || tagSet.has('encore') || tagSet.has('prankster encore') || tagSet.has('taunt')) {
        redundant.add('Disruptor');
    }
    if (tagSet.has('screens')) redundant.add('Screener');
    if (tagSet.has('haze')) redundant.add('Phazer/Hazer');

    let filtered = (roles || []).filter(r => !redundant.has(r));
    if (filtered.includes('Hazard Setter') && filtered.includes('Hazard Control')) {
        filtered = filtered.filter(r => r !== 'Hazard Control');
    }
    return filtered.slice(0, 2);
}

function buildOpponentTeammateRankMap(excludeSlot) {
    const recommendedTeammates = new Map();
    const currentlySelected = new Set(
        _opponentTeam.map((p, i) => (i === excludeSlot ? '' : normalizeSpeciesKey(p?.species || ''))).filter(Boolean)
    );

    _opponentTeam.forEach((slot, idx) => {
        if (idx === excludeSlot || !slot?.species) return;
        const dbSlot = (allPokemon || []).find(x => normalizeSpeciesKey(x.Name) === normalizeSpeciesKey(slot.species)) || {};
        (dbSlot.Teammates || []).forEach(t => {
            const tKey = normalizeSpeciesKey(t);
            if (!currentlySelected.has(tKey)) recommendedTeammates.set(tKey, (recommendedTeammates.get(tKey) || 0) + 1);
        });
    });

    const curSpec = _opponentTeam[excludeSlot]?.species;
    if (curSpec) {
        const curDb = (allPokemon || []).find(x => normalizeSpeciesKey(x.Name) === normalizeSpeciesKey(curSpec)) || {};
        (curDb.Teammates || []).forEach(t => {
            const tKey = normalizeSpeciesKey(t);
            if (!currentlySelected.has(tKey)) recommendedTeammates.set(tKey, (recommendedTeammates.get(tKey) || 0) + 1);
        });
    }
    return recommendedTeammates;
}

let _opponentTeam = Array(6).fill(null).map(createEmptyOpponentSlot);
let _opponentSearchSlot = 0;
let _opponentFormat = 'Singles';
let _ourTeamGetter = null;

function createEmptyOpponentSlot() {
    return {
        species: '', item: '', ability: '', level: 50, shiny: false,
        tera: '', nickname: '', gender: '-', nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['', '', '', ''],
        _buildSource: null,
        _buildId: null
    };
}

function registerOpponentPrep(getTeamFn) {
    _ourTeamGetter = getTeamFn;
}

function setOpponentPrepFormat(format) {
    _opponentFormat = format || 'Singles';
    _opponentTopMetaCache = null;
    updateOpponentFormatToggle(_opponentFormat);
    if (typeof _teamAnalysisFormat !== 'undefined') {
        _teamAnalysisFormat = _opponentFormat;
    }
    if (typeof updateAnalysisFormatToggle === 'function') {
        updateAnalysisFormatToggle(_opponentFormat, 'analysis-toggle-singles', 'analysis-toggle-doubles');
    }
    const view = document.getElementById('opponent-prep-view');
    if (view && view.style.display !== 'none') {
        runOpponentPrepAnalysis();
    }
}

function updateOpponentFormatToggle(format) {
    const singlesBtn = document.getElementById('opponent-toggle-singles');
    const doublesBtn = document.getElementById('opponent-toggle-doubles');
    if (singlesBtn) singlesBtn.classList.toggle('active', format === 'Singles');
    if (doublesBtn) doublesBtn.classList.toggle('active', format === 'Doubles');
}

function getOpponentSpriteUrl(species) {
    if (!species) return '';
    const clean = species.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/[^a-z0-9-]/g, '');
    return `https://play.pokemonshowdown.com/sprites/ani/${clean}.gif`;
}

function getSpeciesBuildList(species, format) {
    const buildsArr = (typeof allBuilds !== 'undefined') ? allBuilds : [];
    const key = normalizeSpeciesKey(species);
    const fmt = (format || 'Singles').toLowerCase();
    const matches = buildsArr.filter(b => normalizeSpeciesKey(b.pokemon) === key);
    matches.sort((a, b) => {
        const aFmt = (a.format || 'Singles').toLowerCase() === fmt ? 1 : 0;
        const bFmt = (b.format || 'Singles').toLowerCase() === fmt ? 1 : 0;
        if (aFmt !== bFmt) return bFmt - aFmt;
        return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
    });
    return matches;
}

function applyOpponentBuildRecord(slotIndex, buildRecord) {
    if (!buildRecord || typeof parseAnalysisBuild !== 'function') return;
    const slot = parseAnalysisBuild(buildRecord.build);
    slot._buildSource = 'library';
    slot._buildId = buildRecord.id;
    _opponentTeam[slotIndex] = slot;
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

function openOpponentBuildSwap(slotIndex) {
    const p = _opponentTeam[slotIndex];
    if (!p || !p.species) return;
    _opponentBuildSwapSlot = slotIndex;
    const overlay = document.getElementById('opponent-build-overlay');
    const list = document.getElementById('opponent-build-list');
    if (!overlay || !list) return;

    const builds = getSpeciesBuildList(p.species, _opponentFormat);
    document.getElementById('opponent-build-overlay-title').textContent = `Swap Build — ${p.species}`;

    if (!builds.length) {
        list.innerHTML = '<p class="opp-empty-note">No library builds for this species.</p>';
    } else {
        list.innerHTML = '';
        builds.forEach(b => {
            const parsed = parseAnalysisBuild(b.build);
            const moves = (parsed.moves || []).filter(Boolean).join(' · ') || 'No moves';
            const isActive = String(p._buildId) === String(b.id);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `opp-build-option ${isActive ? 'opp-build-option--active' : ''}`;
            btn.innerHTML = `
                <span class="opp-build-option__head">
                    <span class="opp-build-option__fmt">${escapeAnalysisHtml(b.format || 'Standard')}</span>
                    <span class="opp-build-option__id">#${b.id}</span>
                    ${isActive ? '<span class="opp-build-option__current">ACTIVE</span>' : ''}
                </span>
                <span class="opp-build-option__detail">${parsed.item ? '@ ' + escapeAnalysisHtml(parsed.item) : 'No item'} · ${escapeAnalysisHtml(parsed.ability || 'Ability')}</span>
                <span class="opp-build-option__moves">${escapeAnalysisHtml(moves)}</span>`;
            btn.onclick = () => {
                applyOpponentBuildRecord(slotIndex, b);
                overlay.style.display = 'none';
            };
            list.appendChild(btn);
        });
    }

    overlay.style.display = 'flex';
}

let _opponentBuildSwapSlot = 0;

function resolveOpponentBuild(species, format) {
    const buildsArr = (typeof allBuilds !== 'undefined') ? allBuilds : [];
    let build = typeof findLatestBuildForSpecies === 'function'
        ? findLatestBuildForSpecies(species, format, buildsArr)
        : null;

    if (!build && buildsArr.length) {
        const key = normalizeSpeciesKey(species);
        const matches = buildsArr.filter(b => normalizeSpeciesKey(b.pokemon) === key);
        if (matches.length) {
            build = matches.reduce((best, cur) => {
                const bestId = parseInt(best.id, 10) || 0;
                const curId = parseInt(cur.id, 10) || 0;
                return curId > bestId ? cur : best;
            }, matches[0]);
        }
    }

    if (build && typeof parseAnalysisBuild === 'function') {
        const slot = parseAnalysisBuild(build.build);
        slot._buildSource = 'library';
        slot._buildId = build.id;
        return slot;
    }

    return createDefaultOpponentSlot(species);
}

function createDefaultOpponentSlot(species) {
    const slot = createEmptyOpponentSlot();
    slot.species = species;
    slot._buildSource = 'default';

    const db = getMonDb({ species });
    if (!db) return slot;

    if (db.Ability && db.Ability.length) slot.ability = db.Ability[0];

    const atk = parseInt(db.Attack, 10) || 0;
    const spa = parseInt(db['Sp.Atk'], 10) || 0;
    const spe = parseInt(db.Speed, 10) || 0;
    const hp = parseInt(db.HP, 10) || 0;
    const def = parseInt(db.Defense, 10) || 0;
    const spd = parseInt(db['Sp.Def'], 10) || 0;

    if (spe >= 90) {
        slot.nature = atk >= spa ? 'Jolly' : 'Timid';
        slot.evs = atk >= spa
            ? { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
            : { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 };
    } else if (hp + def + spd >= 240) {
        slot.nature = def >= spd ? 'Impish' : 'Careful';
        slot.evs = def >= spd
            ? { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
            : { hp: 32, atk: 0, def: 2, spa: 0, spd: 32, spe: 0 };
    } else {
        slot.nature = atk >= spa ? 'Adamant' : 'Modest';
        slot.evs = atk >= spa
            ? { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
            : { hp: 32, atk: 0, def: 2, spa: 32, spd: 0, spe: 0 };
    }
    if (typeof coerceEvsForMode === 'function') {
        slot.evs = coerceEvsForMode(slot.evs, typeof isChampionsEvMode === 'function' ? isChampionsEvMode() : true);
    }

    const t1 = (db.Type_1 || 'Normal').toLowerCase();
    const t2 = (db.Type_2 || '').toLowerCase();
    const stabMoves = [];
    if (typeof allMoves !== 'undefined') {
        allMoves.forEach(mv => {
            if (!mv || !mv.name || stabMoves.length >= 4) return;
            const mt = (mv.type || '').toLowerCase();
            const dc = (mv.damage_class || mv.category || '').toLowerCase();
            if (dc === 'status') return;
            if (mt === t1 || (t2 && mt === t2)) stabMoves.push(mv.name);
        });
    }
    while (stabMoves.length < 4) stabMoves.push('');
    slot.moves = stabMoves.slice(0, 4);
    return slot;
}

function setOpponentSpecies(slotIndex, species) {
    if (slotIndex < 0 || slotIndex > 5) return;
    _opponentTeam[slotIndex] = resolveOpponentBuild(species, _opponentFormat);
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

function clearOpponentSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex > 5) return;
    _opponentTeam[slotIndex] = createEmptyOpponentSlot();
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

function getActiveOpponentMons() {
    return _opponentTeam.filter(p => p && p.species);
}

function combinations(indices, k) {
    const result = [];
    function backtrack(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < indices.length; i++) {
            combo.push(indices[i]);
            backtrack(i + 1, combo);
            combo.pop();
        }
    }
    backtrack(0, []);
    return result;
}

function scoreMonThreatLevel(mon, format) {
    const db = getMonDb(mon);
    const roles = typeof detectRole === 'function' ? detectRole(mon, db) : [];
    const bst = parseInt(db?.Total_Stats, 10) || 0;
    let score = bst / 10;

    if (roles.includes('Physical Sweeper') || roles.includes('Special Sweeper')) score += 25;
    if (roles.includes('Wallbreaker')) score += 20;
    if (roles.includes('Setup Sweeper')) score += 15;
    if (roles.includes('Restricted Legendary')) score += 30;
    if (roles.includes('Trick Room Abuser')) score += format === 'Doubles' ? 12 : 5;
    if (roles.includes('Fake Out Pressure')) score += format === 'Doubles' ? 18 : 5;
    if (roles.includes('Speed Control')) score += format === 'Doubles' ? 15 : 8;

    const speed = getMonSpeed(mon, db, format);
    if (speed != null && speed >= 100) score += 10;

    return score;
}

function detectOpponentArchetype(mons, format) {
    const roles = mons.map(m => typeof detectRole === 'function' ? detectRole(m, getMonDb(m)) : []);
    const ctx = typeof buildTeamContext === 'function'
        ? buildTeamContext(mons, format, {}, {}, {}, roles)
        : { utils: {}, flatRoles: roles.flat(), hasSpecies: () => false };

    const archetypes = [];
    const labels = [];
    const moves = mons.flatMap(m => (m.moves || []).map(mv => normalizeMoveKey(mv)));
    const hasRainDance = moves.includes('raindance');
    const hasPrimaryRainSetter = mons.some((m, i) => {
        const ab = (m.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const r = roles[i] || [];
        const key = normalizeSpeciesKey(m.species);
        return ab === 'drizzle' || r.includes('Weather Setter') && ['pelipper', 'politoed', 'kyogre'].includes(key);
    });

    if (ctx.utils?.drizzle || hasPrimaryRainSetter || (hasRainDance && roles.flat().includes('Weather Abuser'))) {
        archetypes.push('rain');
        labels.push('Rain offense');
    }
    if (ctx.utils?.drought || ctx.hasSpecies?.(['torkoal', 'ninetalesalola'])) {
        archetypes.push('sun');
        labels.push('Sun offense');
    }
    if (ctx.utils?.tr) {
        archetypes.push('trickroom');
        labels.push('Trick Room');
    }
    if (ctx.utils?.tailwind) {
        archetypes.push('tailwind');
        labels.push('Tailwind offense');
    }
    if (ctx.utils?.psychicterrain || ctx.utils?.expandingforce) {
        archetypes.push('psychicterrain');
        labels.push('Psychic Terrain');
    }
    if (ctx.utils?.fakeout && ctx.utils?.protect) {
        archetypes.push('fakeout-core');
        labels.push('Fake Out + Protect');
    }

    return {
        archetypes, labels, ctx, roles,
        hasPrimaryRainSetter,
        hasRainDance,
        label: labels.length ? labels.join(' · ') : 'Balanced'
    };
}

function scoreArchetypeFit(mon, idx, archetypeInfo) {
    const roles = archetypeInfo.roles[idx] || [];
    const { archetypes } = archetypeInfo;
    let bonus = 0;
    const ab = (mon.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = normalizeSpeciesKey(mon.species);
    const moves = (mon.moves || []).map(m => normalizeMoveKey(m));

    if (archetypes.includes('rain')) {
        if (roles.includes('Weather Abuser')) bonus += 35;
        if (ab === 'swiftswim' || ab === 'aquatech') bonus += 28;
        if (moves.includes('raindance') && !ab.includes('drizzle')) bonus += 8;
    }
    if (archetypes.includes('sun')) {
        if (roles.includes('Weather Abuser')) bonus += 35;
        if (ab === 'chlorophyll' || ab === 'protosynthesis') bonus += 28;
    }
    if (archetypes.includes('trickroom')) {
        if (roles.includes('Trick Room Setter') || moves.includes('trickroom')) bonus += 50;
        if (roles.includes('Trick Room Abuser')) bonus += 38;
        if (roles.includes('Revenge Killer') && !roles.includes('Trick Room Abuser')) bonus -= 10;
    }
    if (archetypes.includes('tailwind')) {
        if (moves.includes('tailwind') || roles.includes('Speed Control')) bonus += 45;
        if (roles.includes('Physical Sweeper') || roles.includes('Special Sweeper')) bonus += 15;
    }
    if (archetypes.includes('fakeout-core')) {
        if (moves.includes('fakeout')) bonus += 35;
        if (moves.includes('protect')) bonus += 12;
    }
    if (isMegaCapable(mon)) bonus += 26;

    return bonus;
}

function predictBringSet(mons, format, isOpponent) {
    const bringCount = BRING_COUNT[format] || 3;
    if (mons.length <= bringCount) {
        return { indices: mons.map((_, i) => i), mons: [...mons], benchMons: [], benchIndices: [], reasoning: [] };
    }

    if (isOpponent) {
        const our = _ourTeamGetter ? (_ourTeamGetter() || []).filter(p => p && p.species) : [];
        return predictOpponentBringSet(mons, format, our);
    }

    return pickBestBringCombination(mons, format, bringCount);
}

function predictOpponentBringSet(mons, format, ourMons) {
    const bringCount = BRING_COUNT[format] || 3;
    const ourThreats = typeof scanOurThreatProfile === 'function'
        ? scanOurThreatProfile(ourMons || [])
        : { hasSun: false, hasDrought: false, hasRain: false, hasDrizzle: false, setupUsers: [], choiceUsers: [], protectUsers: [] };

    if (mons.length <= bringCount) {
        const archetype = detectOpponentArchetype(mons, format);
        const oppProfile = typeof scanOpponentInteractionProfile === 'function'
            ? scanOpponentInteractionProfile(mons, format)
            : { weather: {}, disruption: [], tr: [], speedControl: [] };
        return {
            indices: mons.map((_, i) => i),
            mons: [...mons],
            benchIndices: [],
            benchMons: [],
            archetype,
            ourThreats,
            oppProfile,
            reasoning: []
        };
    }

    const archetypeInfo = detectOpponentArchetype(mons, format);
    const oppProfile = typeof scanOpponentInteractionProfile === 'function'
        ? scanOpponentInteractionProfile(mons, format)
        : { weather: {}, disruption: [], tr: [], speedControl: [] };

    const coreBring = typeof getCoreBringIndices === 'function'
        ? getCoreBringIndices(mons, archetypeInfo, ourThreats, oppProfile, format)
        : new Map();

    const scored = mons.map((m, i) => {
        const disruption = typeof scoreDisruptionFit === 'function'
            ? scoreDisruptionFit(m, i, ourThreats, oppProfile)
            : { bonus: 0, tags: [] };
        const core = coreBring.get(i);
        return {
            i,
            score: scoreMonThreatLevel(m, format) + scoreArchetypeFit(m, i, archetypeInfo) + disruption.bonus + (core?.score || 0),
            coreReason: core?.reason,
            disruptionTags: disruption.tags
        };
    });

    const picked = [];
    scored.filter(s => coreBring.has(s.i)).sort((a, b) => b.score - a.score).forEach(s => {
        if (picked.length < bringCount && !picked.includes(s.i) && canAddMegaToPick(s.i, picked, mons)) {
            picked.push(s.i);
        }
    });
    scored.filter(s => !picked.includes(s.i)).sort((a, b) => b.score - a.score).forEach(s => {
        if (picked.length < bringCount && canAddMegaToPick(s.i, picked, mons)) picked.push(s.i);
    });

    const benchIndices = mons.map((_, i) => i).filter(i => !picked.includes(i));
    const reasoning = [];

    coreBring.forEach((core, idx) => {
        if (picked.includes(idx)) {
            reasoning.push(`${mons[idx].species}: ${core.reason}`);
        }
    });

    if (archetypeInfo.archetypes.includes('rain')) {
        const pickedMons = picked.map(i => mons[i]);
        const hasPrimaryIn = pickedMons.some((m, _) => {
            const i = mons.indexOf(m);
            return getMonAbilityKey(m) === 'drizzle' || ['pelipper', 'politoed'].includes(normalizeSpeciesKey(m.species));
        });
        const hasBackupIn = pickedMons.some(m => getMonMoveKeys(m).includes('raindance') && getMonAbilityKey(m) !== 'drizzle');
        const primaryBenched = oppProfile.weather.rain?.some(x => x.role === 'primary' && benchIndices.includes(x.i));
        const backupIn = oppProfile.weather.rain?.some(x => x.role === 'backup' && picked.includes(x.i));

        if (backupIn && primaryBenched && (ourThreats.hasSun || ourThreats.hasDrought)) {
            reasoning.push('Vs your Sun — backup Rain Dance user (e.g. Sableye) prioritized over auto-Drizzle: can override Drought, Encore your setup, and set screens.');
        } else if (hasPrimaryIn && !hasBackupIn) {
            reasoning.push('Standard rain bring — primary setter enables Swift Swim / water power Turn 1.');
        } else if (hasPrimaryIn && hasBackupIn) {
            reasoning.push('Double weather layer — both auto-rain and manual Rain Dance in bring for weather wars.');
        }
    }

    scored.filter(s => s.disruptionTags?.length && picked.includes(s.i)).forEach(s => {
        if (!reasoning.some(r => r.includes(mons[s.i].species))) {
            reasoning.push(`${mons[s.i].species} brought for disruption: ${s.disruptionTags.join(', ')} vs your team.`);
        }
    });

    const megaOnRoster = mons.map((m, i) => ({ i, m })).filter(x => isMegaCapable(x.m));
    if (megaOnRoster.length > 1) {
        const megaInBring = picked.filter(i => isMegaCapable(mons[i]));
        const benchedMegas = megaOnRoster.filter(x => !picked.includes(x.i));
        if (megaInBring.length === 1 && benchedMegas.length) {
            reasoning.push(`Only one Mega per battle — ${mons[megaInBring[0]].species} in; ${benchedMegas.map(x => x.m.species).join(', ')} likely benched.`);
        }
    }

    if (!reasoning.length) {
        reasoning.push(`Team reads as ${archetypeInfo.label} — bring tuned to your roster threats.`);
    }

    return {
        indices: picked,
        mons: picked.map(i => mons[i]),
        benchIndices,
        benchMons: benchIndices.map(i => mons[i]),
        archetype: archetypeInfo,
        ourThreats,
        oppProfile,
        reasoning
    };
}

function pickBestBringCombination(ourMons, format, bringCount) {
    const oppMons = getActiveOpponentMons();
    const ourThreats = typeof scanOurThreatProfile === 'function' ? scanOurThreatProfile(ourMons) : {};
    const oppBring = predictOpponentBringSet(oppMons, format, ourMons);
    const indices = ourMons.map((_, i) => i);
    const combos = combinations(indices, bringCount);

    let best = { indices: indices.slice(0, bringCount), score: -Infinity };

    combos.forEach(combo => {
        let score = 0;
        const bring = combo.map(i => ourMons[i]);
        const comboWeatherSim = typeof simulateTurn1Weather === 'function'
            ? simulateTurn1Weather(bring, oppBring.mons, format)
            : null;
        const comboField = buildMatchupField(format, comboWeatherSim);
        oppBring.mons.forEach(opp => {
            let bestVs = -Infinity;
            bring.forEach(our => {
                const m = computeMatchupPair(our, opp, format, comboField);
                bestVs = Math.max(bestVs, m.netScore);
            });
            score += bestVs;
        });

        const roles = bring.map(m => typeof detectRole === 'function' ? detectRole(m, getMonDb(m)) : []);
        const ctx = typeof buildTeamContext === 'function'
            ? buildTeamContext(bring, format, {}, {}, {}, roles)
            : null;
        if (ctx) {
            if (format === 'Doubles' && ctx.utils.fakeout) score += 8;
            if (ctx.utils.tailwind || ctx.utils.tr) score += 6;
            if (ctx.utils.protect) score += 4;
        }

        if (typeof scoreWeatherWarPenalty === 'function') {
            const ww = scoreWeatherWarPenalty(ourMons, bring, oppBring, format);
            score -= ww.penalty;
        }

        const megasInCombo = bring.filter(isMegaCapable).length;
        if (megasInCombo > 1) score -= 55;

        const typeSet = new Set();
        bring.forEach(m => {
            const db = getMonDb(m);
            [db?.Type_1, db?.Type_2].filter(Boolean).forEach(t => typeSet.add(t));
        });
        score += typeSet.size * 2;

        if (score > best.score) best = { indices: combo, score };
    });

    const ourBringMons = best.indices.map(i => ourMons[i]);
    const matchupGaps = typeof analyzeMatchupGaps === 'function'
        ? analyzeMatchupGaps(ourMons, ourBringMons, oppMons, oppBring, format)
        : [];

    return {
        indices: best.indices,
        mons: ourBringMons,
        scores: best.indices.map(i => scoreMonThreatLevel(ourMons[i], format)),
        matchupGaps
    };
}

function computeMatchupPair(ourMon, oppMon, format, fieldOverride) {
    const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
    const field = fieldOverride || (typeof getDefaultField === 'function' ? getDefaultField(format) : null);
    const hasCalc = typeof buildCalcStateFromSlot === 'function'
        && typeof findBestDamage === 'function'
        && field && movesDb.length;

    const ourForme = getBattleFormeInfo(ourMon);
    const oppForme = getBattleFormeInfo(oppMon);
    const ourDb = ourForme.battleDb;
    const oppDb = oppForme.battleDb;

    const ourTypes = [ourDb?.Type_1, ourDb?.Type_2].filter(Boolean);
    const oppTypes = [oppDb?.Type_1, oppDb?.Type_2].filter(Boolean);

    let offense = null;
    let defense = null;
    let ourSpeed = null;
    let oppSpeed = null;
    let ourBaseSpeed = null;
    let oppBaseSpeed = null;
    let speedTier = 'tie';
    let speedTierTurn1 = 'tie';
    let netScore = 0;

    if (hasCalc && ourDb && oppDb) {
        const ourAtk = buildCalcStateFromSlot(ourMon, 1, ourDb, movesDb);
        const ourDef = buildCalcStateFromSlot(ourMon, 2, ourDb, movesDb);
        const oppAtk = buildCalcStateFromSlot(oppMon, 1, oppDb, movesDb);
        const oppDef = buildCalcStateFromSlot(oppMon, 2, oppDb, movesDb);

        offense = findBestDamage(ourAtk, oppDef, field);
        defense = findBestDamage(oppAtk, ourDef, field);
        ourSpeed = getEffectiveSpeed(ourAtk, field);
        oppSpeed = getEffectiveSpeed(oppAtk, field);
        speedTier = compareSpeedTier(ourSpeed, oppSpeed);

        if (ourForme.isMega && ourForme.baseDb) {
            const ourAtkBase = buildCalcStateFromSlot(ourMon, 1, ourForme.baseDb, movesDb);
            ourBaseSpeed = getEffectiveSpeed(ourAtkBase, field);
        } else ourBaseSpeed = ourSpeed;

        if (oppForme.isMega && oppForme.baseDb) {
            const oppAtkBase = buildCalcStateFromSlot(oppMon, 1, oppForme.baseDb, movesDb);
            oppBaseSpeed = getEffectiveSpeed(oppAtkBase, field);
            speedTierTurn1 = compareSpeedTier(ourBaseSpeed ?? ourSpeed, oppBaseSpeed);
        } else {
            oppBaseSpeed = oppSpeed;
            speedTierTurn1 = speedTier;
        }

        if (offense && parseFloat(offense.maxPercent) > 0) {
            if (typeof isStrongAnswer === 'function' && isStrongAnswer(offense.koLabel)) netScore += 45;
            else if (parseFloat(offense.maxPercent) >= 100) netScore += 38;
            else if (parseFloat(offense.maxPercent) >= 75) netScore += 28;
            else if (parseFloat(offense.maxPercent) >= 50) netScore += 14;
            else netScore += 5;
        }

        if (defense && parseFloat(defense.maxPercent) > 0) {
            if (typeof isStrongAnswer === 'function' && isStrongAnswer(defense.koLabel)) netScore -= 40;
            else if (parseFloat(defense.maxPercent) >= 100) netScore -= 32;
            else if (parseFloat(defense.maxPercent) >= 75) netScore -= 22;
            else if (parseFloat(defense.maxPercent) >= 50) netScore -= 10;
        }

        if (speedTier === 'faster' && offense && parseFloat(offense.maxPercent) >= 50) netScore += 12;
        if (speedTier === 'slower' && defense && parseFloat(defense.maxPercent) >= 75) netScore -= 14;
    } else {
        const ourMoveTypes = (ourMon.moves || []).filter(Boolean).map(m => resolveMoveType(m)).filter(Boolean);
        const oppMoveTypes = (oppMon.moves || []).filter(Boolean).map(m => resolveMoveType(m)).filter(Boolean);

        ourMoveTypes.forEach(mt => {
            const eff = getEffectiveness(mt, oppTypes);
            if (eff > 1) netScore += 15;
            if (eff === 0) netScore -= 5;
        });
        (oppMoveTypes.length ? oppMoveTypes : oppTypes).forEach(mt => {
            const eff = getEffectiveness(mt, ourTypes);
            if (eff > 1) netScore -= 12;
            if (eff === 0) netScore += 10;
        });
    }

    const checkLabel = offense
        ? classifyCheck(offense, speedTier === 'faster')
        : (netScore >= 15 ? 'Type advantage' : netScore <= -10 ? 'Disadvantage' : 'Neutral');

    return {
        ourMon, oppMon,
        offense, defense,
        ourSpeed, oppSpeed, ourBaseSpeed, oppBaseSpeed,
        speedTier, speedTierTurn1,
        netScore, checkLabel,
        ourTypes, oppTypes,
        ourForme, oppForme,
        targetLabel: oppForme.isMega ? oppForme.battleLabel : oppMon.species
    };
}

function classifyCheck(offense, outspeeds) {
    if (!offense) return 'No data';
    const max = parseFloat(offense.maxPercent) || 0;
    const ko = offense.koLabel || '';
    if (typeof isStrongAnswer === 'function' && isStrongAnswer(ko)) {
        return outspeeds ? 'Hard counter (faster)' : 'Check (slower)';
    }
    if (max >= 100) return outspeeds ? 'OHKO (faster)' : 'OHKO (must tank hit)';
    if (max >= 75) return outspeeds ? 'Strong check' : 'Situational check';
    if (max >= 50) return 'Soft check';
    return 'Low damage';
}

function getBaseSpeciesKey(mon) {
    const info = getBattleFormeInfo(mon);
    return normalizeSpeciesKey(info.baseDb?.Name || mon.species);
}

function isMirrorMatchup(ourMon, oppMon) {
    return getBaseSpeciesKey(ourMon) === getBaseSpeciesKey(oppMon);
}

function getKoPriority(koLabel, maxPercent) {
    const max = parseFloat(maxPercent) || 0;
    const ko = (koLabel || '').toLowerCase();
    if (ko.includes('ohko') && !ko.includes('2hko') && !ko.includes('3hko')) return 100;
    if (max >= 100) return 95;
    if (ko.includes('2hko')) return 55;
    if (max >= 75) return 40;
    if (ko.includes('3hko')) return 25;
    if (max >= 50) return 15;
    return 0;
}

function compareCounterEntries(a, b, ourBringSpecies, megaInBring) {
    const aBring = ourBringSpecies.has(a.species) ? 1 : 0;
    const bBring = ourBringSpecies.has(b.species) ? 1 : 0;
    if (aBring !== bBring) return bBring - aBring;

    if (a.isMirror !== b.isMirror) return a.isMirror ? 1 : -1;

    if (a.extraMega && !b.extraMega) return 1;
    if (b.extraMega && !a.extraMega) return -1;

    const aKo = getKoPriority(a.koLabel, a.maxPercent);
    const bKo = getKoPriority(b.koLabel, b.maxPercent);
    if (aKo !== bKo) return bKo - aKo;

    if (a.speedTier === 'faster' && b.speedTier !== 'faster') return -1;
    if (b.speedTier === 'faster' && a.speedTier !== 'faster') return 1;

    return b.netScore - a.netScore;
}

function buildMirrorMatchAdvice(ourMon, oppMon, format, ourBringMons) {
    if (!isMirrorMatchup(ourMon, oppMon)) return null;
    const ourSnap = getSpeedSnapshot(ourMon, format);
    const oppSnap = getSpeedSnapshot(oppMon, format);
    const ourInBring = ourBringMons.some(m => m.species === ourMon.species);
    const bothMega = ourSnap.info.isMega && oppSnap.info.isMega;
    const lines = [];

    if (bothMega) {
        lines.push('Mirror Mega — only one Mega per battle; avoid trading into their identical form. Use a different slot.');
    }
    if (ourSnap.battleSpeed === oppSnap.battleSpeed) {
        lines.push(`Speed tie at ${ourSnap.battleSpeed} Spe — lead something else or use priority; mirror is a 50/50.`);
    } else if (ourSnap.battleSpeed > oppSnap.battleSpeed) {
        lines.push(`You outspeed (${ourSnap.battleSpeed} vs ${oppSnap.battleSpeed}) — but mirror still risks mutual KO from Rock/Dragon coverage.`);
    } else {
        lines.push(`They outspeed (${oppSnap.battleSpeed} vs ${ourSnap.battleSpeed}) — do not mirror lead unless you have a bulkier set.`);
    }
    if (!ourInBring) {
        lines.push('This mon is not in your recommended bring — use a bring-slot answer instead.');
    }
    const nonMirror = ourBringMons.filter(m => !isMirrorMatchup(m, oppMon));
    if (nonMirror.length) {
        lines.push(`Prefer **${nonMirror.slice(0, 2).map(m => m.species).join('** or **')}** from your bring over a mirror.`);
    }
    return lines.join(' ');
}

function buildCounterMatrix(ourMons, oppMons, format, oppBring, ourBring, fieldOverride) {
    const broughtSpecies = new Set((oppBring?.mons || []).map(m => m.species));
    const ourBringMons = ourBring?.mons || ourMons;
    const ourBringSpecies = new Set(ourBringMons.map(m => m.species));
    const megaInBring = ourBringMons.filter(isMegaCapable).map(m => m.species);
    const hasMegaInBring = megaInBring.length > 0;
    const matrix = [];
    const matchupField = fieldOverride || buildMatchupField(format,
        typeof simulateTurn1Weather === 'function'
            ? simulateTurn1Weather(ourBringMons, oppBring?.mons || [], format)
            : null);

    const sortedOpp = [...oppMons].sort((a, b) => {
        const aIn = broughtSpecies.has(a.species) ? 0 : 1;
        const bIn = broughtSpecies.has(b.species) ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
        return oppMons.indexOf(a) - oppMons.indexOf(b);
    });

    sortedOpp.forEach(opp => {
        const row = {
            opponent: opp.species,
            oppTypes: [getMonDb(opp)?.Type_1, getMonDb(opp)?.Type_2].filter(Boolean),
            isBench: !broughtSpecies.has(opp.species),
            counters: [],
            checks: [],
            threats: []
        };

        ourMons.forEach(our => {
            const m = computeMatchupPair(our, opp, format, matchupField);
            const mirror = isMirrorMatchup(our, opp);
            const inBring = ourBringSpecies.has(our.species);
            const extraMega = hasMegaInBring && isMegaCapable(our) && !megaInBring.includes(our.species);
            const entry = {
                species: our.species,
                move: m.offense?.move || '—',
                minPercent: m.offense?.minPercent || '—',
                maxPercent: m.offense?.maxPercent || '—',
                koLabel: m.offense?.koLabel || '',
                defenseMove: m.defense?.move || '—',
                defensePercent: m.defense?.maxPercent || '—',
                defenseKo: m.defense?.koLabel || '',
                speedTier: m.speedTier,
                ourSpeed: m.ourSpeed,
                oppSpeed: m.oppSpeed,
                netScore: m.netScore,
                checkLabel: m.checkLabel,
                inBring,
                isMirror: mirror,
                extraMega,
                koPriority: getKoPriority(m.offense?.koLabel, m.offense?.maxPercent)
            };

            if (m.netScore >= 20 && !mirror) row.counters.push(entry);
            else if (m.netScore >= 20 && mirror) row.checks.push(entry);
            else if (m.netScore >= 5 && !mirror) row.checks.push(entry);
            else if (m.netScore >= 5 && mirror) row.checks.push({ ...entry, isMirror: true });
            if (m.defense && parseFloat(m.defense.maxPercent) >= 75) row.threats.push(entry);
        });

        const sortFn = (a, b) => compareCounterEntries(a, b, ourBringSpecies, megaInBring);
        row.counters.sort(sortFn);
        row.checks.sort(sortFn);

        const allRanked = [...row.counters, ...row.checks];
        row.bestAnswer = allRanked.find(e => e.inBring && !e.isMirror)
            || allRanked.find(e => e.inBring)
            || allRanked.find(e => !e.isMirror && !e.extraMega)
            || allRanked[0] || null;
        row.altAnswers = allRanked.filter(e => e !== row.bestAnswer).slice(0, 4);
        row.mirrorNote = ourMons.filter(our => isMirrorMatchup(our, opp)).length
            ? buildMirrorMatchAdvice(
                ourMons.find(our => isMirrorMatchup(our, opp)),
                opp, format, ourBringMons
            )
            : null;
        row.oppForme = getBattleFormeInfo(opp);
        matrix.push(row);
    });
    return matrix;
}

function buildSpeedChart(ourMons, oppMons, format) {
    const entries = [];
    ourMons.forEach(our => {
        const ourSnap = getSpeedSnapshot(our, format);
        oppMons.forEach(opp => {
            const oppSnap = getSpeedSnapshot(opp, format);
            const turn1 = compareSpeedLabels(ourSnap.baseSpeed, oppSnap.baseSpeed);
            const afterMega = compareSpeedLabels(ourSnap.battleSpeed, oppSnap.battleSpeed);
            if (turn1 === 'faster' && afterMega === 'slower' && oppSnap.info.isMega) {
                entries.push({
                    type: 'mega_trap',
                    our: our.species, opp: opp.species,
                    ourSpeed: ourSnap.battleSpeed, oppBase: oppSnap.baseSpeed, oppMega: oppSnap.battleSpeed,
                    text: `You outspeed ${opp.species} pre-Mega (${ourSnap.battleSpeed} vs ${oppSnap.baseSpeed}) but **${oppSnap.info.battleLabel}** jumps to ${oppSnap.battleSpeed} — KO or status before they Mega, or use priority.`
                });
            } else if (turn1 === 'slower' && afterMega === 'faster' && ourSnap.info.isMega) {
                entries.push({
                    type: 'our_mega',
                    our: our.species, opp: opp.species,
                    text: `**${ourSnap.info.battleLabel}** flips the speed matchup vs ${opp.species} (${ourSnap.baseSpeed} → ${ourSnap.battleSpeed} Spe). Consider Mega Turn 1 if they cannot KO your base form.`
                });
            } else if (afterMega === 'slower' && parseFloat(computeMatchupPair(our, opp, format).defense?.maxPercent || 0) >= 75) {
                entries.push({
                    type: 'speed_loss',
                    our: our.species, opp: opp.species,
                    text: `${oppSnap.info.isMega ? oppSnap.info.battleLabel : opp.species} (${oppSnap.battleSpeed} Spe) outspeeds your ${our.species} (${ourSnap.battleSpeed}) — Protect, priority, or switch to a faster answer.`
                });
            }
        });
    });
    return entries.slice(0, 8);
}

function buildMegaIntel(ourMons, oppMons) {
    const intel = [];
    [...oppMons, ...ourMons].forEach((mon, idx) => {
        const isOurs = idx >= oppMons.length;
        const snap = getSpeedSnapshot(mon, _opponentFormat);
        if (!snap.info.isMega && !snap.info.isPrimal) return;
        intel.push({
            side: isOurs ? 'you' : 'opponent',
            species: mon.species,
            label: snap.info.battleLabel,
            item: snap.info.item,
            baseSpeed: snap.baseSpeed,
            battleSpeed: snap.battleSpeed,
            delta: snap.speedDelta,
            types: [snap.info.battleDb?.Type_1, snap.info.battleDb?.Type_2].filter(Boolean)
        });
    });
    return intel;
}

function buildDetailedBattlePlan(opts) {
    const { format, ourBring, oppBring, ourTeam, oppTeam, leadAnalysis, matrix, oppBringMeta } = opts;
    const sections = [];

    // Turn 1
    const turn1 = [];
    const ourLeadNames = (leadAnalysis.ourLeads || []).map(p => p.species).join(' / ');
    const oppLeadNames = (leadAnalysis.oppLeads || []).map(p => p.species).join(' / ');
    if (format === 'Doubles') {
        turn1.push(`**Team Preview:** Lead **${ourLeadNames}** into their likely **${oppLeadNames}**. Identify their restricted / Mega / weather piece before committing a double-target.`);
    } else {
        turn1.push(`**Turn 1:** Lead **${ourLeadNames}** vs predicted **${oppLeadNames}**. Scout with pivot if their set is unknown.`);
    }

    const oppMegas = oppTeam.filter(isMegaCapable);
    oppMegas.forEach(m => {
        const snap = getSpeedSnapshot(m, format);
        const inBring = (oppBring.mons || []).some(b => b.species === m.species);
        if (!inBring) return;
        turn1.push(`**Mega alert:** ${m.species} holds **${m.item}** → becomes **${snap.info.battleLabel}** (${snap.baseSpeed} → ${snap.battleSpeed} Spe). Expect Mega Turn 1 or 2 if it threatens a double KO.`);
    });

    if (oppBringMeta?.archetypes?.includes('rain')) {
        turn1.push('**Rain Turn 1:** If they have backup Rain Dance (e.g. Sableye), **last weather wins** — your faster Sunny Day can still lose to their slower Rain Dance. KO or Taunt the setter before committing Solar Beam / Sun.');
    }
    if (leadAnalysis.leadMatchups?.length) {
        const best = leadAnalysis.leadMatchups.reduce((a, b) => (b.netScore > (a?.netScore || -99) ? b : a), null);
        if (best?.offense) {
            turn1.push(`**Best opener:** ${best.ourLead} uses **${best.offense.move}** on ${best.oppLead} (${best.offense.maxPercent}% calc)${best.speedTier === 'faster' ? ' — you move first.' : best.speedTier === 'slower' ? ' — you must survive their hit or Protect.' : '.'}`);
        }
    }
    sections.push({ title: 'Turn 1 — Open Strong', items: turn1 });

    // Midgame
    const mid = [];
    (matrix || []).filter(r => !r.isBench && r.bestAnswer).forEach(r => {
        const a = r.bestAnswer;
        const formeNote = r.oppForme?.isMega ? ` (calc vs **${r.oppForme.battleLabel}**) ` : ' ';
        mid.push(`When **${r.opponent}** is active:${formeNote}switch to **${a.species}** and click **${a.move}** (${a.maxPercent}%${a.koLabel ? ', ' + a.koLabel.replace('Guaranteed ', '') : ''}).`);
    });
    const benchThreats = (matrix || []).filter(r => r.isBench && r.bestAnswer);
    if (benchThreats.length) {
        mid.push(`**Bench scout:** They might bring ${benchThreats.map(r => r.opponent).join(', ')} — keep answers in the back of your mind.`);
    }
    sections.push({ title: 'Midgame — Targeted Counters', items: mid.slice(0, 7) });

    // Win path
    const win = [];
    const ourMega = ourTeam.filter(isMegaCapable);
    ourMega.forEach(m => {
        const snap = getSpeedSnapshot(m, format);
        win.push(`Your **${snap.info.battleLabel}** (${snap.battleSpeed} Spe) is a win condition — Mega when it secures a speed jump or OHKO on their biggest threat.`);
    });
    const teraMons = ourBring.mons.filter(m => m.tera && m.tera !== 'Normal');
    if (teraMons.length) {
        win.push(`**Tera timing:** ${teraMons.map(m => `${m.species} → Tera ${m.tera}`).join(', ')} — Terastallize to flip a bad matchup or boost a KO calc, not as a panic switch.`);
    }
    if (!win.length) win.push('Close by maintaining speed control and never letting their ace get two free turns.');
    sections.push({ title: 'Win Path', items: win });

    // Mind games
    const mind = [];
    if (format === 'Doubles') {
        mind.push('Fake a conservative lead — if they respect Fake Out / Protect, you gain a free read on their real win condition.');
        mind.push('Double-target their support (Follow Me user, weather setter) before their sweeper gets setup.');
    }
    mind.push('Track which megas / teras they have revealed — once spent, their endgame is predictable.');
    sections.push({ title: 'Mind Games & Reads', items: mind });

    return sections;
}

function renderBattleIntelPanel(plan, speedChart, megaIntel, format, interactionWarnings, interactionPlays, matchupGaps) {
    const el = document.getElementById('opp-battle-intel');
    if (!el) return;

    const criticalGaps = (matchupGaps || []).filter(g => g.severity === 'critical');
    const gapHtml = criticalGaps.length ? `
        <div class="opp-intel-block opp-intel-block--critical">
            <h4 class="opp-intel-block__title">Critical Matchup Gaps</h4>
            <div class="opp-warn-list">
                ${criticalGaps.map(g => `
                    <div class="opp-warn-item opp-warn-item--critical">
                        <span class="opp-warn-item__head">${escapeAnalysisHtml(g.title)}</span>
                        <p>${g.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                        ${g.fix ? `<p class="opp-warn-item__fix"><strong>Fix:</strong> ${escapeAnalysisHtml(g.fix)}</p>` : ''}
                    </div>`).join('')}
            </div>
        </div>` : '';

    const warnHtml = (interactionWarnings || []).length ? `
        <div class="opp-intel-block opp-intel-block--warn">
            <h4 class="opp-intel-block__title">Interaction Alerts</h4>
            <div class="opp-warn-list">
                ${interactionWarnings.slice(0, 10).map(w => `
                    <div class="opp-warn-item opp-warn-item--${w.severity}">
                        <span class="opp-warn-item__head">${escapeAnalysisHtml(w.species)} · ${escapeAnalysisHtml(w.move)}${w.inBring ? ' <span class="opp-preview-tag opp-preview-tag--bring">IN</span>' : ' <span class="opp-preview-tag opp-preview-tag--bench">SCOUT</span>'}</span>
                        <p>${w.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                    </div>`).join('')}
            </div>
        </div>` : '';

    const interactPlaysHtml = (interactionPlays || []).length ? `
        <div class="opp-intel-block">
            <h4 class="opp-intel-block__title">Weather Wars &amp; Disruption Reads</h4>
            <ul class="opp-intel-list">${interactionPlays.map(p => `<li>${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>
        </div>` : '';

    const megaHtml = megaIntel.length ? `
        <div class="opp-intel-block">
            <h4 class="opp-intel-block__title">Mega Evolution Intel</h4>
            <div class="opp-mega-grid">
                ${megaIntel.map(m => `
                    <div class="opp-mega-card opp-mega-card--${m.side}">
                        <span class="opp-mega-card__side">${m.side === 'you' ? 'Your' : 'Their'}</span>
                        <span class="opp-mega-card__name">${escapeAnalysisHtml(m.label)}</span>
                        <span class="opp-mega-card__item">${escapeAnalysisHtml(m.item)}</span>
                        <span class="opp-mega-card__speed">${m.baseSpeed} → ${m.battleSpeed} Spe ${m.delta > 0 ? `(+${m.delta})` : ''}</span>
                        <span class="opp-mega-card__types">${m.types.map(t => `<img src="${typeIconSrc(t)}" height="14" alt="">`).join('')}</span>
                    </div>`).join('')}
            </div>
        </div>` : '';

    const speedHtml = speedChart.length ? `
        <div class="opp-intel-block">
            <h4 class="opp-intel-block__title">Speed Traps & Mega Timing</h4>
            <ul class="opp-intel-list">${speedChart.map(s => `<li>${s.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>
        </div>` : '';

    const planHtml = (plan || []).map(sec => `
        <div class="opp-intel-block">
            <h4 class="opp-intel-block__title">${escapeAnalysisHtml(sec.title)}</h4>
            <ul class="opp-intel-list">${sec.items.map(item => `<li>${item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>
        </div>`).join('');

    el.innerHTML = `
        <p class="opp-intel-intro">Battle-ready reads for <strong>${format}</strong> — weather wars, Encore/Taunt traps, Mega timing, and turn-by-turn plays.</p>
        ${gapHtml}
        ${warnHtml}
        ${interactPlaysHtml}
        ${megaHtml}
        ${speedHtml}
        ${planHtml || '<p class="opp-empty-note">Add opponent Pokémon for a full battle plan.</p>'}`;
}

function explainMatchupLeadReason(mon, monRoles, oppLeads, format, field) {
    const base = typeof explainLeadReason === 'function'
        ? explainLeadReason(mon, monRoles, { utils: {}, format }, format)
        : '';
    if (!oppLeads?.length) return base;

    const bestVs = oppLeads.map(opp => ({
        species: opp.species,
        m: computeMatchupPair(mon, opp, format, field)
    })).sort((a, b) => b.m.netScore - a.m.netScore)[0];

    if (bestVs && bestVs.m.netScore >= 15 && bestVs.m.offense?.maxPercent) {
        return `${base.split('.')[0]} — threatens ${bestVs.species} (${bestVs.m.offense.move}, ${bestVs.m.offense.maxPercent}%).`;
    }
    if (bestVs && bestVs.m.netScore <= -10) {
        return `Support lead — keeps ${mon.species} safe from ${bestVs.species} while partner pressures.`;
    }
    return base;
}

function scoreLeadPairMatchup(monA, monB, rolesA, rolesB, oppLeads, format, ctx, field) {
    let score = 0;
    if (typeof scoreLeadFitness === 'function') {
        score += scoreLeadFitness(monA, rolesA, ctx, format) + scoreLeadFitness(monB, rolesB, ctx, format);
    }

    const supportRoles = ['Speed Control', 'Redirection', 'Fake Out Pressure', 'Trick Room Setter', 'Screener', 'Damage Mitigation'];
    const offenseRoles = ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker', 'Setup Sweeper'];
    const aSupport = rolesA.some(r => supportRoles.includes(r));
    const bSupport = rolesB.some(r => supportRoles.includes(r));
    const aOffense = rolesA.some(r => offenseRoles.includes(r));
    const bOffense = rolesB.some(r => offenseRoles.includes(r));

    if (aSupport && bSupport && !aOffense && !bOffense) score -= 35;
    if (rolesA.includes('Setup Sweeper') && rolesB.includes('Setup Sweeper')) score -= 30;
    if (rolesA.includes('Restricted Legendary') && rolesB.includes('Restricted Legendary')) score -= 40;
    if ((rolesA.includes('Restricted Legendary') || rolesB.includes('Restricted Legendary'))
        && !rolesA.includes('Fake Out Pressure') && !rolesB.includes('Fake Out Pressure')
        && !rolesA.includes('Redirection') && !rolesB.includes('Redirection')) {
        score -= 22;
    }

    let totalMatchup = 0;
    oppLeads.forEach(oppLead => {
        const mA = computeMatchupPair(monA, oppLead, format, field);
        const mB = computeMatchupPair(monB, oppLead, format, field);
        totalMatchup += mA.netScore + mB.netScore;
        if (Math.max(mA.netScore, mB.netScore) >= 15) score += 10;
        if (Math.min(mA.netScore, mB.netScore) <= -15) score -= 12;

        const oppKey = normalizeSpeciesKey(oppLead.species);
        if (oppKey === normalizeSpeciesKey(monA.species) && aSupport) score -= 18;
        if (oppKey === normalizeSpeciesKey(monB.species) && bSupport) score -= 18;
    });
    score += totalMatchup;

    const mainThreat = oppLeads.reduce((best, opp) => {
        const threat = scoreMonThreatLevel(opp, format);
        return !best || threat > best.threat ? { opp, threat } : best;
    }, null)?.opp;
    if (mainThreat) {
        const vsThreat = Math.max(
            computeMatchupPair(monA, mainThreat, format, field).netScore,
            computeMatchupPair(monB, mainThreat, format, field).netScore
        );
        if (vsThreat < -5) score -= 28;
        else if (vsThreat >= 10) score += 14;
    }

    return score;
}

function predictMatchupAwareLineup(ourBring, ourRoles, oppLeads, format, ctx, field) {
    if (!ourBring.length) {
        return { leadIndices: [], backIndices: [], leads: [], backMons: [], leadReasons: [] };
    }

    if (format === 'Doubles' && ourBring.length >= 2) {
        const pairCombos = ourBring.length === 2
            ? [[0, 1]]
            : combinations(ourBring.map((_, i) => i), 2);

        let best = { score: -Infinity, indices: [0, Math.min(1, ourBring.length - 1)] };
        pairCombos.forEach(combo => {
            const [i, j] = combo;
            const pairScore = scoreLeadPairMatchup(
                ourBring[i], ourBring[j],
                ourRoles[i] || [], ourRoles[j] || [],
                oppLeads || [], format, ctx, field
            );
            if (pairScore > best.score) best = { score: pairScore, indices: combo };
        });

        const leadIndices = best.indices;
        const backIndices = ourBring.map((_, idx) => idx).filter(idx => !leadIndices.includes(idx));
        return {
            leadIndices,
            backIndices,
            leads: leadIndices.map(i => ourBring[i]),
            backMons: backIndices.map(i => ourBring[i]),
            leadReasons: leadIndices.map(i => explainMatchupLeadReason(ourBring[i], ourRoles[i] || [], oppLeads, format, field))
        };
    }

    let bestIdx = 0;
    let bestScore = -Infinity;
    const oppLead = oppLeads?.[0];
    ourBring.forEach((mon, i) => {
        let score = typeof scoreLeadFitness === 'function'
            ? scoreLeadFitness(mon, ourRoles[i] || [], ctx, format) : 0;
        if (oppLead) score += computeMatchupPair(mon, oppLead, format, field).netScore * 1.5;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    const backIndices = ourBring.map((_, i) => i).filter(i => i !== bestIdx);
    return {
        leadIndices: [bestIdx],
        backIndices,
        leads: [ourBring[bestIdx]],
        backMons: backIndices.map(i => ourBring[i]),
        leadReasons: [explainMatchupLeadReason(ourBring[bestIdx], ourRoles[bestIdx] || [], oppLeads, format, field)]
    };
}

function analyzeLeadRecommendation(ourBring, oppBring, format, oppArchetype) {
    if (!ourBring.length || !oppBring.length) {
        return { ourLeads: [], oppLeads: [], reasoning: [], leadMatchups: [] };
    }

    const ourRoles = ourBring.map(m => typeof detectRole === 'function' ? detectRole(m, getMonDb(m)) : []);
    const oppRoles = oppBring.map(m => typeof detectRole === 'function' ? detectRole(m, getMonDb(m)) : []);

    const ourCtx = typeof buildTeamContext === 'function'
        ? buildTeamContext(ourBring, format, {}, {}, {}, ourRoles)
        : { utils: {} };
    const oppCtx = typeof buildTeamContext === 'function'
        ? buildTeamContext(oppBring, format, {}, {}, {}, oppRoles)
        : { utils: {} };

    const weatherSim = typeof simulateTurn1Weather === 'function'
        ? simulateTurn1Weather(ourBring, oppBring, format)
        : null;
    const matchupField = buildMatchupField(format, weatherSim);
    const weatherNote = weatherSim?.activeWeather
        ? (typeof weatherLabel === 'function'
            ? `Calcs use **${weatherLabel(weatherSim.activeWeather)}** Turn 1 (${weatherSim.lastSetter?.species || 'last setter'} wins).`
            : `Calcs use active weather Turn 1.`)
        : null;

    const oppLineup = typeof predictLineup === 'function'
        ? predictLineup(oppBring, oppRoles, format, oppCtx)
        : { leads: oppBring.slice(0, format === 'Doubles' ? 2 : 1), leadReasons: [] };

    const ourLineup = predictMatchupAwareLineup(ourBring, ourRoles, oppLineup.leads, format, ourCtx, matchupField);

    const leadMatchups = [];
    const reasoning = [];
    if (weatherNote) reasoning.push(weatherNote);

    ourLineup.leads.forEach((ourLead, li) => {
        oppLineup.leads.forEach((oppLead, oi) => {
            const m = computeMatchupPair(ourLead, oppLead, format, matchupField);
            leadMatchups.push({
                ourLead: ourLead.species,
                oppLead: oppLead.species,
                offense: m.offense,
                defense: m.defense,
                speedTier: m.speedTier,
                netScore: m.netScore,
                ourReason: ourLineup.leadReasons?.[li] || '',
                oppReason: oppLineup.leadReasons?.[oi] || '',
                weather: weatherSim?.activeWeather || null
            });
        });
    });

    if (format === 'Doubles') {
        const ourNames = ourLineup.leads.map(p => p.species).join(' / ');
        const oppNames = oppLineup.leads.map(p => p.species).join(' / ');

        if (ourCtx.utils?.fakeout && oppCtx.utils?.fakeout) {
            reasoning.push(`Mirror Fake Out leads (${ourNames} vs ${oppNames}) — speed ties and Intimidate/ability order decide Turn 1.`);
        } else if (ourCtx.utils?.fakeout && !oppCtx.utils?.fakeout) {
            reasoning.push(`Your ${ourNames} can Fake Out their faster threat while the partner attacks — strong opener if you read their lead correctly.`);
        } else if (oppCtx.utils?.fakeout) {
            reasoning.push(`Opponent ${oppNames} likely opens with Fake Out — Protect or a faster priority move on your lead pair mitigates free damage.`);
        }

        if (ourCtx.utils?.tailwind && oppCtx.speedTiers?.fast >= 2) {
            reasoning.push('Tailwind on your side flips speed against their fast dual-lead — lead the setter with a Protect user if they carry Fake Out.');
        }
        if (oppCtx.utils?.tr && ourCtx.utils?.tr) {
            reasoning.push('Both teams have Trick Room — lead depends on who wins the speed-control war Turn 1. Consider taunting or KOing their setter.');
        } else if (oppCtx.utils?.tr) {
            reasoning.push(`Opponent may lead Trick Room (${oppNames}) — KO the setter or apply immediate pressure before TR goes up.`);
        }
        if (oppArchetype?.archetypes?.includes('rain')) {
            const setter = oppLineup.leads.find(p => {
                const r = oppRoles[oppBring.indexOf(p)] || [];
                return r.includes('Weather Setter') || normalizeSpeciesKey(p.species) === 'pelipper';
            }) || oppLineup.leads.find(p => (p.moves || []).some(m => normalizeMoveKey(m) === 'raindance'));
            if (setter) {
                const isBackup = typeof getMonMoveKeys === 'function' && getMonMoveKeys(setter).includes('raindance') && getMonAbilityKey(setter) !== 'drizzle';
                if (isBackup) reasoning.push(`**${setter.species}** may lead Rain Dance — overrides your Sun/Drought, then Encore/screens. Taunt or double-target Turn 1.`);
                else reasoning.push(`Rain team — expect **${setter.species}** to set weather. KO, Taunt, or override with your weather.`);
            } else reasoning.push('Rain team — pressure weather before Swift Swim snowballs.');
        }

        if (!reasoning.length) {
            const avgMatchup = leadMatchups.reduce((s, m) => s + m.netScore, 0) / (leadMatchups.length || 1);
            if (avgMatchup >= 15) reasoning.push(`${ourNames} has a favorable lead matchup vs ${oppNames} — apply offensive pressure Turn 1.`);
            else if (avgMatchup <= -10) reasoning.push(`${oppNames} pressures your ${ourNames} — consider a safer back-line bring or Protect-heavy Turn 1.`);
            else reasoning.push(`${ourNames} vs ${oppNames} is roughly even — scout with Protect or a pivot Turn 1.`);
        }
    } else {
        const ourLead = ourLineup.leads[0];
        const oppLead = oppLineup.leads[0];
        const m = leadMatchups[0];
        const ourReason = ourLineup.leadReasons?.[0] || '';
        const oppReason = oppLineup.leadReasons?.[0] || '';

        reasoning.push(`Predicted opponent lead: **${oppLead?.species}** — ${oppReason}`);
        reasoning.push(`Recommended your lead: **${ourLead?.species}** — ${ourReason}`);

        if (m) {
            if (m.netScore >= 20) reasoning.push(`${ourLead.species} wins the lead matchup: ${m.offense?.move || 'best move'} does ${m.offense?.maxPercent || '?'}% and ${m.speedTier === 'faster' ? 'outspeeds' : m.speedTier === 'slower' ? 'must survive a hit' : 'speed ties'} ${oppLead.species}.`);
            else if (m.netScore <= -15) reasoning.push(`${oppLead.species} threatens your lead — consider leading a pivot or sack lead, keeping ${ourLead.species} in back.`);
            else if (m.defense && parseFloat(m.defense.maxPercent) >= 75) reasoning.push(`${oppLead.species} can hit ${ourLead.species} for ${m.defense.maxPercent}% with ${m.defense.move} — calculate whether you survive before committing.`);
            else reasoning.push('Lead matchup is close — scout with U-turn/Volt Switch or a safe pivot if unsure of their sets.');
        }
    }

    return {
        ourLeads: ourLineup.leads,
        oppLeads: oppLineup.leads,
        ourLeadReasons: ourLineup.leadReasons || [],
        oppLeadReasons: oppLineup.leadReasons || [],
        reasoning,
        leadMatchups,
        weatherSim,
        weatherNote
    };
}

function renderMovePills(moves, dim = false) {
    const list = (moves || []).filter(Boolean).slice(0, 4);
    if (!list.length) return '<span class="threat-move-pill" style="opacity:0.45">No moves</span>';
    return list.map(m => `<span class="threat-move-pill ${dim ? 'threat-move-pill--dim' : ''}">${escapeAnalysisHtml(m)}</span>`).join('');
}

function renderOpponentRoster() {
    const grid = document.getElementById('opponent-roster-grid');
    if (!grid) return;

    grid.innerHTML = _opponentTeam.map((p, i) => {
        const filled = !!p.species;
        const sprite = filled ? getOpponentSpriteUrl(p.species) : '';
        const db = filled ? getMonDb(p) : null;
        const t1 = (db?.Type_1 || '').toLowerCase();
        const t2 = (db?.Type_2 || '').toLowerCase();
        const buildCount = filled ? getSpeciesBuildList(p.species, _opponentFormat).length : 0;
        const buildBadge = p._buildSource === 'library'
            ? `<span class="opp-slot-badge opp-slot-badge--lib">Build #${p._buildId || '?'}</span>`
            : (filled ? `<span class="opp-slot-badge opp-slot-badge--default">Default set</span>` : '');

        return `
            <div class="opp-slot ${filled ? 'opp-slot--filled' : ''}" data-slot="${i}">
                <button type="button" class="opp-slot-clear" onclick="event.stopPropagation(); clearOpponentSlot(${i})" title="Clear slot" ${filled ? '' : 'style="display:none"'}>×</button>
                <div class="opp-slot-body" onclick="openOpponentSearch(${i})">
                    ${filled
                ? `<img src="${sprite}" alt="${escapeAnalysisHtml(p.species)}" class="opp-slot-sprite" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/${p.species.toLowerCase().replace(/ /g, '-').replace(/\\./g, '')}.png'">`
                : '<div class="opp-slot-empty">+</div>'}
                    <div class="opp-slot-info">
                        <span class="opp-slot-name">${filled ? escapeAnalysisHtml(p.species) : 'Add Pokémon'}</span>
                        <span class="opp-slot-meta">SLOT ${i + 1}</span>
                        ${filled && t1 ? `<div class="opp-slot-types">
                            <img src="${typeIconSrc(t1)}" alt="${t1}" height="14">
                            ${t2 ? `<img src="${typeIconSrc(t2)}" alt="${t2}" height="14">` : ''}
                        </div>` : ''}
                        ${buildBadge}
                    </div>
                </div>
                ${filled && buildCount > 1 ? `<button type="button" class="opp-swap-build-btn" onclick="event.stopPropagation(); openOpponentBuildSwap(${i})" title="Swap build">⇄ Build</button>` : ''}
            </div>`;
    }).join('');
}

function openOpponentSearch(slotIndex) {
    _opponentSearchSlot = slotIndex;
    const overlay = document.getElementById('opponent-search-overlay');
    const input = document.getElementById('opponent-overlay-search');
    if (!overlay || !input) return;
    overlay.style.display = 'flex';
    input.value = '';
    input.focus();
    updateOpponentSearchResults('');
}

function updateOpponentSearchResults(q) {
    const box = document.getElementById('opponent-search-results');
    if (!box || typeof allPokemon === 'undefined') return;
    const requestId = ++_opponentSearchRequestId;
    box.innerHTML = '<p style="opacity:0.4;text-align:center;padding:20px">Loading Champions roster…</p>';

    const renderList = async () => {
        let topList = _opponentTopMetaCache;
        if (!topList && typeof loadTopPokemonsForFormat === 'function') {
            topList = await loadTopPokemonsForFormat(_opponentFormat);
            _opponentTopMetaCache = topList;
        }
        if (requestId !== _opponentSearchRequestId) return;

        const topRank = new Map((topList || []).map((name, i) => [normalizeSpeciesKey(name), i]));
        const teammateRank = buildOpponentTeammateRankMap(_opponentSearchSlot);
        const query = (q || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const selected = new Set(_opponentTeam.map((p, i) => i === _opponentSearchSlot ? '' : normalizeSpeciesKey(p.species)).filter(Boolean));

        let data = allPokemon.filter(pk => {
            const n = pk.Name || '';
            if (pk.inChampions !== true) return false;
            if (n.includes('-Mega') || n.includes('-Primal')) return false;
            const key = normalizeSpeciesKey(n);
            if (selected.has(key)) return false;
            if (!query) return true;
            return key.includes(query) || n.toLowerCase().includes(q.toLowerCase());
        }).map(pk => {
            const key = normalizeSpeciesKey(pk.Name);
            const metaRank = topRank.has(key) ? topRank.get(key) : 999;
            const recCount = teammateRank.get(key) || 0;
            const isRec = recCount > 0;
            let sortRank = Infinity;
            if (isRec) sortRank = -recCount - 10000;
            else if (metaRank < 999) sortRank = metaRank;
            else sortRank = 5000;
            return { pk, sortRank, isRec, isTop: metaRank < 999, metaRank, recCount };
        }).sort((a, b) => {
            if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
            return (a.pk.Name || '').localeCompare(b.pk.Name || '');
        });

        box.innerHTML = '';
        if (!data.length) {
            box.innerHTML = '<p style="opacity:0.4;text-align:center;padding:20px">No Champions-eligible Pokémon match your search.</p>';
            return;
        }

        const appendSection = (title, items) => {
            if (!items.length) return;
            const head = document.createElement('div');
            head.className = 'opp-search-section-head';
            head.textContent = title;
            box.appendChild(head);
            items.forEach(({ pk, isRec, isTop, recCount }) => appendCard(pk, { isRec, isTop, recCount }));
        };

        const appendCard = (pk, opts = {}) => {
            const name = pk.Name;
            const card = document.createElement('div');
            card.className = 'search-card' + (opts.isTop ? ' search-card--top' : '') + (opts.isRec ? ' search-card--synergy' : '');
            const t1 = (pk.Type_1 || '').toLowerCase();
            const t2 = (pk.Type_2 || '').toLowerCase();
            const metaRank = topRank.get(normalizeSpeciesKey(name));
            const spr = getOpponentSpriteUrl(name);
            let badge = '';
            if (opts.isRec) badge = `<span class="opp-search-rank opp-search-rank--synergy">+${opts.recCount} synergy</span>`;
            else if (metaRank != null && metaRank < 999) badge = `<span class="opp-search-rank">#${metaRank + 1} meta</span>`;
            else badge = '<span class="opp-search-rank opp-search-rank--champ">🏆</span>';
            card.innerHTML = `
                <img src="${spr}" style="width:48px;height:48px;object-fit:contain" onerror="this.style.display='none'">
                <div style="font-weight:900;font-size:0.85rem;color:#ffd700">${escapeAnalysisHtml(name)}</div>
                <div>${t1 ? `<img src="${typeIconSrc(t1)}" height="12">` : ''}${t2 ? `<img src="${typeIconSrc(t2)}" height="12">` : ''}</div>
                ${badge}`;
            card.onclick = () => {
                setOpponentSpecies(_opponentSearchSlot, name);
                document.getElementById('opponent-search-overlay').style.display = 'none';
            };
            box.appendChild(card);
        };

        if (!query) {
            appendSection('Synergy picks', data.filter(d => d.isRec).slice(0, 24));
            appendSection(`Top ${escapeAnalysisHtml(_opponentFormat)} Meta`, data.filter(d => d.isTop && !d.isRec).slice(0, 24));
            appendSection('Other Champions Pokémon', data.filter(d => !d.isTop && !d.isRec).slice(0, 40));
        } else {
            data.slice(0, 60).forEach(({ pk, isRec, isTop, recCount }) => appendCard(pk, { isRec, isTop, recCount }));
        }
    };

    renderList();
}

function renderOpponentTeamPreview(oppMons, oppBring) {
    const el = document.getElementById('opponent-team-preview');
    if (!el) return;

    if (!oppMons.length) {
        el.innerHTML = '<p class="opp-empty-note">Add opponent Pokémon above to build their roster.</p>';
        return;
    }

    const broughtSpecies = new Set((oppBring?.mons || []).map(m => m.species));
    const archetype = oppBring?.archetype;

    const sortedMons = [...oppMons].sort((a, b) => {
        const aBring = broughtSpecies.has(a.species) ? 0 : 1;
        const bBring = broughtSpecies.has(b.species) ? 0 : 1;
        if (aBring !== bBring) return aBring - bBring;
        return oppMons.indexOf(a) - oppMons.indexOf(b);
    });

    el.innerHTML = sortedMons.map((p) => {
        const idx = oppMons.indexOf(p);
        const slotIdx = _opponentTeam.indexOf(p);
        const db = getMonDb(p);
        const roles = typeof detectRole === 'function' ? detectRole(p, db) : [];
        const isBring = broughtSpecies.has(p.species);
        const buildCount = getSpeciesBuildList(p.species, _opponentFormat).length;
        const forme = getBattleFormeInfo(p);
        const megaBadge = forme.isMega
            ? `<span class="opp-mega-badge">◆ ${escapeAnalysisHtml(forme.battleLabel)}</span>`
            : '';
        const intTags = typeof getInteractionTagsForMon === 'function'
            ? getInteractionTagsForMon(p, archetype, idx)
            : [];
        const displayRoles = filterDisplayRoles(roles, intTags);
        const intTagHtml = intTags.length
            ? `<div class="opp-preview-int-tags">${intTags.map(t => `<span class="opp-int-tag">${escapeAnalysisHtml(t)}</span>`).join('')}</div>`
            : '';

        return `
            <div class="opp-preview-card ${isBring ? 'opp-preview-card--bring' : 'opp-preview-card--bench'}">
                <img src="${getOpponentSpriteUrl(p.species)}" alt="${escapeAnalysisHtml(p.species)}" class="opp-preview-sprite">
                <div class="opp-preview-body">
                    <div class="opp-preview-head">
                        <span class="opp-preview-name">${escapeAnalysisHtml(p.species)}</span>
                        <span class="opp-preview-tag ${isBring ? 'opp-preview-tag--bring' : 'opp-preview-tag--bench'}">${isBring ? 'LIKELY IN' : 'LIKELY OUT'}</span>
                    </div>
                    ${megaBadge}
                    ${intTagHtml}
                    ${p.item ? `<div class="opp-preview-item-line">@${escapeAnalysisHtml(p.item)} · ${escapeAnalysisHtml(p.nature)}</div>` : `<div class="opp-preview-item-line">${escapeAnalysisHtml(p.nature)}</div>`}
                    <div class="opp-preview-roles">${displayRoles.map(r => `<span class="role-badge">${r}</span>`).join('')}</div>
                    <div class="opp-preview-moves-label">Moves</div>
                    <div class="opp-preview-moves">${renderMovePills(p.moves, !isBring)}</div>
                    <div class="opp-preview-actions">
                        <span class="opp-preview-build">${p._buildSource === 'library' ? `Build #${p._buildId}` : 'Estimated set'}</span>
                        ${buildCount > 0 ? `<button type="button" class="opp-swap-build-btn opp-swap-build-btn--inline" onclick="openOpponentBuildSwap(${slotIdx >= 0 ? slotIdx : 0})">⇄ Swap build${buildCount > 1 ? ` (${buildCount})` : ''}</button>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderBringMonCard(p, highlight) {
    const forme = getBattleFormeInfo(p);
    return `
        <div class="opp-bring-mon ${highlight ? 'opp-bring-mon--highlight' : ''}">
            <img src="${getOpponentSpriteUrl(p.species)}" alt="">
            <div class="opp-bring-mon__info">
                <span class="opp-bring-mon__name">${escapeAnalysisHtml(p.species)}${forme.isMega ? ` <span class="opp-mega-badge opp-mega-badge--sm">◆ Mega</span>` : ''}</span>
                <div class="opp-bring-mon__moves">${renderMovePills(p.moves)}</div>
            </div>
        </div>`;
}

function renderBringPanel(ourBring, oppBring, format) {
    const el = document.getElementById('opp-bring-panel');
    if (!el) return;
    const count = BRING_COUNT[format] || 3;
    const archetype = oppBring.archetype;

    const oppReasoning = (oppBring.reasoning || []).map(r => `<li>${escapeAnalysisHtml(r)}</li>`).join('');
    const ourGaps = (ourBring.matchupGaps || []).filter(g => g.severity === 'critical');
    const ourGapHtml = ourGaps.length ? `
        <ul class="opp-bring-reasoning opp-bring-reasoning--warn">
            ${ourGaps.map(g => `<li><strong>${escapeAnalysisHtml(g.title)}:</strong> ${escapeAnalysisHtml(g.text)}</li>`).join('')}
        </ul>` : '';

    el.innerHTML = `
        ${archetype?.label ? `<div class="opp-archetype-banner"><span class="opp-archetype-label">Detected:</span> ${escapeAnalysisHtml(archetype.label)}</div>` : ''}
        <div class="opp-bring-grid">
            <div class="opp-bring-col opp-bring-col--opp">
                <h4>Opponent predicted bring <span class="opp-bring-count">(${count} of 6)</span></h4>
                <div class="opp-bring-list">${(oppBring.mons || []).map(p => renderBringMonCard(p, true)).join('')}</div>
                ${oppBring.benchMons?.length ? `
                    <h5 class="opp-bench-title">Likely benched — still scout these sets</h5>
                    <div class="opp-bring-list opp-bring-list--bench">${oppBring.benchMons.map(p => renderBringMonCard(p, false)).join('')}</div>` : ''}
                ${oppReasoning ? `<ul class="opp-bring-reasoning">${oppReasoning}</ul>` : ''}
            </div>
            <div class="opp-bring-col opp-bring-col--you">
                <h4>Your recommended bring <span class="opp-bring-count">(${count} of 6)</span></h4>
                <div class="opp-bring-list">${(ourBring.mons || []).map(p => renderBringMonCard(p, true)).join('')}</div>
                ${ourGapHtml}
            </div>
        </div>`;
}

function renderLeadPanel(leadAnalysis, format) {
    const el = document.getElementById('opp-lead-panel');
    if (!el) return;

    const ourLeadHtml = leadAnalysis.ourLeads.map((p, i) => `
        <div class="opp-lead-card opp-lead-card--you">
            <img src="${getOpponentSpriteUrl(p.species)}" alt="">
            <div>
                <span class="opp-lead-name">${escapeAnalysisHtml(p.species)}</span>
                <span class="opp-lead-reason">${escapeAnalysisHtml(leadAnalysis.ourLeadReasons[i] || '')}</span>
            </div>
        </div>`).join('');

    const oppLeadHtml = leadAnalysis.oppLeads.map((p, i) => `
        <div class="opp-lead-card opp-lead-card--opp">
            <img src="${getOpponentSpriteUrl(p.species)}" alt="">
            <div>
                <span class="opp-lead-name">${escapeAnalysisHtml(p.species)}</span>
                <span class="opp-lead-reason">${escapeAnalysisHtml(leadAnalysis.oppLeadReasons[i] || '')}</span>
            </div>
        </div>`).join('');

    const matchupRows = (leadAnalysis.leadMatchups || []).map(m => {
        const off = m.offense;
        const def = m.defense;
        const speedIcon = m.speedTier === 'faster' ? '⚡' : m.speedTier === 'slower' ? '🐢' : '=';
        return `<tr>
            <td>${escapeAnalysisHtml(m.ourLead)}</td>
            <td>vs</td>
            <td>${escapeAnalysisHtml(m.oppLead)}</td>
            <td>${off ? `${off.move} (${off.maxPercent}%)` : '—'} ${speedIcon}</td>
            <td>${def ? `${def.move} → ${def.maxPercent}%` : '—'}</td>
            <td class="opp-match-score ${m.netScore >= 10 ? 'pos' : m.netScore <= -10 ? 'neg' : ''}">${m.netScore > 0 ? '+' : ''}${m.netScore}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
        ${leadAnalysis.weatherNote ? `<p class="opp-lead-weather">${leadAnalysis.weatherNote.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>` : ''}
        <div class="opp-lead-grid">
            <div>
                <h4 class="opp-section-label">Your recommended lead${format === 'Doubles' ? ' pair' : ''}</h4>
                <div class="opp-lead-row">${ourLeadHtml || '<p class="opp-empty-note">—</p>'}</div>
            </div>
            <div>
                <h4 class="opp-section-label">Opponent predicted lead${format === 'Doubles' ? ' pair' : ''}</h4>
                <div class="opp-lead-row">${oppLeadHtml || '<p class="opp-empty-note">—</p>'}</div>
            </div>
        </div>
        <div class="opp-lead-reasoning">
            ${leadAnalysis.reasoning.map(r => `<p>${r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')}
        </div>
        ${matchupRows ? `
        <table class="opp-matchup-table">
            <thead><tr><th>Your lead</th><th></th><th>Their lead</th><th>Your damage</th><th>Their damage</th><th>Score</th></tr></thead>
            <tbody>${matchupRows}</tbody>
        </table>` : ''}`;
}

function renderCounterMatrix(matrix, ourMons, oppMons, format, ourBring) {
    const el = document.getElementById('opp-counter-matrix');
    if (!el) return;

    if (!matrix.length) {
        el.innerHTML = '<p class="opp-empty-note">Add opponent Pokémon to see counter assignments.</p>';
        return;
    }

    el.innerHTML = matrix.map(row => {
        const oppMon = oppMons.find(m => m.species === row.opponent);
        const forme = row.oppForme || getBattleFormeInfo(oppMon || { species: row.opponent });
        const typeImgs = row.oppTypes.map(t =>
            `<img src="${typeIconSrc(t)}" alt="${t}" height="16">`
        ).join('');
        const best = row.bestAnswer;
        const alts = row.altAnswers || [];
        const isBench = row.isBench;
        const vsLabel = forme.isMega ? forme.battleLabel : row.opponent;

        const renderAction = (entry, isPrimary) => {
            if (!entry) return '';
            const speedLabel = entry.speedTier === 'faster' ? '<span class="opp-speed-tag opp-speed-tag--fast">Outspeeds</span>'
                : entry.speedTier === 'slower' ? '<span class="opp-speed-tag opp-speed-tag--slow">Slower — tank or pivot</span>'
                    : '<span class="opp-speed-tag">Speed tie</span>';
            const koText = entry.koLabel ? entry.koLabel.replace('Guaranteed ', '') : '';
            const tags = [];
            if (!entry.inBring) tags.push('<span class="opp-preview-tag opp-preview-tag--bench">NOT IN BRING</span>');
            if (entry.isMirror) tags.push('<span class="opp-preview-tag opp-preview-tag--mirror">MIRROR</span>');
            if (entry.extraMega) tags.push('<span class="opp-preview-tag opp-preview-tag--bench">2ND MEGA</span>');
            return `
                <div class="opp-action ${isPrimary ? 'opp-action--primary' : 'opp-action--alt'}">
                    <div class="opp-action__label">${isPrimary ? 'USE' : 'ALT'}</div>
                    <div class="opp-action__body">
                        <span class="opp-action__mon">${escapeAnalysisHtml(entry.species)}</span>
                        ${tags.join('')}
                        <span class="opp-action__arrow">→</span>
                        <span class="opp-action__move">${escapeAnalysisHtml(entry.move)}</span>
                        <span class="opp-action__dmg">${entry.minPercent}–${entry.maxPercent}%</span>
                        ${koText ? `<span class="opp-action__ko">${escapeAnalysisHtml(koText)}</span>` : ''}
                        ${speedLabel}
                    </div>
                </div>`;
        };

        const threatHtml = row.threats.length
            ? `<div class="opp-watch-box">
                <span class="opp-watch-label">⚠ Watch out</span>
                ${row.threats.slice(0, 2).map(t => `<span class="opp-watch-item">${escapeAnalysisHtml(vsLabel)} hits ${escapeAnalysisHtml(t.species)} with <strong>${escapeAnalysisHtml(t.defenseMove)}</strong> (${t.defensePercent}%)</span>`).join('')}
               </div>`
            : '';

        const mirrorHtml = row.mirrorNote
            ? `<div class="opp-mirror-note"><span class="opp-mirror-note__label">Mirror match</span><p>${row.mirrorNote.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p></div>`
            : '';

        const snap = oppMon ? getSpeedSnapshot(oppMon, format) : null;
        const megaNote = forme.isMega && snap
            ? `<p class="opp-mega-calc-note">Calc uses <strong>${escapeAnalysisHtml(forme.battleLabel)}</strong> (${escapeAnalysisHtml(forme.item)}) — ${snap.baseSpeed ?? '?'} Spe base → ${snap.battleSpeed ?? '?'} Spe Mega.</p>`
            : '';

        return `
            <div class="opp-action-card ${isBench ? 'opp-action-card--bench' : ''}">
                <div class="opp-action-card__head">
                    <img src="${getOpponentSpriteUrl(row.opponent)}" alt="" class="opp-action-card__sprite">
                    <div>
                        <div class="opp-action-card__title">
                            <span>vs ${escapeAnalysisHtml(vsLabel)}</span>
                            ${typeImgs}
                            ${forme.isMega ? '<span class="opp-mega-badge opp-mega-badge--sm">MEGA</span>' : ''}
                            ${isBench ? '<span class="opp-preview-tag opp-preview-tag--bench">BENCH</span>' : '<span class="opp-preview-tag opp-preview-tag--bring">BRING</span>'}
                        </div>
                        <div class="opp-action-card__moves">${renderMovePills(oppMon?.moves, isBench)}</div>
                        ${megaNote}
                    </div>
                </div>
                <div class="opp-action-card__answers">
                    ${best ? renderAction(best, true) : '<div class="opp-action opp-action--gap">No bring-slot check — adjust team or coverage</div>'}
                    ${alts.map(a => renderAction(a, false)).join('')}
                </div>
                ${mirrorHtml}
                ${threatHtml}
            </div>`;
    }).join('');
}

function renderMatchupSummary(ourTeam, oppMons, matrix, format, ourBring) {
    const el = document.getElementById('opp-matchup-summary');
    if (!el) return;

    const bringMatrix = matrix.filter(r => !r.isBench);
    const covered = bringMatrix.filter(r => r.bestAnswer && r.bestAnswer.inBring).length;
    const total = bringMatrix.length;
    const gaps = bringMatrix.filter(r => !r.bestAnswer || !r.bestAnswer.inBring).map(r => r.opponent);
    const bringCount = BRING_COUNT[format] || 3;
    const megaCount = (ourBring?.mons || []).filter(isMegaCapable).length;

    let grade = 'B';
    if (covered === total && total > 0) grade = 'A';
    else if (covered >= total * 0.7) grade = 'B+';
    else if (covered < total * 0.4) grade = 'C';

    el.innerHTML = `
        <div class="opp-summary-grade">${grade}</div>
        <div class="opp-summary-stats">
            <div><span class="opp-summary-num">${covered}/${total}</span><span class="opp-summary-lbl">Bring threats answered</span></div>
            <div><span class="opp-summary-num">${bringCount}</span><span class="opp-summary-lbl">Mons to bring (${format})</span></div>
            <div><span class="opp-summary-num">${megaCount}</span><span class="opp-summary-lbl">Mega slot${megaCount !== 1 ? 's' : ''} in bring</span></div>
        </div>
        ${gaps.length ? `<p class="opp-summary-gap"><strong>Coverage gaps:</strong> ${gaps.map(g => escapeAnalysisHtml(g)).join(', ')} — no OHKO/check from your <em>bring</em> slot. Roster-only answers are listed as ALT.</p>` : '<p class="opp-summary-ok">All predicted opponent brings have a calc-confirmed answer from your recommended bring.</p>'}`;
}

function runOpponentPrepAnalysis() {
    const gate = document.getElementById('opponent-prep-gate');
    const results = document.getElementById('opponent-prep-results');
    const ourTeam = _ourTeamGetter ? _ourTeamGetter() : [];
    const ourActive = ourTeam.filter(p => p && p.species);
    const oppActive = getActiveOpponentMons();
    const format = _opponentFormat;
    const bringCount = BRING_COUNT[format] || 3;

    renderOpponentRoster();

    const teamFull = ourActive.length >= 6;
    if (gate) gate.style.display = teamFull ? 'none' : 'block';
    if (!teamFull) {
        if (results) results.style.display = 'none';
        return;
    }

    if (results) results.style.display = oppActive.length ? 'block' : 'none';

    if (!oppActive.length) return;

    const oppBring = predictOpponentBringSet(oppActive, format, ourActive);
    const ourBring = pickBestBringCombination(ourActive, format, bringCount);
    const weatherSim = typeof simulateTurn1Weather === 'function'
        ? simulateTurn1Weather(ourBring.mons, oppBring.mons, format)
        : null;
    const matchupField = buildMatchupField(format, weatherSim);
    const matrix = buildCounterMatrix(ourActive, oppActive, format, oppBring, ourBring, matchupField);
    const leadAnalysis = analyzeLeadRecommendation(ourBring.mons, oppBring.mons, format, oppBring.archetype);
    const interactionWarnings = typeof buildInteractionWarnings === 'function'
        ? buildInteractionWarnings(ourActive, oppActive, oppBring) : [];
    const interactionPlays = typeof buildInteractionPlaybook === 'function'
        ? buildInteractionPlaybook(ourActive, oppActive, oppBring, oppBring.ourThreats, oppBring.oppProfile, ourBring.mons, format) : [];
    const matchupGaps = typeof analyzeMatchupGaps === 'function'
        ? analyzeMatchupGaps(ourActive, ourBring.mons, oppActive, oppBring, format)
        : (ourBring.matchupGaps || []);
    const battlePlan = buildDetailedBattlePlan({
        format, ourBring, oppBring, ourTeam: ourActive, oppTeam: oppActive,
        leadAnalysis, matrix, oppBringMeta: oppBring.archetype,
        interactionWarnings, interactionPlays, matchupGaps
    });
    const speedChart = buildSpeedChart(ourActive, oppActive, format);
    const megaIntel = buildMegaIntel(ourActive, oppActive);

    renderOpponentTeamPreview(oppActive, oppBring);
    renderBringPanel(ourBring, oppBring, format);
    renderLeadPanel(leadAnalysis, format);
    renderBattleIntelPanel(battlePlan, speedChart, megaIntel, format, interactionWarnings, interactionPlays, matchupGaps);
    renderCounterMatrix(matrix, ourActive, oppActive, format, ourBring);
    renderMatchupSummary(ourActive, oppActive, matrix, format, ourBring);
}

function showOpponentPrepView() {
    const format = typeof _teamAnalysisFormat !== 'undefined' ? _teamAnalysisFormat : 'Singles';
    setOpponentPrepFormatQuiet(format);
    renderOpponentRoster();
    const results = document.getElementById('opponent-prep-results');
    const gate = document.getElementById('opponent-prep-gate');
    const ourTeam = _ourTeamGetter ? _ourTeamGetter() : [];
    const ourActive = ourTeam.filter(p => p && p.species);
    const teamFull = ourActive.length >= 6;
    if (gate) gate.style.display = teamFull ? 'none' : 'block';
    if (!teamFull) {
        if (results) results.style.display = 'none';
        return;
    }
    if (results) {
        results.style.display = 'block';
        const existing = results.querySelector('.opp-prep-loading');
        if (!existing) {
            const loading = document.createElement('div');
            loading.className = 'opp-prep-loading';
            loading.style.cssText = 'padding:16px;text-align:center;color:rgba(255,255,255,0.7);font-weight:700;font-size:0.85rem;';
            loading.textContent = 'Analyzing matchup…';
            results.insertBefore(loading, results.firstChild);
        }
    }
    // Defer heavy calc so roster + loading UI paint first
    requestAnimationFrame(() => {
        setTimeout(() => {
            runOpponentPrepAnalysis();
            results?.querySelector('.opp-prep-loading')?.remove();
        }, 0);
    });
}

function setOpponentPrepFormatQuiet(format) {
    _opponentFormat = format || 'Singles';
    _opponentTopMetaCache = null;
    updateOpponentFormatToggle(_opponentFormat);
    if (typeof _teamAnalysisFormat !== 'undefined') {
        _teamAnalysisFormat = _opponentFormat;
    }
    if (typeof updateAnalysisFormatToggle === 'function') {
        updateAnalysisFormatToggle(_opponentFormat, 'analysis-toggle-singles', 'analysis-toggle-doubles');
    }
}

function clearOpponentTeam() {
    _opponentTeam = Array(6).fill(null).map(createEmptyOpponentSlot);
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

/**
 * Load a full opponent roster from library build IDs (best_teams.json).
 * Missing builds leave an empty slot.
 * @param {string[]} buildIds
 * @param {string} [format]
 * @param {{ skipAnalysis?: boolean }} [opts] - skipAnalysis: defer prep calc to the caller
 */
function loadOpponentTeamFromBuildIds(buildIds, format, opts = {}) {
    const buildsArr = (typeof allBuilds !== 'undefined') ? allBuilds : [];
    const ids = Array.isArray(buildIds) ? buildIds.slice(0, 6) : [];
    if (format) {
        // Update format UI without re-running analysis mid-load
        _opponentFormat = format || 'Singles';
        _opponentTopMetaCache = null;
        updateOpponentFormatToggle(_opponentFormat);
        if (typeof _teamAnalysisFormat !== 'undefined') {
            _teamAnalysisFormat = _opponentFormat;
        }
        if (typeof updateAnalysisFormatToggle === 'function') {
            updateAnalysisFormatToggle(_opponentFormat, 'analysis-toggle-singles', 'analysis-toggle-doubles');
        }
    }

    const byId = typeof buildsArr.find === 'function' && buildsArr.length
        ? (() => {
            const map = new Map();
            buildsArr.forEach(b => map.set(String(b.id), b));
            return map;
        })()
        : null;

    _opponentTeam = Array(6).fill(null).map(createEmptyOpponentSlot);
    ids.forEach((id, idx) => {
        const record = byId ? byId.get(String(id)) : buildsArr.find(b => String(b.id) === String(id));
        if (!record || typeof parseAnalysisBuild !== 'function') return;
        const slot = parseAnalysisBuild(record.build);
        slot._buildSource = 'library';
        slot._buildId = record.id;
        _opponentTeam[idx] = slot;
    });

    renderOpponentRoster();
    if (!opts.skipAnalysis) {
        runOpponentPrepAnalysis();
    }
    return _opponentTeam.filter(p => p && p.species).length;
}

if (typeof globalThis !== 'undefined') {
    globalThis.registerOpponentPrep = registerOpponentPrep;
    globalThis.setOpponentPrepFormat = setOpponentPrepFormat;
    globalThis.showOpponentPrepView = showOpponentPrepView;
    globalThis.openOpponentSearch = openOpponentSearch;
    globalThis.clearOpponentSlot = clearOpponentSlot;
    globalThis.clearOpponentTeam = clearOpponentTeam;
    globalThis.loadOpponentTeamFromBuildIds = loadOpponentTeamFromBuildIds;
    globalThis.setOpponentSpecies = setOpponentSpecies;
    globalThis.openOpponentBuildSwap = openOpponentBuildSwap;
    globalThis.applyOpponentBuildRecord = applyOpponentBuildRecord;
    globalThis.updateOpponentSearchResults = updateOpponentSearchResults;
}
