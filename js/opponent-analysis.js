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
            ? { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }
            : { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };
    } else if (hp + def + spd >= 240) {
        slot.nature = def >= spd ? 'Impish' : 'Careful';
        slot.evs = def >= spd
            ? { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 }
            : { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 };
    } else {
        slot.nature = atk >= spa ? 'Adamant' : 'Modest';
        slot.evs = atk >= spa
            ? { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
            : { hp: 252, atk: 0, def: 4, spa: 252, spd: 0, spe: 0 };
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

function predictBringSet(mons, format, isOpponent) {
    const bringCount = BRING_COUNT[format] || 3;
    if (mons.length <= bringCount) {
        return { indices: mons.map((_, i) => i), mons: [...mons], scores: mons.map(m => scoreMonThreatLevel(m, format)) };
    }

    const indices = mons.map((_, i) => i);

    if (isOpponent) {
        const scored = indices.map(i => ({ i, score: scoreMonThreatLevel(mons[i], format) }));
        scored.sort((a, b) => b.score - a.score);
        const picked = scored.slice(0, bringCount).map(s => s.i);
        return {
            indices: picked,
            mons: picked.map(i => mons[i]),
            scores: picked.map(i => scoreMonThreatLevel(mons[i], format))
        };
    }

    return pickBestBringCombination(mons, format, bringCount);
}

function pickBestBringCombination(ourMons, format, bringCount) {
    const oppMons = getActiveOpponentMons();
    const oppBring = predictBringSet(oppMons, format, true);
    const indices = ourMons.map((_, i) => i);
    const combos = combinations(indices, bringCount);

    let best = { indices: indices.slice(0, bringCount), score: -Infinity };

    combos.forEach(combo => {
        let score = 0;
        const bring = combo.map(i => ourMons[i]);
        oppBring.mons.forEach(opp => {
            let bestVs = -Infinity;
            bring.forEach(our => {
                const m = computeMatchupPair(our, opp, format);
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

        const typeSet = new Set();
        bring.forEach(m => {
            const db = getMonDb(m);
            [db?.Type_1, db?.Type_2].filter(Boolean).forEach(t => typeSet.add(t));
        });
        score += typeSet.size * 2;

        if (score > best.score) best = { indices: combo, score };
    });

    return {
        indices: best.indices,
        mons: best.indices.map(i => ourMons[i]),
        scores: best.indices.map(i => scoreMonThreatLevel(ourMons[i], format))
    };
}

function computeMatchupPair(ourMon, oppMon, format) {
    const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
    const field = typeof getDefaultField === 'function' ? getDefaultField(format) : null;
    const hasCalc = typeof buildCalcStateFromSlot === 'function'
        && typeof findBestDamage === 'function'
        && field && movesDb.length;

    let ourDb = null;
    let oppDb = null;
    if (typeof getEffectivePokemonData !== 'undefined' && typeof allPokemon !== 'undefined') {
        ourDb = getEffectivePokemonData(ourMon, allPokemon);
        oppDb = getEffectivePokemonData(oppMon, allPokemon);
    }

    const ourTypes = [ourDb?.Type_1, ourDb?.Type_2].filter(Boolean);
    const oppTypes = [oppDb?.Type_1, oppDb?.Type_2].filter(Boolean);

    let offense = null;
    let defense = null;
    let ourSpeed = null;
    let oppSpeed = null;
    let speedTier = 'tie';
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
        ourSpeed, oppSpeed, speedTier,
        netScore, checkLabel,
        ourTypes, oppTypes
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

function buildCounterMatrix(ourMons, oppMons, format) {
    const matrix = [];
    oppMons.forEach(opp => {
        const row = {
            opponent: opp.species,
            oppTypes: [getMonDb(opp)?.Type_1, getMonDb(opp)?.Type_2].filter(Boolean),
            counters: [],
            checks: [],
            threats: []
        };

        ourMons.forEach(our => {
            const m = computeMatchupPair(our, opp, format);
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
                checkLabel: m.checkLabel
            };

            if (m.netScore >= 20) row.counters.push(entry);
            else if (m.netScore >= 5) row.checks.push(entry);
            if (m.defense && parseFloat(m.defense.maxPercent) >= 75) row.threats.push(entry);
        });

        row.counters.sort((a, b) => b.netScore - a.netScore);
        row.checks.sort((a, b) => b.netScore - a.netScore);
        matrix.push(row);
    });
    return matrix;
}

function analyzeLeadRecommendation(ourBring, oppBring, format) {
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

    const oppLineup = typeof predictLineup === 'function'
        ? predictLineup(oppBring, oppRoles, format, oppCtx)
        : { leads: oppBring.slice(0, format === 'Doubles' ? 2 : 1), leadReasons: [] };

    const ourLineup = typeof predictLineup === 'function'
        ? predictLineup(ourBring, ourRoles, format, ourCtx)
        : { leads: ourBring.slice(0, format === 'Doubles' ? 2 : 1), leadReasons: [] };

    const leadMatchups = [];
    const reasoning = [];

    ourLineup.leads.forEach((ourLead, li) => {
        oppLineup.leads.forEach((oppLead, oi) => {
            const m = computeMatchupPair(ourLead, oppLead, format);
            leadMatchups.push({
                ourLead: ourLead.species,
                oppLead: oppLead.species,
                offense: m.offense,
                defense: m.defense,
                speedTier: m.speedTier,
                netScore: m.netScore,
                ourReason: ourLineup.leadReasons?.[li] || '',
                oppReason: oppLineup.leadReasons?.[oi] || ''
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
        leadMatchups
    };
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
        const buildBadge = p._buildSource === 'library'
            ? `<span class="opp-slot-badge opp-slot-badge--lib">Build #${p._buildId || '?'}</span>`
            : (filled ? `<span class="opp-slot-badge opp-slot-badge--default">Default set</span>` : '');

        return `
            <div class="opp-slot ${filled ? 'opp-slot--filled' : ''}" data-slot="${i}">
                <button type="button" class="opp-slot-clear" onclick="clearOpponentSlot(${i})" title="Clear slot" ${filled ? '' : 'style="display:none"'}>×</button>
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
    box.innerHTML = '';
    const query = (q || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const selected = new Set(_opponentTeam.map((p, i) => i === _opponentSearchSlot ? '' : normalizeSpeciesKey(p.species)).filter(Boolean));

    let data = allPokemon.filter(pk => {
        const n = pk.Name || '';
        if (n.includes('-Mega') || n.includes('-Primal')) return false;
        const key = normalizeSpeciesKey(n);
        if (selected.has(key)) return false;
        if (!query) return true;
        return key.includes(query) || n.toLowerCase().includes(q.toLowerCase());
    }).slice(0, 80);

    data.forEach(pk => {
        const name = pk.Name;
        const card = document.createElement('div');
        card.className = 'search-card';
        const t1 = (pk.Type_1 || '').toLowerCase();
        const t2 = (pk.Type_2 || '').toLowerCase();
        const spr = getOpponentSpriteUrl(name);
        card.innerHTML = `
            <img src="${spr}" style="width:48px;height:48px;object-fit:contain" onerror="this.style.display='none'">
            <div style="font-weight:900;font-size:0.85rem">${escapeAnalysisHtml(name)}</div>
            <div>${t1 ? `<img src="${typeIconSrc(t1)}" height="12">` : ''}${t2 ? `<img src="${typeIconSrc(t2)}" height="12">` : ''}</div>`;
        card.onclick = () => {
            setOpponentSpecies(_opponentSearchSlot, name);
            document.getElementById('opponent-search-overlay').style.display = 'none';
        };
        box.appendChild(card);
    });

    if (!data.length) {
        box.innerHTML = '<p style="opacity:0.4;text-align:center;padding:20px">No Pokémon found.</p>';
    }
}

function renderOpponentTeamPreview(oppMons) {
    const el = document.getElementById('opponent-team-preview');
    if (!el) return;

    if (!oppMons.length) {
        el.innerHTML = '<p class="opp-empty-note">Add opponent Pokémon above to build their roster.</p>';
        return;
    }

    el.innerHTML = oppMons.map(p => {
        const db = getMonDb(p);
        const roles = typeof detectRole === 'function' ? detectRole(p, db) : [];
        const moves = (p.moves || []).filter(Boolean).slice(0, 4);
        const movesHtml = moves.length
            ? moves.map(m => `<span class="threat-move-pill">${escapeAnalysisHtml(m)}</span>`).join('')
            : '<span class="threat-move-pill" style="opacity:0.5">No moves in build</span>';

        return `
            <div class="opp-preview-card">
                <img src="${getOpponentSpriteUrl(p.species)}" alt="${escapeAnalysisHtml(p.species)}" class="opp-preview-sprite">
                <div class="opp-preview-body">
                    <div class="opp-preview-head">
                        <span class="opp-preview-name">${escapeAnalysisHtml(p.species)}</span>
                        ${p.item ? `<span class="opp-preview-item">${escapeAnalysisHtml(p.item)}</span>` : ''}
                    </div>
                    <div class="opp-preview-roles">${roles.slice(0, 2).map(r => `<span class="role-badge">${r}</span>`).join('')}</div>
                    <div class="opp-preview-moves">${movesHtml}</div>
                    <div class="opp-preview-stats">
                        <span>${p.nature}</span>
                        ${p._buildSource === 'library' ? `<span>Build #${p._buildId}</span>` : '<span>Estimated set</span>'}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderBringPanel(ourBring, oppBring, format) {
    const el = document.getElementById('opp-bring-panel');
    if (!el) return;
    const count = BRING_COUNT[format] || 3;

    const renderMonList = (mons, label, cls) => `
        <div class="opp-bring-col ${cls}">
            <h4>${label} <span class="opp-bring-count">(${count} of 6)</span></h4>
            <div class="opp-bring-list">
                ${mons.map(p => `
                    <div class="opp-bring-mon">
                        <img src="${getOpponentSpriteUrl(p.species)}" alt="">
                        <span>${escapeAnalysisHtml(p.species)}</span>
                    </div>`).join('')}
            </div>
        </div>`;

    el.innerHTML = `
        <div class="opp-bring-grid">
            ${renderMonList(oppBring.mons, 'Opponent predicted bring', 'opp-bring-col--opp')}
            ${renderMonList(ourBring.mons, 'Your recommended bring', 'opp-bring-col--you')}
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

function renderCounterMatrix(matrix) {
    const el = document.getElementById('opp-counter-matrix');
    if (!el) return;

    if (!matrix.length) {
        el.innerHTML = '<p class="opp-empty-note">Add opponent Pokémon to see counter assignments.</p>';
        return;
    }

    el.innerHTML = matrix.map(row => {
        const typeImgs = row.oppTypes.map(t =>
            `<img src="${typeIconSrc(t)}" alt="${t}" height="16">`
        ).join('');

        const renderEntries = (entries, kind) => entries.map(e => {
            const speedTag = e.speedTier === 'faster' ? ' ⚡' : e.speedTier === 'slower' ? ' 🐢' : '';
            const ko = e.koLabel ? ` · ${e.koLabel.replace('Guaranteed ', '')}` : '';
            return `<span class="matchup-chip ${kind}" title="Offense: ${e.move} ${e.minPercent}–${e.maxPercent}% | Defense taken: ${e.defenseMove} ${e.defensePercent}%">
                ${escapeAnalysisHtml(e.species)}: ${escapeAnalysisHtml(e.move)} (${e.maxPercent}%)${speedTag}${ko}
                <span class="opp-check-tag">${e.checkLabel}</span>
            </span>`;
        }).join('');

        return `
            <div class="opp-counter-row">
                <div class="opp-counter-head">
                    <span class="opp-counter-name">${escapeAnalysisHtml(row.opponent)}</span>
                    ${typeImgs}
                </div>
                <div class="opp-counter-section">
                    <span class="opp-counter-label">Hard counters / checks</span>
                    <div class="opp-counter-chips">${renderEntries([...row.counters, ...row.checks].slice(0, 6), 'check') || '<span class="matchup-chip gap">No reliable check — consider tech or team change</span>'}</div>
                </div>
                <div class="opp-counter-section">
                    <span class="opp-counter-label">They threaten your answers</span>
                    <div class="opp-counter-chips">${renderEntries(row.threats.slice(0, 4), 'threat') || '<span style="opacity:0.4;font-size:0.7rem">Low offensive pressure on your counters</span>'}</div>
                </div>
            </div>`;
    }).join('');
}

function renderMatchupSummary(ourTeam, oppMons, matrix, format) {
    const el = document.getElementById('opp-matchup-summary');
    if (!el) return;

    const covered = matrix.filter(r => r.counters.length > 0).length;
    const total = matrix.length;
    const gaps = matrix.filter(r => r.counters.length === 0 && r.checks.length === 0).map(r => r.opponent);
    const bringCount = BRING_COUNT[format] || 3;

    let grade = 'B';
    if (covered === total && total > 0) grade = 'A';
    else if (covered >= total * 0.7) grade = 'B+';
    else if (covered < total * 0.4) grade = 'C';

    el.innerHTML = `
        <div class="opp-summary-grade">${grade}</div>
        <div class="opp-summary-stats">
            <div><span class="opp-summary-num">${covered}/${total}</span><span class="opp-summary-lbl">Threats covered</span></div>
            <div><span class="opp-summary-num">${bringCount}</span><span class="opp-summary-lbl">Mons to bring (${format})</span></div>
            <div><span class="opp-summary-num">${ourTeam.filter(p => p.species).length}</span><span class="opp-summary-lbl">Your roster</span></div>
        </div>
        ${gaps.length ? `<p class="opp-summary-gap"><strong>Coverage gaps:</strong> ${gaps.map(g => escapeAnalysisHtml(g)).join(', ')} — these lack a calc-confirmed check in your current roster.</p>` : '<p class="opp-summary-ok">All entered opponent threats have at least one calc-based check on your team.</p>'}`;
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
    renderOpponentTeamPreview(oppActive);

    if (!oppActive.length) return;

    const oppBring = predictBringSet(oppActive, format, true);
    const ourBring = pickBestBringCombination(ourActive, format, bringCount);
    const matrix = buildCounterMatrix(ourActive, oppActive, format);
    const leadAnalysis = analyzeLeadRecommendation(ourBring.mons, oppBring.mons, format);

    renderBringPanel(ourBring, oppBring, format);
    renderLeadPanel(leadAnalysis, format);
    renderCounterMatrix(matrix);
    renderMatchupSummary(ourActive, oppActive, matrix, format);
}

function showOpponentPrepView() {
    const format = typeof _teamAnalysisFormat !== 'undefined' ? _teamAnalysisFormat : 'Singles';
    setOpponentPrepFormat(format);
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

function clearOpponentTeam() {
    _opponentTeam = Array(6).fill(null).map(createEmptyOpponentSlot);
    renderOpponentRoster();
    runOpponentPrepAnalysis();
}

if (typeof globalThis !== 'undefined') {
    globalThis.registerOpponentPrep = registerOpponentPrep;
    globalThis.setOpponentPrepFormat = setOpponentPrepFormat;
    globalThis.showOpponentPrepView = showOpponentPrepView;
    globalThis.openOpponentSearch = openOpponentSearch;
    globalThis.clearOpponentSlot = clearOpponentSlot;
    globalThis.clearOpponentTeam = clearOpponentTeam;
    globalThis.setOpponentSpecies = setOpponentSpecies;
    globalThis.updateOpponentSearchResults = updateOpponentSearchResults;
}
