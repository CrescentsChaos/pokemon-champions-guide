/**
 * Smogon-style dynamic build narrative composer.
 * Requires analysis.js globals (detectRole, getMonDb, linkMon, etc.)
 */
(function (global) {
    const BN = {};

    function esc(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /** Oxford-comma list join — avoids "A and B and C and D" grammar errors. */
    function joinList(items, formatter) {
        const fmt = formatter || (x => x);
        const list = (items || []).filter(Boolean).map(fmt);
        if (list.length === 0) return '';
        if (list.length === 1) return list[0];
        if (list.length === 2) return list[0] + ' and ' + list[1];
        return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
    }

    function getMetaTargetNames(format) {
        const fmt = format || 'Singles';
        const cache = (typeof global !== 'undefined' && global._topPokemonsCache) ? global._topPokemonsCache : null;
        if (!cache) return [];
        const list = cache[fmt] || cache.Singles || [];
        return list.slice(0, 12);
    }

    function resolveTargetDb(speciesName) {
        const key = normKey(speciesName);
        if (typeof getEffectivePokemonData === 'function' && typeof allPokemon !== 'undefined') {
            return getEffectivePokemonData({ species: speciesName, item: '' }, allPokemon)
                || allPokemon.find(p => normKey(p.Name || p.name) === key);
        }
        if (typeof allPokemon !== 'undefined') {
            return allPokemon.find(p => normKey(p.Name || p.name) === key);
        }
        return null;
    }

    function buildDefenderSlotFromMeta(speciesName, format) {
        const builds = (typeof allBuilds !== 'undefined') ? allBuilds : [];
        if (typeof findLatestBuildForSpecies === 'function') {
            const latest = findLatestBuildForSpecies(speciesName, format, builds);
            if (latest && typeof parseAnalysisBuild === 'function') {
                return parseAnalysisBuild(latest.build);
            }
        }
        return {
            species: speciesName,
            item: '',
            ability: '',
            level: 50,
            tera: 'Normal',
            evs: { hp: 32, def: 2, spd: 32, atk: 0, spa: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            nature: 'Bold',
            moves: ['Protect']
        };
    }

    function link(name) {
        if (typeof linkMon === 'function') return linkMon(name);
        return `<span class="build-prose-link">${esc(name)}</span>`;
    }

    function normKey(s) {
        return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function getMoveRef(name) {
        const key = normKey(name);
        if (typeof movesMap !== 'undefined' && movesMap[key]) return movesMap[key];
        if (typeof allMoves !== 'undefined') {
            return allMoves.find(m => normKey(m.name) === key) || null;
        }
        return null;
    }

    function getAbilityRef(name) {
        const key = normKey(name);
        if (typeof abilitiesMap !== 'undefined' && abilitiesMap[key]) return abilitiesMap[key];
        if (typeof allAbilities !== 'undefined') {
            return allAbilities.find(a => normKey(a.name) === key) || null;
        }
        return null;
    }

    function getMonTypes(db, mon) {
        if (db?.Type_1) return [db.Type_1, db.Type_2].filter(t => t && t !== 'None');
        if (mon?.tera && mon.tera !== 'Normal') return [mon.tera];
        return [];
    }

    function getBattleTypes(db, mon) {
        if (mon?.tera && mon.tera !== 'Normal') return [mon.tera];
        return [db?.Type_1, db?.Type_2].filter(t => t && t !== 'None');
    }

    function formatEvSpread(evs) {
        if (typeof window.formatEvLine === 'function') return window.formatEvLine(evs);
        if (typeof globalThis.formatEvLine === 'function') return globalThis.formatEvLine(evs);
        const labels = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
        const parts = Object.entries(evs || {})
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${v} ${labels[k] || k}`);
        return parts.join(' / ') || 'No EVs listed';
    }

    function evIntent(evs, roles) {
        const e = evs || {};
        const intents = [];
        const max = Math.max(...Object.values(e), 0);
        const invested = Object.entries(e).filter(([, v]) => v >= Math.max(32, max * 0.5) && v > 0);

        invested.forEach(([stat, val]) => {
            if (stat === 'hp') intents.push(val >= 200 ? 'maximum bulk' : 'moderate HP investment for survivability');
            else if (stat === 'atk') intents.push('physical offense');
            else if (stat === 'spa') intents.push('special offense');
            else if (stat === 'def') intents.push('physical bulk');
            else if (stat === 'spd') intents.push('special bulk');
            else if (stat === 'spe') intents.push('Speed control');
        });

        if (roles.includes('Trick Room Abuser') && (e.spe || 0) === 0) intents.push('minimum Speed for Trick Room');
        if (roles.includes('Physical Wall') || roles.includes('Special Wall')) intents.push('defensive pivoting');
        return [...new Set(intents)];
    }

    function natureAnalysis(nature, evs) {
        const n = (nature || 'Serious').toLowerCase();
        const notes = [];
        if (n.includes('jolly') || n.includes('timid') || n.includes('hasty') || n.includes('naive')) notes.push('boosts Speed at the cost of an attacking stat');
        if (n.includes('adamant') || n.includes('modest')) notes.push('maximizes raw damage output');
        if (n.includes('bold') || n.includes('calm')) notes.push('favors bulk over offense');
        if (n.includes('quiet') || n.includes('brave') || n.includes('sassy') || n.includes('relaxed')) notes.push('reduces Speed — often paired with Trick Room or underspeeding specific threats');
        if (notes.length === 0) notes.push('neutral nature leaves stats unmodified');
        return notes.join('; ');
    }

    function speedTierNote(speed, format) {
        if (speed == null) return '';
        if (speed >= 140) return `At ${speed} Speed, this spread sits in the fastest unboosted tier — it outspeeds most of the ${format} meta before Tailwind or weather abilities come online.`;
        if (speed >= 110) return `At ${speed} Speed, it competes with common ${format} benchmarks (roughly base 100–110 Scarfers and sweepers) and often requires Tailwind or a Choice Scarf to win speed ties that matter.`;
        if (speed >= 85) return `At ${speed} Speed, this is a mid-speed spread: fast enough to pressure slower walls but vulnerable to common 100+ base threats and priority.`;
        if (speed >= 55) return `At ${speed} Speed, it underspeeds most offensive meta — plan around Trick Room, Tailwind, or pivoting rather than raw turn order.`;
        return `At ${speed} Speed, this is a slow spread built for Trick Room or bulk-first positioning rather than outspeeding standard ${format} threats.`;
    }

    function describeMoveSlot(moveName, mon, db, format) {
        if (!moveName) return '';
        const ref = getMoveRef(moveName);
        const types = getBattleTypes(db, mon);
        let moveType = ref?.type || 'Normal';
        if (typeof BattleCalc !== 'undefined' && typeof BattleCalc.resolveMoveType === 'function') {
            try {
                const resolved = BattleCalc.resolveMoveType(
                    { ability: mon?.ability || '', tera: !!mon?.tera, teraType: mon?.tera || null },
                    { name: moveName, type: moveType, basePower: ref?.power || 0 },
                    ref,
                    (mon?.item || '').toLowerCase(),
                    { weather: 'None' }
                );
                if (resolved?.moveType) moveType = resolved.moveType;
            } catch (e) { /* keep base type */ }
        }
        const category = ref?.damage_class || ref?.category || 'Physical';
        const power = ref?.power;
        const isStab = types.some(t => t && t.toLowerCase() === (moveType || '').toLowerCase());
        const tags = ref?.tags || [];
        const tagKey = t => (t || '').toLowerCase().replace(/[^a-z0-9&]+/g, '');
        const hasMoveTag = (...needles) => tags.some(t => needles.some(n => tagKey(t) === tagKey(n)));
        const parts = [];

        let role = isStab ? 'STAB' : 'coverage';
        if (power === 0 || category === 'Status') role = 'utility';
        if (hasMoveTag('All Pokemon', 'All Opponents')) role = 'spread damage';
        if ((ref?.priority || 0) > 0) role = 'priority';

        const desc = ref?.short_descripton || ref?.short_description || '';
        parts.push(`<strong>${esc(moveName)}</strong> (${moveType}${power ? `, ${power} BP` : ''}, ${category.toLowerCase()}) functions as ${role}.`);

        if (desc) parts.push(desc.charAt(0).toUpperCase() + desc.slice(1) + (desc.endsWith('.') ? '' : '.'));

        const moveKey = normKey(moveName);
        if (moveKey === 'protect' || moveKey === 'detect') {
            parts.push(`In ${format}, Protect scouts double-targets, blocks Fake Out, and buys a turn for partners to set Tailwind, Trick Room, or screens.`);
        } else if (moveKey === 'fakeout') {
            parts.push('Fake Out flinches the fastest opposing threat — pair with a spread attacker or setup move to capitalize on the free turn.');
        } else if (moveKey === 'tailwind') {
            parts.push('Tailwind doubles team Speed for four turns; commit before opposing speed control flips the game.');
        } else if (moveKey === 'trickroom') {
            parts.push('Trick Room reverses turn order — lead with a bulky partner that can absorb hits while TR goes up.');
        } else if (moveKey === 'uturn' || moveKey === 'voltswitch' || moveKey === 'flipturn') {
            parts.push('Pivoting preserves momentum and brings in a better matchup while chipping the opponent.');
        } else if (moveKey === 'helpinghand') {
            parts.push('Helping Hand boosts an ally\'s damage — essential for securing OHKOs on bulky targets in doubles.');
        } else if (moveKey === 'followme' || moveKey === 'ragepowder') {
            parts.push('Redirection draws both attacks away from your sweeper or restricted Pokémon.');
        } else if (moveKey === 'partingshot') {
            parts.push('Parting Shot drops the opponent\'s offenses and pivots safely into a teammate.');
        } else if (isStab && category !== 'Status') {
            parts.push(`Primary ${category.toLowerCase()} pressure — lean on this when type matchups favor ${types.join('/')}.`);
        } else if (!isStab && category !== 'Status') {
            parts.push(`Coverage for types ${types.join('/')} cannot hit super effectively.`);
        }

        return parts.join(' ');
    }

    function describeItem(item, mon, roles, moves, format) {
        if (!item || item.toLowerCase() === 'none') return 'No held item — this set relies purely on stats and movepool utility.';
        const il = item.toLowerCase();
        const moveKeys = (moves || []).map(m => normKey(m));

        if (il.includes('choice specs')) {
            return `${link(item)} locks ${link(mon.species)} into one special move per switch-in, turning it into a wallbreaker. Every click must be calculated — a resisted or immune lock often costs the game. Pair with U-turn or pivot support if possible.`;
        }
        if (il.includes('choice band')) {
            return `${link(item)} maximizes physical output. Commit to KO calcs before clicking; wrong locks are punished harshly in ${roles.includes('Revenge Killer') ? 'revenge-kill' : 'wallbreaker'} scenarios.`;
        }
        if (il.includes('choice scarf')) {
            return `${link(item)} buys crucial Speed — ${link(mon.species)} can revenge kill or pivot into favorable matchups, but watch for priority, Trick Room, and paralysis.`;
        }
        if (il.includes('life orb')) {
            return `${link(item)} trades 10% HP per attack for 1.3× power — excellent on wallbreakers that do not need to switch often.`;
        }
        if (il.includes('focus sash')) {
            return `${link(item)} guarantees survival from full HP, enabling a guaranteed support turn (Aurora Veil, Tailwind, Trick Room) if played carefully.`;
        }
        if (il.includes('leftovers')) {
            return `${link(item)} provides passive recovery — ideal on bulky pivots and stall-oriented spreads that want to stay on the field.`;
        }
        if (il.includes('sitrus berry') || il.includes('lum berry') || il.includes('chesto berry')) {
            return `${link(item)} offers one-time recovery or status relief — time your aggressive plays knowing the berry can absorb a crucial hit or status.`;
        }
        if (il.includes('assault vest')) {
            return `${link(item)} boosts Special Defense by 50% but blocks status moves — a dedicated special tank spread.`;
        }
        if (il.includes('rocky helmet') || il.includes('babiri berry') || il.includes('shuca berry') || il.includes('yache berry')) {
            return `${link(item)} is a matchup-specific item — it exists to survive a particular super-effective hit or contact chip and should be reflected in team preview.`;
        }
        if (moveKeys.includes('protect')) {
            return `${link(item)} complements Protect-heavy play — scout safely while your partner attacks or sets field conditions.`;
        }
        return `${link(item)} supports this set's primary role as a ${roles[0] || 'utility'} pick.`;
    }

    function describeAbility(ability, mon, roles, format) {
        if (!ability) return '';
        const ref = getAbilityRef(ability);
        const desc = ref?.description || '';
        let hook = '';

        const ab = ability.toLowerCase();
        if (ab === 'intimidate') hook = `In ${format}, ${link(ability)} cycles are a staple — repeated switches stack Attack drops on physical-heavy opponents.`;
        else if (ab === 'prankster') hook = `${link(ability)} grants priority to status moves — Tailwind, Will-O-Wisp, and Thunder Wave often go first.`;
        else if (ab === 'protosynthesis' || ab === 'quark drive') hook = `${link(ability)} boosts the highest stat in Sun or Electric Terrain — align team conditions accordingly.`;
        else if (ab.includes('drizzle') || ab.includes('drought') || ab.includes('sand stream') || ab.includes('snow warning')) hook = `${link(ability)} sets weather passively — build the team to abuse the condition on turn one.`;
        else if (ab.includes('surge')) hook = `${link(ability)} sets terrain on switch-in — pair with terrain-abusing partners.`;
        else if (ab === 'infiltrator') hook = `${link(ability)} bypasses Reflect, Light Screen, Aurora Veil, and Substitute — critical for breaking defensive cores.`;
        else if (ab === 'levitate') hook = `${link(ability)} grants Ground immunity — watch for Gravity, Mold Breaker, and Thousand Arrows.`;
        else if (ab === 'supreme overlord') hook = `${link(ability)} scales with fainted allies — ${link(mon.species)} grows more dangerous as the game progresses.`;
        else if (ab === 'huge power' || ab === 'pure power') hook = `${link(ability)} doubles effective Attack — even resisted hits can threaten bulky targets.`;
        else if (ab === 'snow warning') hook = `${link(ability)} sets snow on switch-in, boosting Ice-type Defense by 50% on physical hits and enabling perfect-accuracy ${link('Blizzard')} while the weather is active.`;
        else if (ab === 'drizzle') hook = `${link(ability)} sets rain, powering Water moves and enabling Thunder's perfect accuracy — pair with Swift Swim or rain abusers.`;
        else if (ab === 'drought') hook = `${link(ability)} sets sun, weakening Water and boosting Fire — Chlorophyll and Protosynthesis partners benefit immediately.`;

        const body = desc ? `${desc.charAt(0).toUpperCase() + desc.slice(1)}` : `${link(ability)} shapes how ${link(mon.species)} interacts with common archetypes.`;
        return hook ? `${body} ${hook}` : body;
    }

    function describeTera(mon, roles) {
        const tera = mon.tera;
        if (!tera || tera === 'Normal') return '';
        const lines = [`Terastallizing into ${link(tera)} changes defensive and offensive typings for one decisive turn.`];
        if (roles.includes('Wallbreaker') || roles.includes('Physical Sweeper') || roles.includes('Special Sweeper')) {
            lines.push(`Offensive Tera ${link(tera)} can secure KOs that base typing cannot — save it for a guaranteed knockout or to flip a bad matchup.`);
        }
        if (['Water', 'Fire', 'Steel', 'Fairy', 'Ghost', 'Flying'].includes(tera)) {
            lines.push(`Defensive Tera ${link(tera)} may remove a key weakness for one turn — useful when a super-effective hit would otherwise end the game.`);
        }
        return lines.join(' ');
    }

    function getWeaknessList(db, mon) {
        const types = getBattleTypes(db, mon);
        if (typeof getWeaknesses === 'function') return getWeaknesses(types.map(t => t.toLowerCase()));
        return [];
    }

    function getResistanceList(db, mon) {
        const types = getBattleTypes(db, mon);
        const res = [];
        if (typeof TYPE_CHART === 'undefined' || typeof getEffectiveness !== 'function') return res;
        Object.keys(TYPE_CHART).forEach(atk => {
            const eff = getEffectiveness(atk, types);
            if (eff < 1 && eff > 0) res.push(atk.toLowerCase());
            if (eff === 0) res.push(atk.toLowerCase() + ' (immune)');
        });
        return res;
    }

    function explainTeammateFit(mainMon, teammate, mainRoles, tRoles, ctx, teamIndex) {
        const tDb = typeof getMonDb === 'function' ? getMonDb(teammate) : null;
        const mainDb = typeof getMonDb === 'function' ? getMonDb(mainMon) : null;
        const reasons = [];
        const tTypes = getMonTypes(tDb, teammate);
        const mainWeak = getWeaknessList(mainDb, mainMon);

        tTypes.forEach(tt => {
            if (mainWeak.includes((tt || '').toLowerCase())) reasons.push(`resists ${link(tt)}`);
        });

        if (tRoles.includes('Redirection') && (mainRoles.includes('Setup Sweeper') || mainRoles.includes('Wallbreaker'))) {
            reasons.push('redirects attacks so your ace can attack');
        }
        if (tRoles.includes('Fake Out Pressure')) reasons.push('buys a free turn with Fake Out');
        if (tRoles.includes('Speed Control') && !mainRoles.includes('Speed Control')) reasons.push('provides Tailwind or speed drops');
        if (tRoles.includes('Damage Mitigation') && mainRoles.some(r => ['Physical Sweeper', 'Wallbreaker'].includes(r))) {
            reasons.push('softens physical hits via Intimidate or Parting Shot');
        }
        if (tRoles.includes('Trick Room Setter') && mainRoles.includes('Trick Room Abuser')) {
            reasons.push('sets Trick Room for your slow sweepers');
        }
        if (tRoles.includes('Weather Setter') && mainRoles.includes('Weather Abuser')) reasons.push('enables weather-boosted offense');
        if (tRoles.includes('Terrain Setter') && mainRoles.includes('Terrain Abuser')) reasons.push('sets terrain for boosted attacks');

        const overlap = (teammate.moves || []).filter(m => m && (mainMon.moves || []).includes(m));
        if (overlap.length >= 2) reasons.push('shares move overlap for flexible positioning');

        if (reasons.length === 0) {
            reasons.push(`rounds out team coverage as a ${(tRoles[0] || 'flex').toLowerCase()} slot`);
        }

        const primaryRole = tRoles[0] || 'Flex';
        const movePreview = (teammate.moves || []).filter(Boolean).slice(0, 2).map(m => link(m)).join(', ');
        const roleIcon = tRoles.includes('Speed Control') ? 'tailwind.png'
            : tRoles.includes('Trick Room Setter') ? 'trick_room.png'
                : tRoles.some(r => ['Physical Sweeper', 'Wallbreaker'].includes(r)) ? 'move-physical.png'
                    : tRoles.includes('Special Sweeper') ? 'move-special.png' : 'move-status.png';
        return `<article class="build-prose-teammate-card">
            <div class="build-prose-teammate-card__visual">
                <img src="${getStrategySprite(teammate)}" alt="${esc(teammate.species)}" class="build-prose-teammate-card__sprite">
                <img src="${getStrategyAsset(roleIcon)}" alt="" class="build-prose-teammate-card__role-icon">
            </div>
            <div>
                <span class="build-prose-eyebrow">${esc(primaryRole)}</span>
                <h6>${link(teammate.species)}</h6>
                <p>${reasons.join(', ')}.</p>
                ${movePreview ? `<div class="build-prose-teammate-card__moves">${movePreview}</div>` : ''}
            </div>
        </article>`;
    }

    function findAlternateBuilds(species, format, currentBuildId) {
        if (typeof allBuilds === 'undefined') return [];
        const key = normKey(species);
        const fmt = (format || 'Singles').toLowerCase();
        return allBuilds.filter(b =>
            normKey(b.pokemon) === key &&
            (b.format || 'Singles').toLowerCase() === fmt &&
            String(b.id) !== String(currentBuildId)
        ).slice(0, 4);
    }

    function safeCompose(label, fn, fallback) {
        try {
            return fn();
        } catch (err) {
            console.warn('BuildNarrative.' + label + ':', err);
            return fallback;
        }
    }

    function getRoleDesc(role) {
        if (typeof roleDescriptions !== 'undefined' && roleDescriptions[role]) return roleDescriptions[role];
        return role;
    }

    function getDamageBenchmarks(mainMon, db, format) {
        if (typeof findBestDamage !== 'function' || typeof buildCalcStateFromSlot !== 'function' || !db) return [];
        const movesDb = (typeof allMoves !== 'undefined') ? allMoves : [];
        const field = (typeof getDefaultField === 'function') ? getDefaultField(format) : { format };
        const effAttDb = (typeof getMonDb === 'function') ? (getMonDb(mainMon) || db) : db;
        const attacker = buildCalcStateFromSlot(mainMon, 1, effAttDb, movesDb);
        const targets = getMetaTargetNames(format);
        const results = [];

        targets.forEach(name => {
            const defenderSlot = buildDefenderSlotFromMeta(name, format);
            const tDb = resolveTargetDb(defenderSlot.species || name);
            if (!tDb) return;
            const defDb = (typeof getEffectivePokemonData === 'function' && typeof allPokemon !== 'undefined')
                ? (getEffectivePokemonData(defenderSlot, allPokemon) || tDb)
                : tDb;
            const defender = buildCalcStateFromSlot(defenderSlot, 2, defDb, movesDb);
            const best = findBestDamage(attacker, defender, field);
            if (best && parseFloat(best.maxPercent) > 0) {
                results.push({
                    target: defDb.Name || defDb.name || name,
                    move: best.move,
                    min: best.minPercent,
                    max: best.maxPercent,
                    ko: best.koLabel,
                    usesMetaBuild: defenderSlot.moves && defenderSlot.moves.filter(Boolean).length > 1
                });
            }
        });
        return results.sort((a, b) => parseFloat(b.max) - parseFloat(a.max)).slice(0, 6);
    }

    function composeFormatGameplay(mainMon, mainRoles, format, ctx) {
        const u = ctx.utils || {};
        const moves = (mainMon.moves || []).map(m => normKey(m));
        const paras = [];
        const isDoubles = (format || '').toLowerCase() === 'doubles';

        if (isDoubles) {
            paras.push(`In ${link('Doubles')}, ${link(mainMon.species)} competes for a slot on a six-Pokémon roster where every turn involves two active attackers. Your win condition is usually securing a double KO, setting speed control, or removing both opposing threats before they remove yours. Lead with this set when its tools immediately pressure the opponent's structure; bring it in the back when you need a late-game cleaner or a specific matchup answer.`);
            if (moves.includes('protect')) {
                paras.push(`Protect is central to doubles sequencing: scout whether the opponent double-targets your partner, stall out opposing Tailwind turns, and punish predictable Fake Out leads. A common line is Protect plus an aggressive partner move to guarantee one hit connects while ${link(mainMon.species)} stays healthy.`);
            }
            if (u.tailwind || moves.includes('tailwind')) {
                paras.push(`Tailwind flips speed for four turns — commit to it when the opponent lacks their own speed control and your team has spread or multi-hit options to capitalize. Do not set Tailwind into an opposing Tailwind or Trick Room without a plan to overwrite or underspeed them.`);
            }
            if (moves.includes('fakeout')) {
                paras.push(`Fake Out creates a one-turn window where only your partner acts at full speed. Pair it with setup (Swords Dance, Quiver Dance), a spread attack, or a second support move like Tailwind or Trick Room.`);
            }
            if (moves.includes('auroraveil') || moves.includes('reflect') || moves.includes('lightscreen')) {
                paras.push(`Screen support defines many doubles teams: Aurora Veil halves both physical and special damage for five turns in snow, letting bulkier partners or setup sweepers survive hits they otherwise could not. Set screens before committing your restricted attacker.`);
            }
            if (u.intimidate || (ctx.hasSpecies && ctx.hasSpecies(['incineroar', 'landorustherian']))) {
                paras.push(`Intimidate cycling in doubles repeatedly drops opposing Attack — stack switches with ${link('Incineroar')} or ${link('Landorus-Therian')} to make physical KOs mathematically impossible for weakened sweepers.`);
            }
        } else {
            paras.push(`In ${link('Singles')}, ${link(mainMon.species)} must win a 1v1 war of attrition against the entire opposing team. Every switch costs momentum, so this set should either force switches with offensive pressure, pivot safely with U-turn or Volt Switch, or stay in and absorb hits while status or hazards wear the opponent down.`);
            if (mainRoles.includes('Wallbreaker') || (mainMon.item || '').toLowerCase().includes('choice')) {
                paras.push(`Choice items demand perfect prediction: click the move that KOs or heavily pressures the switch-in, because locking into a resisted attack often gives a free turn. Scout with team preview and prior turns before committing a lock.`);
            }
            if (mainRoles.includes('Setup Sweeper')) {
                paras.push(`Setup moves require safe opportunities — force out a passive Pokémon, punish a slow pivot, or use a teammate's disruption in doubles-style formats. Once boosted, prioritize speed control answers before they revenge kill.`);
            }
            if (moves.includes('stealthrock') || moves.includes('spikes')) {
                paras.push(`Hazards compound over switches: Stealth Rock and Spikes turn neutral matchups into 2HKO ranges and punish opposing pivots. Set them early when the opponent lacks a Magic Bounce or Rapid Spin answer.`);
            }
        }
        return paras;
    }

    function composeDeepSetProse(mainMon, db, mainRoles, format, ctx, benchmarks) {
        const moves = (mainMon.moves || []).filter(Boolean);
        const moveKeys = moves.map(m => normKey(m));
        const item = mainMon.item && mainMon.item.toLowerCase() !== 'none' ? mainMon.item : '';
        const evLine = formatEvSpread(mainMon.evs);
        const paras = [];

        if (moves.length >= 2) {
            const stab = moves.filter(m => {
                const ref = getMoveRef(m);
                if (!ref) return false;
                let mt = ref.type || '';
                if (typeof BattleCalc !== 'undefined' && typeof BattleCalc.resolveMoveType === 'function') {
                    try {
                        const resolved = BattleCalc.resolveMoveType(
                            { ability: mainMon?.ability || '', tera: !!mainMon?.tera, teraType: mainMon?.tera || null },
                            { name: m, type: mt, basePower: ref.power || 0 },
                            ref,
                            (mainMon?.item || '').toLowerCase(),
                            { weather: 'None' }
                        );
                        if (resolved?.moveType) mt = resolved.moveType;
                    } catch (e) { /* keep base */ }
                }
                const types = getMonTypes(db, mainMon);
                return types.some(t => t && t.toLowerCase() === (mt || '').toLowerCase());
            });
            const coverage = moves.filter(m => !stab.includes(m) && (getMoveRef(m)?.power || 0) > 0);
            paras.push(`${link(mainMon.species)} carries ${joinList(moves, m => link(m))}. ${stab.length ? `Primary STAB comes from ${joinList(stab, m => link(m))}` : 'This set leans on coverage rather than STAB'}${coverage.length ? `, while ${joinList(coverage, m => link(m))} cover typings the base ${getMonTypes(db, mainMon).join('/')} line cannot` : ''}. In team preview, identify which move threatens the opponent's restricted Pokémon or common switch-ins, and avoid revealing your Tera line too early.`);
        }

        if (moveKeys.includes('blizzard') || moveKeys.includes('thunder') || moveKeys.includes('hurricane')) {
            paras.push(`Weather-dependent moves like ${moveKeys.includes('blizzard') ? link('Blizzard') : 'this spread'} reach full accuracy under the right conditions — ${link(mainMon.ability) || 'weather support'} or manual weather from a teammate makes these moves reliable finishers instead of risky 70% gambles.`);
        }
        if (moveKeys.includes('icywind') || moveKeys.includes('electroweb') || moveKeys.includes('bulldoze')) {
            paras.push(`${link('Icy Wind')} and similar spread speed drops punish both opponents in doubles while chipping HP — use them to put slower sweepers in range of a follow-up KO from your partner, not as primary damage.`);
        }

        paras.push(`The ${evLine} spread with a ${mainMon.nature || 'Serious'} nature targets ${joinList(evIntent(mainMon.evs, mainRoles)) || 'standard benchmarks'}. ${natureAnalysis(mainMon.nature, mainMon.evs)} Every leftover EV should answer a specific calc: surviving a hit, outspeeding a tier, or guaranteeing an OHKO on a meta threat.`);

        if (item) {
            paras.push(describeItem(item, mainMon, mainRoles, moves, format));
        }

        if (benchmarks.length) {
            const metaNames = getMetaTargetNames(format);
            const metaNote = metaNames.length
                ? ` Benchmarks use latest ${esc(format)} builds from the meta pool (${joinList(metaNames.slice(0, 5), n => link(n))}${metaNames.length > 5 ? ', and others' : ''}).`
                : '';
            paras.push('Damage benchmarks against ranked meta targets (level ' + (mainMon.level || 50) + '): ' +
                benchmarks.map(b => {
                    const buildTag = b.usesMetaBuild ? 'meta build' : 'default spread';
                    return `${link(b.move)} vs ${link(b.target)} (${b.min}–${b.max}%${b.ko ? ', ' + b.ko.toLowerCase() : ''}, ${buildTag})`;
                }).join('; ') + '.' + metaNote + ' Treat these as planning numbers — real games add screens, Intimidate, Tera, and hazards.');
        }

        const speed = typeof getEffectiveSpeed === 'function' && typeof buildCalcStateFromSlot === 'function'
            ? getEffectiveSpeed(
                buildCalcStateFromSlot(mainMon, 1, (typeof getMonDb === 'function' ? getMonDb(mainMon) : db) || db, (typeof allMoves !== 'undefined') ? allMoves : []),
                (typeof getDefaultField === 'function') ? getDefaultField(format) : null
            )
            : null;
        if (speed != null) {
            paras.push(speedTierNote(speed, format));
        }

        const metaTargets = getMetaTargetNames(format).filter(n => normKey(n) !== normKey(mainMon.species));
        if (metaTargets.length >= 3) {
            paras.push(`In current ${esc(format)} Champion meta, expect to face ${joinList(metaTargets.slice(0, 6), n => link(n))} regularly. This set should have a defined plan against each: which move you click, whether you Tera, and whether you stay in or pivot. If a staple threatens a clean OHKO, that is a team-building problem — fix it with EVs, item choice, or a partner, not hope.`);
        }

        if (mainMon.tera && mainMon.tera !== 'Normal') {
            paras.push(describeTera(mainMon, mainRoles));
        } else if (mainRoles.some(r => ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker'].includes(r))) {
            paras.push(`Terastallization is your emergency button: offensive Tera turns a resisted STAB into neutral or super-effective damage, while defensive Tera removes a fatal weakness for one turn. Save Tera until it guarantees a knockout or keeps ${link(mainMon.species)} alive against a known calc.`);
        }

        return paras.map(p => '<p>' + p + '</p>').join('');
    }

    function inferArchetype(ctx, mainRoles) {
        const u = ctx.utils || {};
        if (u.tr && mainRoles.includes('Trick Room Abuser')) return 'Trick Room offense';
        if (u.tailwind && u.fakeout) return 'Tailwind + Fake Out tempo';
        if (u.drizzle || u.drought) return 'weather offense';
        if (u.psychicterrain) return 'Psychic Terrain hyper offense';
        if (u.intimidate) return 'Intimidate balance';
        if (mainRoles.includes('Wallbreaker')) return 'wallbreaker core';
        if (mainRoles.includes('Setup Sweeper')) return 'setup sweep';
        if (ctx.format === 'Doubles' && u.redirection) return 'redirection support offense';
        return `${(mainRoles[0] || 'flex').toLowerCase()} archetype`;
    }

    function getDamagingMoves(mon) {
        return (mon.moves || []).filter(Boolean).map(name => ({ name, ref: getMoveRef(name) }))
            .filter(move => {
                const category = (move.ref?.damage_class || move.ref?.category || '').toLowerCase();
                return (move.ref?.power || 0) > 0 && category !== 'status';
            });
    }

    const STRATEGY_MOVES = {
        setup: ['swordsdance', 'calmmind', 'nastyplot', 'dragondance', 'quiverdance', 'bulkup', 'irondefense', 'agility', 'shellsmash', 'bellydrum', 'coil', 'tidyup', 'victorydance', 'geomancy'],
        recovery: ['recover', 'roost', 'softboiled', 'slackoff', 'milkdrink', 'shoreup', 'strengthsap', 'synthesis', 'morningsun', 'moonlight', 'rest', 'wish', 'leechseed', 'aquaring'],
        status: ['toxic', 'willowisp', 'thunderwave', 'glare', 'nuzzle', 'spore', 'sleeppowder', 'hypnosis', 'yawn', 'saltcure'],
        hazards: ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'ceaselessedge', 'stoneaxe'],
        pivot: ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'chillyreception', 'batonpass'],
        trapping: ['meanlook', 'block', 'whirlpool', 'firespin', 'infestation', 'magmastorm', 'jawlock', 'thousandwaves'],
        screens: ['reflect', 'lightscreen', 'auroraveil'],
        rainPayoff: ['thunder', 'hurricane', 'weatherball', 'electroshot', 'hydropump', 'wavecrash', 'surgingstrikes'],
        sunPayoff: ['solarbeam', 'solarblade', 'weatherball', 'growth', 'hydrosteam', 'eruption', 'heatwave'],
        snowPayoff: ['blizzard', 'auroraveil'],
        sandPayoff: ['shoreup'],
        contrarySelfDrop: ['leafstorm', 'overheat', 'dracometeor', 'superpower', 'closecombat', 'vcreate', 'makeitrain', 'fleurcannon', 'psychoboost', 'armorcannon', 'headlongrush', 'hammerarm', 'spinout'],
        contraryAllyDrop: ['tickle', 'faketears', 'screech', 'metalsound', 'charm', 'eerieimpulse', 'featherdance', 'nobleroar', 'tearfullook', 'scaryface', 'cottonspore', 'stringshot']
    };

    function monMoveKeys(mon) {
        return (mon.moves || []).filter(Boolean).map(normKey);
    }

    function countMonsWithMoves(activeMons, moveKeys) {
        return activeMons.filter(mon => monMoveKeys(mon).some(move => moveKeys.includes(move))).length;
    }

    function getEffectiveAbilityKey(mon, db) {
        const dbAbilities = Array.isArray(db?.Ability) ? db.Ability : (db?.Ability ? [db.Ability] : []);
        if ((db?.Name || '').toLowerCase().includes('-mega') && dbAbilities.length) return normKey(dbAbilities[0]);
        return normKey(mon.ability || dbAbilities[0]);
    }

    function detectTeamStrategies(activeMons, roles, ctx) {
        const u = ctx.utils || {};
        const teamSize = Math.max(1, activeMons.length);
        const offenseCount = roles.filter(rs => rs.some(r => ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker', 'Setup Sweeper', 'Revenge Killer'].includes(r))).length;
        const wallCount = roles.filter(rs => rs.some(r => ['Physical Wall', 'Special Wall', 'Cleric/Healer'].includes(r))).length;
        const setupCount = Math.max(
            roles.filter(rs => rs.includes('Setup Sweeper')).length,
            countMonsWithMoves(activeMons, STRATEGY_MOVES.setup)
        );
        const recoveryCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.recovery);
        const statusCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.status);
        const hazardCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.hazards);
        const pivotCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.pivot);
        const screenCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.screens);
        const trapCount = countMonsWithMoves(activeMons, STRATEGY_MOVES.trapping);
        const trCount = roles.filter(rs => rs.includes('Trick Room Abuser')).length;
        const weatherAbusers = roles.filter(rs => rs.includes('Weather Abuser')).length;
        const contraryUsers = activeMons.filter(mon => getEffectiveAbilityKey(mon, typeof getMonDb === 'function' ? getMonDb(mon) : null) === 'contrary');
        const contrarySelfUsers = contraryUsers.filter(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.contrarySelfDrop.includes(move)));
        const contraryPartners = activeMons.filter(mon => !contraryUsers.includes(mon) && monMoveKeys(mon).some(move => STRATEGY_MOVES.contraryAllyDrop.includes(move)));
        const strategies = [];
        const add = (name, score, detail) => strategies.push({ name, score, detail });

        if (u.drizzle) {
            const payoff = weatherAbusers + countMonsWithMoves(activeMons, STRATEGY_MOVES.rainPayoff);
            add(u.tailwind && offenseCount >= 2 ? 'Rain Tailwind Offense' : 'Rain Offense', 94 + Math.min(8, payoff * 2), 'Rain boosts Water damage and enables Swift Swim, accurate Thunder/Hurricane, and other weather payoffs.');
        }
        if (u.drought) {
            const payoff = weatherAbusers + countMonsWithMoves(activeMons, STRATEGY_MOVES.sunPayoff);
            add(u.tailwind && offenseCount >= 2 ? 'Sun Tailwind Offense' : (u.tr && trCount ? 'Trick Room Sun' : 'Sun Offense'), 93 + Math.min(8, payoff * 2), 'Sun boosts Fire damage while enabling Chlorophyll, Protosynthesis, Solar moves, and weather-based coverage.');
        }
        if (u.sand) add('Sand Offense', 91 + Math.min(8, weatherAbusers * 3), 'Sand enables Sand Rush and residual chip while improving Rock-type special bulk.');
        if (u.snow) {
            const payoff = weatherAbusers + countMonsWithMoves(activeMons, STRATEGY_MOVES.snowPayoff);
            add(screenCount ? 'Snow / Aurora Veil Offense' : 'Snow Offense', 92 + Math.min(8, payoff * 2), 'Snow enables accurate Blizzard and Aurora Veil, activates Slush Rush, and improves Ice-type physical bulk.');
        }
        if (u.tr && trCount) add('Trick Room Offense', 96 + Math.min(8, trCount * 2), 'Trick Room reverses turn order so the team’s slow attackers become its fastest threats.');
        else if (u.tr) add('Trick Room Control', 78, 'Trick Room can reverse opposing speed control even without a dedicated slow-mode core.');
        if (u.psychicterrain && u.expandingforce) add('Psychic Terrain Offense', 92, 'Psychic Terrain blocks grounded priority and turns Expanding Force into boosted spread pressure.');
        else if (u.psychicterrain || u.grassyterrain || u.electricterrain) add('Terrain Offense', 82, 'Terrain supplies an immediate field bonus for compatible attacks, abilities, and seeds.');
        if (setupCount) {
            const supported = u.redirection || u.screens || u.fakeout || roles.some(rs => rs.includes('Damage Mitigation'));
            add(supported ? 'Supported Setup Sweep' : 'Setup Offense', 86 + Math.min(10, setupCount * 3) + (supported ? 5 : 0), 'Create a safe boosting turn, remove revenge killers, then preserve the boosted attacker as the win condition.');
        }
        if (contraryUsers.length) {
            const allyEngine = contraryPartners.length > 0;
            const selfEngine = contrarySelfUsers.length > 0;
            add(allyEngine ? 'Contrary Ally-Boost Engine' : 'Contrary Offense', allyEngine ? 101 : (selfEngine ? 94 : 76), allyEngine
                ? `${joinList(contraryPartners, mon => mon.species)} can target ${joinList(contraryUsers, mon => mon.species)} with stat-lowering moves such as Tickle or Fake Tears; Contrary inverts those drops into immediate boosts.`
                : selfEngine
                    ? `${joinList(contrarySelfUsers, mon => mon.species)} converts its own move drawbacks into boosts through Contrary.`
                    : 'Contrary punishes opposing stat drops and can convert compatible self-drops into setup.');
        }
        if (wallCount >= 2 && recoveryCount >= Math.min(2, teamSize) && (statusCount || hazardCount)) {
            add(statusCount >= 2 ? 'Status Stall / Attrition' : 'Stall / Attrition', 90 + Math.min(8, recoveryCount + statusCount + hazardCount), 'Recovery, status, and entry hazards win through accumulated chip rather than one short damage window.');
        } else if (wallCount >= 2 && (recoveryCount || statusCount)) {
            add('Defensive Balance', 77 + wallCount * 2, 'Bulky pivots absorb pressure and create repeatable openings for the team’s attackers.');
        }
        if (activeMons.some(mon => monMoveKeys(mon).includes('perishsong'))) {
            add(trapCount ? 'Perish Trap' : 'Perish Song Control', trapCount ? 89 : 75, trapCount
                ? 'Trap or pin targets while the Perish Song count advances, then switch before the final count.'
                : 'Use Perish Song to force switches, end prolonged setup lines, or close a favorable endgame.');
        }
        if (hazardCount >= 2 || (hazardCount && pivotCount >= 2)) add('Hazard Stack', 80 + hazardCount * 3, 'Layer hazards and force switches so every pivot moves the opponent closer to KO range.');
        if (pivotCount >= 2) add('Pivot / VoltTurn', 76 + pivotCount * 3, 'Repeated pivot moves retain initiative and bring the correct breaker in without spending a naked switch.');
        if (u.screens && (setupCount || offenseCount >= 2 || u.snow)) add('Screens Offense', 85 + screenCount * 2, 'Screens manufacture setup turns and let offensive pieces survive revenge attempts.');
        if (u.tailwind && offenseCount >= 2) add('Tailwind Hyper-Offense', 84 + Math.min(8, offenseCount * 2), 'Tailwind creates a four-turn window for the roster’s strongest attackers.');
        if (u.redirection && (setupCount || offenseCount >= 2)) add('Redirection Offense', 83, 'Redirection protects the active carry while it boosts or attacks.');
        if (u.spread && offenseCount >= 2) add('Spread-Damage Offense', 72 + offenseCount, 'Spread attacks pressure both opposing slots and punish passive positioning.');

        if (!strategies.length) {
            if (offenseCount >= Math.max(3, teamSize - 2) && wallCount === 0) add('Hyper-Offense', 70, 'Use immediate damage and speed to trade faster than the opponent can stabilize.');
            else if (offenseCount >= 2 && wallCount >= 1) add('Bulky Offense', 68, 'Bulky support creates repeated entries for two or more attacking routes.');
            else if (wallCount >= 2) add('Balance', 65, 'Defensive pivots and flexible attackers adapt the win condition to the matchup.');
            else add('Flexible Offense', 50, 'Use type coverage and positioning to identify the best attacker for each matchup.');
        }

        return strategies.sort((a, b) => b.score - a.score);
    }

    function getTeamStrategyArchetype(activeMons, ctx, roles) {
        return detectTeamStrategies(activeMons, roles, ctx)[0].name;
    }

    function scoreTeamAce(mon, monRoles, ctx) {
        const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
        const moves = getDamagingMoves(mon);
        const item = normKey(mon.item);
        const moveKeys = monMoveKeys(mon);
        const attack = parseInt(db?.Attack, 10) || 0;
        const specialAttack = parseInt(db?.['Sp.Atk'], 10) || 0;
        const speed = parseInt(db?.Speed, 10) || 0;
        const ability = getEffectiveAbilityKey(mon, db);
        const offensiveEvs = Math.max(parseInt(mon.evs?.atk, 10) || 0, parseInt(mon.evs?.spa, 10) || 0);
        let score = Math.max(attack, specialAttack);
        score += speed * 0.38;
        score += Math.min(20, offensiveEvs * 0.25);
        score += Math.min(18, moves.length * 5);
        if (monRoles.includes('Wallbreaker')) score += 55;
        if (monRoles.includes('Physical Sweeper') || monRoles.includes('Special Sweeper')) score += 45;
        if (monRoles.includes('Setup Sweeper') || moveKeys.some(move => STRATEGY_MOVES.setup.includes(move))) score += 42;
        if (monRoles.includes('Revenge Killer')) score += 18;
        if (item.includes('choiceband') || item.includes('choicespecs') || item.includes('lifeorb')) score += 22;
        if (item.includes('ite') && (db?.Name || '').toLowerCase().includes('-mega')) score += 70;
        if (monRoles.includes('Restricted Legendary')) score += 28;
        if (ability === 'hugepower' || ability === 'purepower') score += 35;
        if (ability === 'supremeoverlord' || moveKeys.includes('lastrespects')) score += 28;
        if (ctx?.utils?.drought && (ability === 'drought' || ability === 'solarpower') && moves.some(m => (m.ref?.type || '').toLowerCase() === 'fire')) score += 28;
        if (ctx?.utils?.drizzle && ['swiftswim', 'drizzle'].includes(ability) && moves.some(m => (m.ref?.type || '').toLowerCase() === 'water')) score += 28;
        if (ctx?.utils?.sand && ability === 'sandrush') score += 26;
        if (ctx?.utils?.snow && ability === 'slushrush') score += 26;
        if (ability === 'contrary') {
            if (moveKeys.some(move => STRATEGY_MOVES.contrarySelfDrop.includes(move))) score += 48;
            if ((ctx?.moves || []).some(move => STRATEGY_MOVES.contraryAllyDrop.includes(move))) score += 28;
        }
        if (ctx?.utils?.tr && monRoles.includes('Trick Room Abuser')) score += 30;
        if (moves.some(m => (m.ref?.tags || []).some(t => /all opponents|all pokemon/i.test(t)))) score += 12;
        if (moves.length <= 1 && monRoles.some(r => ['Physical Wall', 'Special Wall', 'Cleric/Healer', 'Redirection'].includes(r))) score -= 35;
        return score;
    }

    function pickTeamAces(activeMons, roles, ctx) {
        return activeMons.map((mon, i) => ({ mon, roles: roles[i] || [], score: scoreTeamAce(mon, roles[i] || [], ctx), index: i }))
            .sort((a, b) => b.score - a.score);
    }

    function scoreCorePartner(aceEntry, candidate, ctx) {
        const ace = aceEntry.mon;
        const aceRoles = aceEntry.roles;
        const roles = candidate.roles;
        const moves = monMoveKeys(candidate.mon);
        const ability = getEffectiveAbilityKey(candidate.mon, typeof getMonDb === 'function' ? getMonDb(candidate.mon) : null);
        const aceAbility = getEffectiveAbilityKey(ace, typeof getMonDb === 'function' ? getMonDb(ace) : null);
        let score = candidate.score * 0.18;
        if (roles.includes('Redirection') && aceRoles.some(r => ['Setup Sweeper', 'Wallbreaker', 'Physical Sweeper', 'Special Sweeper'].includes(r))) score += 55;
        if (roles.includes('Damage Mitigation') || roles.includes('Screener')) score += 28;
        if (roles.includes('Fake Out Pressure')) score += 25;
        if (roles.includes('Speed Control')) score += 24;
        if (roles.includes('Pivot')) score += 20;
        if (ctx.utils?.tr && roles.includes('Trick Room Setter') && aceRoles.includes('Trick Room Abuser')) score += 60;
        if (ctx.utils?.drought && (ability === 'drought' || moves.includes('sunnyday'))) score += 48;
        if (ctx.utils?.drizzle && (ability === 'drizzle' || moves.includes('raindance'))) score += 48;
        if (ctx.utils?.sand && (ability === 'sandstream' || moves.includes('sandstorm'))) score += 48;
        if (ctx.utils?.snow && (ability === 'snowwarning' || moves.includes('snowscape') || moves.includes('chillyreception'))) score += 48;
        if (aceAbility === 'contrary' && moves.some(move => STRATEGY_MOVES.contraryAllyDrop.includes(move))) score += 65;
        if (moves.includes('helpinghand')) score += 22;
        if (moves.some(move => STRATEGY_MOVES.recovery.includes(move))) score += 12;
        if (candidate.mon === ace) return -Infinity;
        return score;
    }

    function pickPrimaryCore(rankedAces, ctx) {
        if (!rankedAces.length) return [];
        const ace = rankedAces[0];
        const partner = rankedAces.slice(1)
            .map(candidate => ({ ...candidate, coreScore: scoreCorePartner(ace, candidate, ctx) }))
            .sort((a, b) => b.coreScore - a.coreScore)[0];
        return partner ? [ace, partner] : [ace];
    }

    function describeRosterFunction(mon, monRoles, ctx, isAce) {
        const moves = (mon.moves || []).map(normKey);
        const ability = getEffectiveAbilityKey(mon, typeof getMonDb === 'function' ? getMonDb(mon) : null);
        const item = normKey(mon.item);
        const originalMoves = mon.moves || [];
        const moveName = key => originalMoves.find(move => normKey(move) === key) || key;
        const damaging = getDamagingMoves(mon);
        let identity = '';
        let operation = '';

        if (isAce) {
            identity = `${link(mon.species)} is the primary win condition: preserve its HP until field control is established, then use it to convert the team’s support into consecutive knockouts.`;
        } else if (moves.includes('lastrespects')) {
            identity = `${link(mon.species)} is late-game insurance rather than an early trade piece; every fainted ally increases ${link(moveName('lastrespects'))} by 50 base power.`;
        } else if (['sandstream', 'drought', 'drizzle', 'snowwarning'].includes(ability) || moves.some(m => ['sandstorm', 'sunnyday', 'raindance', 'snowscape'].includes(m))) {
            identity = `${link(mon.species)} controls the weather layer and should often be held in reserve so its entry can overwrite opposing weather at the decisive moment.`;
        } else if (moves.includes('tailwind')) {
            identity = `${link(mon.species)} is the team’s tempo setter, creating a four-turn ${link(moveName('tailwind'))} window that lets slower wallbreakers attack before they are pressured.`;
        } else if (moves.includes('trickroom')) {
            identity = `${link(mon.species)} manages reversed turn order, either establishing ${link(moveName('trickroom'))} for slow attackers or cancelling the opponent’s room with a second use.`;
        } else if (monRoles.includes('Redirection')) {
            identity = `${link(mon.species)} protects the active win condition by redirecting single-target attacks, turning dangerous setup or attack turns into controlled exchanges.`;
        } else if (monRoles.includes('Priority Denial')) {
            identity = `${link(mon.species)} creates a priority-safe zone for fragile attackers, shutting down common revenge tools such as Fake Out, Sucker Punch, and Extreme Speed.`;
        } else if (monRoles.includes('Pivot')) {
            const pivotMove = originalMoves.find(move => ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'chillyreception'].includes(normKey(move)));
            identity = `${link(mon.species)} is the positioning hinge: ${pivotMove ? link(pivotMove) : 'its pivot utility'} chips or weakens the board while escorting a setter or attacker into play safely.`;
        } else if (monRoles.includes('Physical Wall') || monRoles.includes('Special Wall')) {
            identity = `${link(mon.species)} absorbs ${monRoles.includes('Physical Wall') ? 'physical' : 'special'} pressure and stabilizes unfavorable boards, preserving the offensive slots for matchups they can actually win.`;
        } else if (monRoles.includes('Wallbreaker')) {
            identity = `${link(mon.species)} is the early-to-midgame breaker, tasked with forcing defensive Terastallization and pushing the opponent’s dedicated wall into the ace’s cleanup range.`;
        } else {
            identity = `${link(mon.species)} fills a flexible ${(monRoles[0] || 'support').toLowerCase()} slot, covering lines the primary core cannot execute safely on its own.`;
        }

        if (ability === 'sandrush' && ctx.utils?.sand) {
            operation = `Under Sand, ${link(mon.ability)} doubles its Speed; bring it in after weather is secured rather than exposing it before the setter acts.`;
        } else if (ability === 'intimidate' && moves.some(m => ['uturn', 'voltswitch', 'partingshot'].includes(m))) {
            operation = `${link(mon.ability)} plus pivoting enables repeated Attack drops, so cycle this slot instead of leaving it in for low-value neutral damage.`;
        } else if (moves.includes('willowisp') && moves.includes('allyswitch')) {
            operation = `${link(moveName('willowisp'))} suppresses physical carries while ${link(moveName('allyswitch'))} punishes predictable single-target attacks; alternate them only after identifying the opponent’s target.`;
        } else if (moves.some(m => ['sleeppowder', 'spore', 'hypnosis'].includes(m))) {
            const sleepMove = originalMoves.find(move => ['sleeppowder', 'spore', 'hypnosis'].includes(normKey(move)));
            operation = `${link(sleepMove)} denies setup and Trick Room turns, but its best value comes when a partner simultaneously threatens damage rather than waiting passively.`;
        } else if ((ctx.abilities || []).includes('contrary') && moves.some(move => STRATEGY_MOVES.contraryAllyDrop.includes(move))) {
            const boostMove = originalMoves.find(move => STRATEGY_MOVES.contraryAllyDrop.includes(normKey(move)));
            operation = `Target the ${link('Contrary')} ally with ${link(boostMove)}: the intended stat drops are inverted into boosts, creating a setup turn without spending the carry’s move.`;
        } else if (moves.includes('helpinghand')) {
            operation = `Reserve ${link(moveName('helpinghand'))} for a damage-calculator-confirmed knockout; using it into Protect wastes both active slots for the turn.`;
        } else if (moves.includes('faketears') || moves.includes('metalsound') || moves.includes('screech')) {
            const dropMove = originalMoves.find(move => ['faketears', 'metalsound', 'screech'].includes(normKey(move)));
            operation = `${link(dropMove)} turns bulky neutral targets into immediate KO ranges, especially when applied before a partner’s spread attack.`;
        } else if (item.includes('choicescarf')) {
            operation = `${link(mon.item)} provides surprise speed, but move lock makes positioning critical—pivot out rather than donating momentum into a resistance or Protect.`;
        } else if (moves.includes('fakeout')) {
            operation = `${link(moveName('fakeout'))} buys one uncontested partner action; spend that turn on speed control, weather positioning, or a guaranteed knockout.`;
        } else if (damaging.length) {
            const attacks = damaging.slice(0, 2).map(move => link(move.name));
            operation = `${joinList(attacks)} supply its immediate pressure; choose the attack that advances the team’s win condition instead of chasing isolated chip.`;
        } else if (moves.includes('protect')) {
            operation = `${link(moveName('protect'))} scouts double-targets and stalls opposing field turns while the partner continues making progress.`;
        }

        return `${identity}${operation ? ` ${operation}` : ''}`;
    }

    function getKeyStrategicMoves(mon) {
        const priority = [
            'tailwind', 'trickroom', 'fakeout', 'helpinghand', 'faketears', 'metalsound',
            'screech', 'sleeppowder', 'spore', 'hypnosis', 'willowisp', 'allyswitch',
            'followme', 'ragepowder', 'rockslide', 'lastrespects', 'uturn', 'voltswitch',
            'flipturn', 'partingshot', 'sunnyday', 'raindance', 'sandstorm', 'snowscape'
        ];
        const moves = (mon.moves || []).filter(Boolean);
        return [...moves].sort((a, b) => {
            const ai = priority.indexOf(normKey(a));
            const bi = priority.indexOf(normKey(b));
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
        }).slice(0, 3);
    }

    function getStrategySprite(mon) {
        const spriteMon = normKey(mon?.species) === 'meowsticm' ? { ...mon, species: 'Meowstic' } : mon;
        if (typeof getSpriteUrl === 'function') return getSpriteUrl(spriteMon);
        const slug = (spriteMon?.species || '').toLowerCase().replace(/\./g, '').replace(/[^a-z0-9-]+/g, '-');
        return `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`;
    }

    function getStrategyAsset(name) {
        return `${typeof getAssetPrefix === 'function' ? getAssetPrefix() : '../'}assets/${name}`;
    }

    function getArchetypeAsset(archetype, ctx) {
        const key = (archetype || '').toLowerCase();
        if (key.includes('sand') || ctx.utils?.sand) return getStrategyAsset('sandstorm.png');
        if (key.includes('sun') || ctx.utils?.drought) return getStrategyAsset('sun.png');
        if (key.includes('rain') || ctx.utils?.drizzle) return getStrategyAsset('rain.png');
        if (key.includes('snow') || ctx.utils?.snow) return getStrategyAsset('snowstorm.png');
        if (key.includes('trick room') || ctx.utils?.tr) return getStrategyAsset('trick_room.png');
        if (key.includes('tailwind') || ctx.utils?.tailwind) return getStrategyAsset('tailwind.png');
        if (key.includes('psychic')) return getStrategyAsset('psychicterrain.png');
        if (key.includes('stall') || key.includes('attrition') || key.includes('balance')) return getStrategyAsset('move-status.png');
        if (key.includes('setup') || key.includes('screen')) return getStrategyAsset('move-special.png');
        if (key.includes('contrary')) return getStrategyAsset('move-status.png');
        return getStrategyAsset('move-special.png');
    }

    function getLayerAsset(label, archetype, ctx) {
        const key = (label || '').toLowerCase();
        if (key.includes('sand')) return getStrategyAsset('sandstorm.png');
        if (key.includes('snow')) return getStrategyAsset('snowstorm.png');
        if (key.includes('weather')) return getArchetypeAsset(archetype, ctx);
        if (key.includes('speed')) return getStrategyAsset('tailwind.png');
        if (key.includes('turn order')) return getStrategyAsset('trick_room.png');
        if (key.includes('denial') || key.includes('break') || key.includes('suppression') || key.includes('attrition') || key.includes('residual') || key.includes('buffer')) return getStrategyAsset('move-status.png');
        if (key.includes('late-game')) return getStrategyAsset('move-physical.png');
        if (key.includes('item') || key.includes('ability') || key.includes('amplification')) return getStrategyAsset('move-special.png');
        return getStrategyAsset('move-physical.png');
    }

    function buildEngineLayers(ace, ctx, activeMons) {
        const layers = [];
        const aceDb = typeof getMonDb === 'function' ? getMonDb(ace) : null;
        const speed = typeof getMonSpeed === 'function' ? getMonSpeed(ace, aceDb, ctx.format) : null;
        const aceMoves = getDamagingMoves(ace);
        const aceTypes = getMonTypes(aceDb, ace).map(t => (t || '').toLowerCase());
        const allMoveKeys = activeMons.flatMap(m => (m.moves || []).map(normKey));
        const aceItem = normKey(ace.item);
        const aceAbility = getEffectiveAbilityKey(ace, aceDb);

        if (speed != null) {
            layers.push({ label: 'Base Speed', text: `${link(ace.species)} reaches <strong>${speed} Speed</strong> before field control, defining which threats it can pressure naturally.` });
        }
        if (ctx.utils.tailwind) {
            const setter = activeMons.find(m => (m.moves || []).map(normKey).includes('tailwind'));
            layers.push({ label: 'Speed Control', text: `${setter ? link(setter.species) : 'A teammate'} supplies ${link('Tailwind')}, doubling allied Speed for four turns and opening a short attack window.` });
        }
        if (ctx.utils.tr) {
            const setter = activeMons.find(m => (m.moves || []).map(normKey).includes('trickroom'));
            layers.push({ label: 'Turn Order', text: `${setter ? link(setter.species) : 'The team'} can use ${link('Trick Room')} to enable slow attackers or reverse opposing Trick Room.` });
        }
        const setupMove = (ace.moves || []).find(move => STRATEGY_MOVES.setup.includes(normKey(move)));
        if (setupMove) {
            const protector = activeMons.find(mon => mon !== ace && (
                (mon.moves || []).map(normKey).some(move => ['followme', 'ragepowder', 'fakeout', 'reflect', 'lightscreen', 'auroraveil', 'partingshot'].includes(move))
            ));
            layers.push({
                label: 'Setup Window',
                text: `${link(ace.species)} uses ${link(setupMove)} as its conversion turn${protector ? ` while ${link(protector.species)} supplies disruption or protection` : ''}. Do not boost until immediate revenge tools are controlled.`
            });
        }
        if (ctx.utils.drought && aceMoves.some(m => (m.ref?.type || '').toLowerCase() === 'fire')) {
            const setter = activeMons.find(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'drought' || (m.moves || []).map(normKey).includes('sunnyday'));
            layers.push({ label: 'Weather Boost', text: `${setter ? link(setter.species) : 'Sun support'} powers ${link(ace.species)}’s Fire attacks by <strong>1.5×</strong> while Sun remains active.` });
        }
        if (ctx.utils.drizzle && aceMoves.some(m => (m.ref?.type || '').toLowerCase() === 'water')) {
            const setter = activeMons.find(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'drizzle' || (m.moves || []).map(normKey).includes('raindance'));
            layers.push({ label: 'Weather Boost', text: `${setter ? link(setter.species) : 'Rain support'} powers ${link(ace.species)}’s Water attacks by <strong>1.5×</strong> while Rain remains active.` });
        }
        if (ctx.utils.sand) {
            const setter = activeMons.find(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'sandstream' || (m.moves || []).map(normKey).includes('sandstorm'));
            const rushUsers = activeMons.filter(m => normKey(m.ability) === 'sandrush');
            layers.push({
                label: 'Sand Activation',
                text: `${setter ? link(setter.species) : 'The weather setter'} establishes Sand${rushUsers.length ? `, doubling ${joinList(rushUsers, m => link(m.species))}’s Speed through ${link('Sand Rush')}` : ' to enable the team’s weather interactions'}. Preserve the setter when another weather team can overwrite the field.`
            });
        }
        if (ctx.utils.snow) {
            const setter = activeMons.find(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'snowwarning'
                || (m.moves || []).map(normKey).some(move => ['snowscape', 'chillyreception'].includes(move)));
            const slushUsers = activeMons.filter(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'slushrush');
            const blizzardUsers = activeMons.filter(m => monMoveKeys(m).includes('blizzard'));
            const veilUser = activeMons.find(m => monMoveKeys(m).includes('auroraveil'));
            layers.push({
                label: 'Snow Activation',
                text: `${setter ? link(setter.species) : 'The weather setter'} establishes Snow${slushUsers.length ? `, doubling ${joinList(slushUsers, m => link(m.species))}’s Speed with ${link('Slush Rush')}` : ''}${blizzardUsers.length ? ` and making ${joinList(blizzardUsers, m => link(m.species))}’s ${link('Blizzard')} perfectly accurate` : ''}.${veilUser ? ` ${link(veilUser.species)} can then set ${link('Aurora Veil')} for team-wide protection.` : ''}`
            });
        }
        const contraryUsers = activeMons.filter(m => getEffectiveAbilityKey(m, typeof getMonDb === 'function' ? getMonDb(m) : null) === 'contrary');
        if (contraryUsers.length) {
            const allyEnablers = activeMons.filter(m => !contraryUsers.includes(m) && monMoveKeys(m).some(move => STRATEGY_MOVES.contraryAllyDrop.includes(move)));
            const selfDropUsers = contraryUsers.filter(m => monMoveKeys(m).some(move => STRATEGY_MOVES.contrarySelfDrop.includes(move)));
            if (allyEnablers.length || selfDropUsers.length) {
                layers.push({
                    label: 'Contrary Conversion',
                    text: `${joinList(contraryUsers, m => link(m.species))} invert stat drops into boosts.${allyEnablers.length ? ` ${joinList(allyEnablers, m => link(m.species))} can deliberately target them with ${joinList(allyEnablers.flatMap(m => (m.moves || []).filter(move => STRATEGY_MOVES.contraryAllyDrop.includes(normKey(move)))).slice(0, 3), move => link(move))}.` : ''}${selfDropUsers.length ? ` Their self-lowering attacks also become repeatable setup.` : ''}`
                });
            }
        }
        const sleepUser = activeMons.find(m => (m.moves || []).map(normKey).some(k => ['sleeppowder', 'spore', 'hypnosis'].includes(k)));
        const rockSlideUser = activeMons.find(m => (m.moves || []).map(normKey).includes('rockslide'));
        if (sleepUser && rockSlideUser) {
            layers.push({
                label: 'Turn Denial',
                text: `${link(sleepUser.species)} applies sleep while ${link(rockSlideUser.species)} threatens spread flinches with ${link('Rock Slide')}; together they can deny setup and recovery turns without relying only on raw damage.`
            });
        }
        const lastRespectsUser = activeMons.find(m => (m.moves || []).map(normKey).includes('lastrespects'));
        if (lastRespectsUser) {
            layers.push({
                label: 'Late-Game Insurance',
                text: `${link(lastRespectsUser.species)}’s ${link('Last Respects')} gains <strong>50 base power per fainted ally</strong>. Keep this cleaner healthy while the early core trades, then deploy it only after the move has scaled.`
            });
        }
        const intimidateUser = activeMons.find(m => normKey(m.ability) === 'intimidate');
        const burnUser = activeMons.find(m => (m.moves || []).map(normKey).includes('willowisp'));
        if (intimidateUser && burnUser) {
            layers.push({
                label: 'Physical Suppression',
                text: `${link(intimidateUser.species)} cycles ${link('Intimidate')} while ${link(burnUser.species)} threatens ${link('Will-O-Wisp')}, sharply reducing physical damage and buying extra Sand or status turns.`
            });
        }
        const recoveryUsers = activeMons.filter(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.recovery.includes(move)));
        const statusUsers = activeMons.filter(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.status.includes(move)));
        if (recoveryUsers.length >= 2 && statusUsers.length) {
            layers.push({
                label: 'Attrition Loop',
                text: `${joinList(recoveryUsers.slice(0, 2), mon => link(mon.species))} sustain the defensive core while ${joinList(statusUsers.slice(0, 2), mon => link(mon.species))} apply status or unavoidable chip. Rotate rather than accepting losing trades.`
            });
        }
        const hazardUsers = activeMons.filter(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.hazards.includes(move)));
        if (hazardUsers.length) {
            const pivotUsers = activeMons.filter(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.pivot.includes(move)));
            layers.push({
                label: 'Residual Damage',
                text: `${joinList(hazardUsers.slice(0, 2), mon => link(mon.species))} establish entry hazards${pivotUsers.length ? ` while ${joinList(pivotUsers.slice(0, 2), mon => link(mon.species))} force repeated switches` : ''}, moving opposing checks into the ace’s KO range.`
            });
        }
        if (ctx.utils.screens) {
            const screenUser = activeMons.find(mon => monMoveKeys(mon).some(move => STRATEGY_MOVES.screens.includes(move)));
            layers.push({
                label: 'Damage Buffer',
                text: `${screenUser ? link(screenUser.species) : 'The screen setter'} uses Reflect, Light Screen, or Aurora Veil to create safer setup and attack turns. Track remaining screen turns before committing the carry.`
            });
        }
        if (allMoveKeys.includes('helpinghand')) {
            const helper = activeMons.find(m => (m.moves || []).map(normKey).includes('helpinghand'));
            layers.push({ label: 'Direct Amplification', text: `${link(helper?.species || 'Helping Hand user')} adds a <strong>1.5×</strong> modifier to the ace’s selected move.` });
        }
        if (allMoveKeys.includes('faketears') || allMoveKeys.includes('metalsound')) {
            const debuffer = activeMons.find(m => (m.moves || []).map(normKey).some(k => k === 'faketears' || k === 'metalsound'));
            layers.push({ label: 'Special Defense Break', text: `${link(debuffer?.species || 'The support slot')} can apply a <strong>−2 Sp. Def</strong> drop, effectively doubling special damage before other modifiers.` });
        }
        if (allMoveKeys.includes('screech')) {
            const debuffer = activeMons.find(m => (m.moves || []).map(normKey).includes('screech'));
            layers.push({ label: 'Defense Break', text: `${link(debuffer?.species || 'The support slot')} can apply a <strong>−2 Defense</strong> drop, effectively doubling physical damage before other modifiers.` });
        }
        if (aceItem.includes('lifeorb')) layers.push({ label: 'Item Boost', text: `${link('Life Orb')} multiplies attack damage by <strong>1.3×</strong> at the cost of recoil.` });
        if (aceItem.includes('choicespecs') || aceItem.includes('choiceband')) layers.push({ label: 'Item Boost', text: `${link(ace.item)} multiplies the relevant attacking stat by <strong>1.5×</strong>, but locks ${link(ace.species)} into one move.` });
        if (aceAbility === 'hugepower' || aceAbility === 'purepower') layers.push({ label: 'Ability Boost', text: `${link(ace.ability)} doubles ${link(ace.species)}’s effective Attack.` });
        if (aceAbility === 'solarpower' && ctx.utils.drought) layers.push({ label: 'Ability Boost', text: `${link('Solar Power')} multiplies Special Attack by <strong>1.5×</strong> in Sun, trading HP for immediate pressure.` });
        if (aceAbility === 'firemane' && aceMoves.some(m => (m.ref?.type || '').toLowerCase() === 'fire')) layers.push({ label: 'Ability Boost', text: `${link('Fire Mane')} adds a <strong>1.5×</strong> boost to Fire attacks.` });

        if (layers.length === 1 && aceTypes.length) {
            layers.push({ label: 'STAB Pressure', text: `${link(ace.species)} converts its ${aceTypes.map(t => link(capitalize(t))).join('/')} typing into reliable same-type damage; preserve it until checks are chipped.` });
        }
        return layers;
    }

    function buildProblemMatchups(ace, aces, activeMons, roles, ctx) {
        const rows = [];
        const weaknessCounts = {};
        activeMons.forEach(mon => {
            const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
            getWeaknessList(db, mon).forEach(type => { weaknessCounts[type] = (weaknessCounts[type] || 0) + 1; });
        });
        Object.entries(weaknessCounts).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([type, count]) => {
            const answers = activeMons.filter(mon => {
                const db = typeof getMonDb === 'function' ? getMonDb(mon) : null;
                return getResistanceList(db, mon).some(r => r.startsWith(type));
            });
            rows.push({
                threat: `${capitalize(type)} pressure`,
                problem: `${count} team members are weak to ${capitalize(type)}, so repeated spread or coverage damage can overwhelm the core.`,
                solution: answers.length ? `Preserve ${joinList(answers.slice(0, 2), m => link(m.species))} as the defensive pivot${answers.length > 1 ? 's' : ''}.` : 'Use Tera defensively or deny the attacker a free turn; the roster has no natural resistance.'
            });
        });
        if (ctx.utils.drought || ctx.utils.drizzle || ctx.utils.snow || ctx.utils.sand) {
            const manualSetter = activeMons.find(m => (m.moves || []).map(normKey).some(k => ['sunnyday', 'raindance', 'snowscape', 'sandstorm'].includes(k)));
            rows.push({
                threat: 'Opposing weather',
                problem: 'A slower weather setter can overwrite the field and remove the team’s speed or damage multiplier.',
                solution: manualSetter ? `Keep ${link(manualSetter.species)} healthy to reset weather manually after the opposing setter moves.` : 'Pressure the opposing setter immediately and avoid committing the weather abuser before field control is secure.'
            });
        }
        const priorityBlocker = activeMons.find((m, i) => (roles[i] || []).includes('Priority Denial'));
        if (scoreTeamAce(ace, aces[0]?.roles || [], ctx) >= 150) {
            const aceSpeed = typeof getMonSpeed === 'function' ? getMonSpeed(ace, getMonDb(ace), ctx.format) : null;
            const speedProblem = ctx.utils.tr && aceSpeed != null && aceSpeed < 85
                ? `Outside Trick Room, faster attackers can move before ${link(ace.species)}; priority can still finish it after chip.`
                : `${link(ace.species)} can be revenge-killed after chip, while Trick Room or opposing speed control can erase its normal turn-order advantage.`;
            rows.push({
                threat: 'Priority & speed reversal',
                problem: speedProblem,
                solution: priorityBlocker ? `Position ${link(priorityBlocker.species)} beside the ace to deny priority; use Protect or reverse Trick Room before attacking.` : ctx.utils.tr ? 'Use your own Trick Room user to reverse opposing Trick Room, and scout priority with Protect.' : 'Preserve HP, scout with Protect, and remove priority users before revealing the ace.'
            });
        }
        const physical = ctx.physicalMoveCount;
        const special = ctx.specialMoveCount;
        const alternate = aces.find(x => x.mon.species !== ace.species && (
            special > physical ? x.roles.includes('Physical Sweeper') || parseInt(getMonDb(x.mon)?.Attack, 10) > parseInt(getMonDb(x.mon)?.['Sp.Atk'], 10)
                : x.roles.includes('Special Sweeper') || parseInt(getMonDb(x.mon)?.['Sp.Atk'], 10) > parseInt(getMonDb(x.mon)?.Attack, 10)
        ));
        if (Math.abs(physical - special) >= 4) {
            rows.push({
                threat: special > physical ? 'Special walls' : 'Physical walls & Intimidate',
                problem: `The roster is ${special > physical ? 'special' : 'physical'}-leaning, allowing one defensive profile to absorb most attacks.`,
                solution: alternate ? `Pivot the win condition to ${link(alternate.mon.species)}, which attacks from the opposite side.` : `Use ${special > physical ? 'Sp. Def drops' : 'Defense drops, clear stat drops,'} or revise one coverage slot to diversify damage.`
            });
        }
        return rows.slice(0, 4);
    }

    function findMonWithMoves(activeMons, moveKeys) {
        return activeMons.find(mon => (mon.moves || []).map(normKey).some(key => moveKeys.includes(key)));
    }

    function formatLeadPair(mons, format) {
        const unique = mons.filter((mon, i, list) => mon && list.indexOf(mon) === i);
        const count = format === 'Doubles' ? 2 : 1;
        return joinList(unique.slice(0, count), mon => link(mon.species)) || 'Matchup-dependent lead';
    }

    function buildLeadAdjustments(activeMons, roles, ctx, format, ace) {
        const rows = [];
        const defaultLeads = ctx.leadMons?.length ? ctx.leadMons : activeMons.slice(0, format === 'Doubles' ? 2 : 1);
        rows.push({
            matchup: 'Standard / neutral',
            mons: defaultLeads,
            lead: formatLeadPair(defaultLeads, format),
            execution: `${(ctx.leadReasons || []).filter(Boolean).join(' ') || 'Establish safe board control, identify their primary answer, and preserve the cleaner.'}`
        });

        const pivot = findMonWithMoves(activeMons, ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'chillyreception']);
        const weatherSetter = activeMons.find(mon => ['sandstream', 'drought', 'drizzle', 'snowwarning'].includes(getEffectiveAbilityKey(mon, typeof getMonDb === 'function' ? getMonDb(mon) : null)))
            || findMonWithMoves(activeMons, ['sandstorm', 'sunnyday', 'raindance', 'snowscape']);
        const weatherAbuser = activeMons.find((mon, i) => mon !== weatherSetter && (roles[i] || []).includes('Weather Abuser'));
        if (weatherSetter && weatherAbuser) {
            const safePartner = pivot || activeMons.find(mon => mon !== weatherSetter && mon !== weatherAbuser) || weatherAbuser;
            rows.push({
                matchup: 'Aggressive fast leads',
                mons: [safePartner, weatherAbuser],
                lead: formatLeadPair([safePartner, weatherAbuser], format),
                execution: pivot
                    ? `Apply immediate pressure, then use a pivot move to bring in ${link(weatherSetter.species)} safely and activate ${link(weatherAbuser.species)}’s weather advantage mid-turn.`
                    : `Pressure immediately while keeping ${link(weatherSetter.species)} available to restore weather as soon as the field is overwritten.`
            });
        }

        const intimidateUser = activeMons.find(mon => normKey(mon.ability) === 'intimidate');
        const burnUser = findMonWithMoves(activeMons, ['willowisp']);
        if (intimidateUser || burnUser) {
            const mitigationPartner = burnUser || activeMons.find((mon, i) => (roles[i] || []).includes('Damage Mitigation') && mon !== intimidateUser);
            rows.push({
                matchup: 'Heavy physical offense',
                mons: [intimidateUser || mitigationPartner, mitigationPartner || ace],
                lead: formatLeadPair([intimidateUser || mitigationPartner, mitigationPartner || ace], format),
                execution: `${intimidateUser ? `Cycle ${link('Intimidate')} with ${link(intimidateUser.species)}` : 'Lead the damage-mitigation slot'}${burnUser ? ` and threaten ${link('Will-O-Wisp')} from ${link(burnUser.species)}` : ''}; trade speed for survivability until their physical carry is neutralized.`
            });
        }

        const sleepUser = findMonWithMoves(activeMons, ['sleeppowder', 'spore', 'hypnosis']);
        const tauntUser = findMonWithMoves(activeMons, ['taunt', 'encore']);
        if (sleepUser || tauntUser) {
            const disruptor = sleepUser || tauntUser;
            const partner = activeMons.find((mon, i) => mon !== disruptor && (roles[i] || []).some(r => ['Wallbreaker', 'Physical Sweeper', 'Special Sweeper'].includes(r))) || ace;
            rows.push({
                matchup: 'Trick Room / setup',
                mons: [disruptor, partner],
                lead: formatLeadPair([disruptor, partner], format),
                execution: sleepUser
                    ? `Target the setter with ${link((sleepUser.moves || []).find(m => ['sleeppowder', 'spore', 'hypnosis'].includes(normKey(m))))}; use the partner’s damage to punish failed or delayed setup.`
                    : `Use ${link((tauntUser.moves || []).find(m => ['taunt', 'encore'].includes(normKey(m))))} before the opponent establishes its speed or setup engine.`
            });
        }

        const tailwindUser = findMonWithMoves(activeMons, ['tailwind']);
        const rockSlideUser = findMonWithMoves(activeMons, ['rockslide']);
        if (tailwindUser && rockSlideUser && tailwindUser !== rockSlideUser) {
            rows.push({
                matchup: 'Tailwind / hyper-speed mirror',
                mons: [tailwindUser, rockSlideUser],
                lead: formatLeadPair([tailwindUser, rockSlideUser], format),
                execution: `Match speed control with ${link('Tailwind')} while ${link(rockSlideUser.species)} applies spread ${link('Rock Slide')} pressure; preserve priority or the weather abuser for the final turns.`
            });
        }
        return rows.slice(0, 5);
    }

    function buildOperationalAdjustments(activeMons, roles, ctx) {
        const rows = [];
        const intimidateUser = activeMons.find(mon => normKey(mon.ability) === 'intimidate');
        const burnUser = findMonWithMoves(activeMons, ['willowisp']);
        if (intimidateUser || burnUser) {
            const names = [intimidateUser, burnUser].filter((mon, i, list) => mon && list.indexOf(mon) === i);
            rows.push({
                situation: 'Opponent commits heavy physical offense',
                adjustment: `Reduce pure offense and position ${joinList(names, mon => link(mon.species))}.`,
                outcome: `${intimidateUser ? 'Attack drops' : ''}${intimidateUser && burnUser ? ' plus ' : ''}${burnUser ? 'burn pressure' : ''} lower incoming physical damage and extend the team’s setup window.`
            });
        }

        const sleepUser = findMonWithMoves(activeMons, ['sleeppowder', 'spore', 'hypnosis']);
        const trAnswer = findMonWithMoves(activeMons, ['trickroom', 'taunt', 'encore', 'haze', 'clearsmog']);
        if (sleepUser || trAnswer) {
            const answer = sleepUser || trAnswer;
            const move = (answer.moves || []).find(m => ['sleeppowder', 'spore', 'hypnosis', 'trickroom', 'taunt', 'encore', 'haze', 'clearsmog'].includes(normKey(m)));
            rows.push({
                situation: 'Opponent relies on Trick Room or setup',
                adjustment: `Prioritize ${link(answer.species)} and preserve ${link(move || 'disruption')} until the setter is exposed.`,
                outcome: sleepUser ? 'Sleep denies the setup turn and creates a safe attack window.' : 'The opposing setup is prevented, reversed, or cleared before it can snowball.'
            });
        }

        const weatherSetter = activeMons.find(mon => ['sandstream', 'drought', 'drizzle', 'snowwarning'].includes(getEffectiveAbilityKey(mon, typeof getMonDb === 'function' ? getMonDb(mon) : null)))
            || findMonWithMoves(activeMons, ['sandstorm', 'sunnyday', 'raindance', 'snowscape']);
        const pivot = findMonWithMoves(activeMons, ['uturn', 'voltswitch', 'flipturn', 'partingshot', 'teleport', 'chillyreception']);
        if (weatherSetter) {
            rows.push({
                situation: 'Facing an opposing weather setter',
                adjustment: `Keep ${link(weatherSetter.species)} available in the back${pivot ? ` and bring it in through ${link(pivot.species)}’s pivot move` : ' instead of spending it at lead'} whenever possible.`,
                outcome: 'Delayed entry wins the weather exchange and restores the team’s speed, damage, or defensive weather benefits.'
            });
        }

        const lastRespectsUser = findMonWithMoves(activeMons, ['lastrespects']);
        if (lastRespectsUser) {
            rows.push({
                situation: 'Two or more teammates have fainted',
                adjustment: `Stop exposing ${link(lastRespectsUser.species)} to chip and pivot it onto the field for the endgame.`,
                outcome: `${link('Last Respects')} reaches at least <strong>150 base power</strong> after two fainted allies and continues scaling with every additional loss.`
            });
        }

        const tailwindUser = findMonWithMoves(activeMons, ['tailwind']);
        if (tailwindUser) {
            rows.push({
                situation: 'Opponent wins the natural Speed race',
                adjustment: `Lead or pivot to ${link(tailwindUser.species)} and set ${link('Tailwind')} before committing the primary attacker.`,
                outcome: 'The team gains a four-turn offensive window; avoid wasting those turns on unnecessary switches.'
            });
        }
        return rows.slice(0, 5);
    }

    function composeTeamStrategy(activeMons, roles, ctx, format) {
        if (!activeMons.length) return '<p>Add a complete team to generate an in-depth strategy.</p>';
        const rankedAces = pickTeamAces(activeMons, roles, ctx);
        const ace = rankedAces[0].mon;
        const detectedStrategies = detectTeamStrategies(activeMons, roles, ctx);
        const archetype = getTeamStrategyArchetype(activeMons, ctx, roles);
        const primaryCore = pickPrimaryCore(rankedAces, ctx);
        const coreNames = joinList(primaryCore, entry => link(entry.mon.species));
        const engine = buildEngineLayers(ace, ctx, activeMons);
        const leads = (ctx.leadMons || activeMons.slice(0, format === 'Doubles' ? 2 : 1));
        const leadNames = joinList(leads, mon => link(mon.species));
        const alternate = rankedAces.find(x => x.mon.species !== ace.species && x.roles.some(r => ['Physical Sweeper', 'Special Sweeper', 'Wallbreaker', 'Setup Sweeper'].includes(r)));
        const problems = buildProblemMatchups(ace, rankedAces, activeMons, roles, ctx);
        const leadAdjustments = buildLeadAdjustments(activeMons, roles, ctx, format, ace);
        const operationalAdjustments = buildOperationalAdjustments(activeMons, roles, ctx);
        const firstAttack = getDamagingMoves(ace).sort((a, b) => (b.ref?.power || 0) - (a.ref?.power || 0))[0];
        const archetypeAsset = getArchetypeAsset(archetype, ctx);
        const rosterCards = activeMons.map((mon, i) => {
            const monRoles = roles[i] || [];
            const keyMoves = getKeyStrategicMoves(mon);
            const isAce = mon.species === ace.species;
            return `<article class="team-strategy-mon-card ${isAce ? 'team-strategy-mon-card--ace' : ''}">
                <div class="team-strategy-mon-card__head">
                    <div class="team-strategy-mon-card__sprite-wrap">
                        <img src="${getStrategySprite(mon)}" alt="${esc(mon.species)}" class="team-strategy-mon-card__sprite">
                    </div>
                    <div class="team-strategy-mon-card__identity">
                        <strong>${esc(mon.species)}</strong>
                        <span>${mon.item && normKey(mon.item) !== 'none' ? esc(mon.item) : 'No held item'}</span>
                    </div>
                    ${isAce ? '<span class="team-strategy-ace-badge">ACE</span>' : ''}
                </div>
                <div class="team-strategy-role-row">${monRoles.slice(0, 2).map(role => `<span>${esc(role)}</span>`).join('') || '<span>Flex</span>'}</div>
                <div class="team-strategy-move-row">${keyMoves.length ? keyMoves.map(move => `<span>${esc(move)}</span>`).join('') : '<span>No moves listed</span>'}</div>
                <p>${describeRosterFunction(mon, monRoles, ctx, isAce)}</p>
            </article>`;
        }).join('');
        const sequence = [
            { label: 'Lead', text: `Open with ${leadNames}. ${(ctx.leadReasons || []).filter(Boolean).join(' ') || 'Establish immediate board control.'}`, icon: getStrategyAsset('tailwind.png') },
            { label: 'Develop', text: `${archetype.includes('Trick Room') ? 'Secure Trick Room before committing slow attackers' : archetype.includes('Stall') || archetype.includes('Attrition') ? 'Establish recovery, status, and hazard loops before taking direct trades' : archetype.includes('Setup') ? 'Remove immediate revenge tools and create one protected setup turn' : ctx.utils.tailwind ? 'Set Tailwind before committing the ace' : ctx.utils.tr ? 'Secure or reverse Trick Room before attacking' : ctx.utils.fakeout ? 'Use Fake Out to create the first safe attack' : 'Scout the response and improve positioning'}${ctx.utils.helpinghand ? '; reserve Helping Hand for a confirmed knockout' : ''}.`, icon: ctx.utils.tr ? getStrategyAsset('trick_room.png') : archetypeAsset },
            { label: 'Break', text: `Remove the opponent’s dedicated answer without exposing ${link(ace.species)} merely for neutral chip.`, icon: getStrategyAsset('move-physical.png') },
            { label: 'Close', text: `Deploy ${link(ace.species)} after checks are weakened.${alternate ? ` Pivot to ${link(alternate.mon.species)} if the primary route is blocked.` : ''}`, icon: getStrategyAsset('move-special.png') }
        ];
        const secondaryStrategyText = detectedStrategies.slice(1, 4).map(strategy => strategy.name);

        return `
            <div class="team-strategy-hero">
                <img src="${archetypeAsset}" alt="" class="team-strategy-hero__field">
                <div class="team-strategy-hero__copy">
                    <span class="team-strategy-kicker">Dynamic ${esc(format)} game plan</span>
                    <h3>${esc(archetype)}</h3>
                    <p>${esc(detectedStrategies[0].detail)} The primary core is <strong>${coreNames}</strong>, built around ${link(ace.species)} as the main win condition. ${alternate ? `${link(alternate.mon.species)} provides the alternate win route.` : 'Preserve the ace until opposing checks are weakened.'}</p>
                    <div class="team-strategy-hero__chips">
                        <span>${esc(format)}</span><span>${activeMons.length} Pokémon</span><span>${engine.length} engine layers</span>${secondaryStrategyText.map(name => `<span>${esc(name)}</span>`).join('')}
                    </div>
                </div>
                <div class="team-strategy-hero__ace">
                    <span>Primary ace</span>
                    <img src="${getStrategySprite(ace)}" alt="${esc(ace.species)}">
                    <strong>${esc(ace.species)}</strong>
                </div>
            </div>
            <div class="team-strategy-part">
                <h4><span>01</span><img src="${archetypeAsset}" alt="">Core Engine</h4>
                <p class="team-strategy-part__intro"><strong>${coreNames}</strong> form the primary core. ${detectedStrategies.slice(0, 3).map(strategy => esc(strategy.detail)).join(' ')}</p>
                <div class="team-strategy-layers">${engine.map(layer => `<article class="team-strategy-layer"><img src="${getLayerAsset(layer.label, archetype, ctx)}" alt=""><div><strong>${layer.label}</strong><p>${layer.text}</p></div></article>`).join('')}</div>
                ${firstAttack ? `<div class="team-strategy-callout"><img src="${getStrategyAsset((firstAttack.ref?.damage_class || firstAttack.ref?.category || '').toLowerCase() === 'special' ? 'move-special.png' : 'move-physical.png')}" alt=""><p><strong>Conversion point</strong><br>${link(ace.species)} closes with ${link(firstAttack.name)}${firstAttack.ref?.power ? ` · ${firstAttack.ref.power} BP` : ''} once checks enter range.</p></div>` : ''}
            </div>
            <div class="team-strategy-part">
                <h4><span>02</span><img src="${getStrategyAsset('move-status.png')}" alt="">Roster &amp; Tactical Roles</h4>
                <div class="team-strategy-roster">${rosterCards}</div>
            </div>
            <div class="team-strategy-part">
                <h4><span>03</span><img src="${ctx.utils.tr ? getStrategyAsset('trick_room.png') : getStrategyAsset('tailwind.png')}" alt="">Lead Matchup Board</h4>
                <div class="team-strategy-lead-grid">${leadAdjustments.map(row => `<article class="team-strategy-lead-card">
                    <div class="team-strategy-lead-card__top"><span>${esc(row.matchup)}</span><div>${(row.mons || []).filter((mon, i, list) => mon && list.indexOf(mon) === i).slice(0, format === 'Doubles' ? 2 : 1).map(mon => `<img src="${getStrategySprite(mon)}" alt="${esc(mon.species)}" title="${esc(mon.species)}">`).join('')}</div></div>
                    <strong>${row.lead}</strong><p>${row.execution}</p>
                </article>`).join('')}</div>
                <h5 class="team-strategy-subheading">Default game sequence</h5>
                <div class="team-strategy-flow">${sequence.map((step, i) => `<article><span>${i + 1}</span><img src="${step.icon}" alt=""><div><strong>${step.label}</strong><p>${step.text}</p></div></article>`).join('')}</div>
            </div>
            <div class="team-strategy-part">
                <h4><span>04</span><img src="${getStrategyAsset('move-status.png')}" alt="">Board-State Adjustments</h4>
                ${operationalAdjustments.length ? `<div class="team-strategy-adjust-grid">${operationalAdjustments.map(row => `<article class="team-strategy-adjust-card"><img src="${getStrategyAsset('move-status.png')}" alt=""><div><strong>${row.situation}</strong><p>${row.adjustment}</p><span>${row.outcome}</span></div></article>`).join('')}</div>` : '<p>No specialized board-state adjustment was detected; preserve the primary attacker and respond through type advantage.</p>'}
                <h5 class="team-strategy-subheading">Structural problem matchups</h5>
                ${problems.length ? `<div class="team-strategy-problem-grid">${problems.map(row => `<article class="team-strategy-problem-card"><div class="team-strategy-problem-card__icon">!</div><div><strong>${row.threat}</strong><p>${row.problem}</p><span><b>Answer</b>${row.solution}</span></div></article>`).join('')}</div>` : '<p>No major structural matchup warning was detected. Use opponent prep for set-specific counter assignments.</p>'}
            </div>`;
    }

    function composeOverview(mainMon, db, mainRoles, format, ctx, roles, activeMons) {
        const types = getMonTypes(db, mainMon).join('/') || 'Unknown';
        const speed = typeof getMonSpeed === 'function' ? getMonSpeed(mainMon, db, format) : null;
        const roleText = mainRoles.slice(0, 4).join(', ') || 'generalist';
        const archetype = inferArchetype(ctx, mainRoles);
        const weak = getWeaknessList(db, mainMon);
        const resist = getResistanceList(db, mainMon);
        const teammates = (activeMons || []).slice(1);
        const paras = [];
        const isDoubles = (format || '').toLowerCase() === 'doubles';
        const bst = parseInt(db?.Total_Stats, 10) || 0;
        const itemKey = (mainMon.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        paras.push(`<div class="build-prose-overview-hero">
            <div class="build-prose-overview-hero__sprite"><img src="${getStrategySprite(mainMon)}" alt="${esc(mainMon.species)}"></div>
            <div>
                <span class="build-prose-eyebrow">${esc(format)} build identity</span>
                <h5>${esc(mainMon.species)}</h5>
                <div class="build-prose-overview-hero__tags">
                    ${getMonTypes(db, mainMon).map(type => `<span><img src="${getStrategyAsset(`type-icons/${type.toLowerCase()}_type.png`)}" alt="">${esc(type)}</span>`).join('')}
                    <span>${esc(archetype)}</span>
                    ${speed != null ? `<span>${speed} Speed</span>` : ''}
                </div>
            </div>
        </div>`);
        paras.push(`<p>${link(mainMon.species)} is a ${joinList(getMonTypes(db, mainMon).map(t => link(t)))} ${format} Pokémon built for the Champions meta as a <strong>${archetype}</strong>. This spread is tuned as a <strong>${roleText.toLowerCase()}</strong>.</p>`);

        mainRoles.slice(0, 3).forEach(r => {
            const desc = getRoleDesc(r);
            if (desc) paras.push(`<p>${desc}</p>`);
        });

        if (bst >= 600) {
            paras.push(`<p>With a ${bst} base stat total, ${link(mainMon.species)} carries real bulk or power compared to standard Pokémon — respect its staying power and plan KOs with calc-backed lines rather than chip damage alone.</p>`);
        } else if (bst > 0 && bst < 480) {
            paras.push(`<p>${link(mainMon.species)} is statistically frail (BST ${bst}), so positioning and Protect matter more than raw trades. Avoid leaving it in on super-effective hits unless you have a KO calc or a Tera escape.</p>`);
        }

        if (mainMon.ability) {
            paras.push(`<p>${describeAbility(mainMon.ability, mainMon, mainRoles, format)}</p>`);
        }

        if (speed != null) {
            let bench = 'Compare this number to common ' + format + ' benchmarks';
            if (itemKey.includes('choicescarf')) bench = 'Choice Scarf defines this speed tier';
            else if (itemKey.includes('rusted') || itemKey.includes('rustedshield') || itemKey.includes('rustedsword')) bench = 'Speed comes from base stats and EVs — this form cannot hold a Choice Scarf';
            else if (itemKey.includes('assaultvest')) bench = 'Assault Vest locks status options but does not change Speed';
            paras.push(`<p>${speedTierNote(speed, format)} ${bench}: unboosted 100-base Pokémon near 150–170, fast Scarfers near 200+, Trick Room abusers below 50.</p>`);
        }

        if (weak.length || resist.length) {
            let def = '<p>Typing defines your defensive ceiling: ';
            if (resist.length) def += `${link(mainMon.species)} resists or ignores ${joinList(resist.slice(0, 5), t => link(t))}`;
            if (weak.length && resist.length) def += ', but ';
            else if (weak.length) def += `${link(mainMon.species)} is vulnerable to `;
            if (weak.length) def += `${joinList(weak.slice(0, 5), t => link(t))}. ${teammates.length ? 'Your recommended teammates partially cover these gaps — see Team Options below.' : 'Add teammates that switch into these typings before queueing.'}`;
            else def += ' — a relatively safe defensive profile if you avoid unknown coverage moves.';
            def += '</p>';
            paras.push(def);
        }

        composeFormatGameplay(mainMon, mainRoles, format, ctx).forEach(p => paras.push('<p>' + p + '</p>'));

        if (teammates.length) {
            paras.push(`<p>Team preview should highlight how ${link(mainMon.species)} fits with ${joinList(teammates.slice(0, 4).map(t => link(t.species)))}. ${isDoubles ? 'Doubles rewards explicit speed-control and redirection plans — declare whether this Pokémon leads or cleans late before the game starts.' : 'Singles rewards knowing which opposing Pokémon this set forces out and what you switch into afterward.'}</p>`);
        }

        const primaryRole = mainRoles[0] || 'Generalist';
        paras.push(`<p><strong>Win condition:</strong> ${getRoleDesc(primaryRole)} Execute that plan by ${isDoubles ? 'coordinating with your partner each turn — double targets, Protect reads, and Tera timing decide games more than raw damage.' : 'preserving HP until your speed or setup advantage is active, then trading aggressively into weakened teams.'}</p>`);

        return paras.join('');
    }

    function composeSetSection(mainMon, db, mainRoles, format, ctx) {
        const item = mainMon.item && mainMon.item.toLowerCase() !== 'none' ? mainMon.item : '';
        const setName = item || 'Standard';
        const moves = (mainMon.moves || []).filter(Boolean);
        const benchmarks = safeCompose('benchmarks', () => getDamageBenchmarks(mainMon, db, format), []);

        const setCard = `
        <div class="build-prose-set-card">
            <div>
                <div class="build-prose-set-card__label">Moves</div>
                <ul>${moves.map((m, i) => {
                    const ref = getMoveRef(m);
                    const category = (ref?.damage_class || ref?.category || 'status').toLowerCase();
                    const icon = category === 'physical' ? 'move-physical.png' : category === 'special' ? 'move-special.png' : 'move-status.png';
                    return `<li class="build-prose-set-move"><img src="${getStrategyAsset(icon)}" alt=""><span><span class="build-prose-move-num">Move ${i + 1}</span>${link(m)}</span></li>`;
                }).join('') || '<li>No moves parsed</li>'}</ul>
            </div>
            <div>
                <div class="build-prose-set-card__label">Set details</div>
                <ul class="build-prose-detail-list">
                    <li><img src="${getStrategyAsset('move-physical.png')}" alt=""><span><strong>Item</strong>${item ? link(item) : 'None'}</span></li>
                    <li><img src="${getStrategyAsset('move-special.png')}" alt=""><span><strong>Ability</strong>${mainMon.ability ? link(mainMon.ability) : '—'}</span></li>
                    <li><img src="${getStrategyAsset('move-status.png')}" alt=""><span><strong>Nature</strong>${esc(mainMon.nature || 'Serious')}</span></li>
                    <li><img src="${getStrategyAsset('tailwind.png')}" alt=""><span><strong>EV spread</strong>${esc(formatEvSpread(mainMon.evs))}</span></li>
                    ${mainMon.tera && mainMon.tera !== 'Normal' ? `<li><img src="${getStrategyAsset(`type-icons/tera_type_${mainMon.tera.toLowerCase()}.png`)}" alt=""><span><strong>Tera Type</strong>${link(mainMon.tera)}</span></li>` : ''}
                </ul>
            </div>
        </div>`;

        const moveAnalysis = moves.length
            ? `<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Move breakdown</h5>${moves.map(m =>
                `<p class="build-prose-move-para">${describeMoveSlot(m, mainMon, db, format)}</p>`
            ).join('')}</div>`
            : '';

        const deepProse = composeDeepSetProse(mainMon, db, mainRoles, format, ctx, benchmarks);

        return { setName, html: setCard + deepProse + moveAnalysis };
    }

    function composeTeamSection(mainMon, teammates, roles, ctx, format, matchedSynergy) {
        if (!teammates.length) {
            return '<p>Shuffle or accept recommended teammates to populate full synergy and meta matchup analysis.</p>';
        }

        const mainRoles = roles[0] || [];
        const leadPair = typeof describeLeadPair === 'function' ? describeLeadPair(ctx, [mainMon, ...teammates], roles) : { summary: '' };
        let html = `<div class="build-prose-core-banner">
            <img src="${getStrategySprite(mainMon)}" alt="${esc(mainMon.species)}">
            <div><span class="build-prose-eyebrow">Recommended core</span><strong>${link(mainMon.species)} + ${joinList(teammates.slice(0, 3).map(t => link(t.species)))}</strong><p>${leadPair.summary || `${teammates.length} teammates support this ${format} build.`}</p></div>
            <div class="build-prose-core-banner__team">${teammates.slice(0, 5).map(t => `<img src="${getStrategySprite(t)}" alt="${esc(t.species)}" title="${esc(t.species)}">`).join('')}</div>
        </div>`;

        html += `<p>In ${format}, team synergy is not just type coverage — it is turn order, redirection, and speed control working together. ${link(mainMon.species)} should know which partner sets snow, Tailwind, or Trick Room before you click moves, because this set's damage moves assume those conditions when applicable.</p>`;

        if (matchedSynergy?.length) {
            html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Team archetypes detected</h5><ul class="build-prose-bullet-list">';
            matchedSynergy.forEach(r => {
                html += `<li><strong>${esc(r.text)}</strong> — ${esc(r.tip)}</li>`;
            });
            html += '</ul></div>';
        }

        html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Teammate roles</h5><div class="build-prose-teammate-grid">';
        teammates.forEach((t, i) => {
            html += explainTeammateFit(mainMon, t, mainRoles, roles[i + 1] || [], ctx, i);
        });
        html += '</div></div>';

        if (ctx.leadReasons?.length) {
            html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Lead options</h5><ul class="build-prose-bullet-list">';
            ctx.leadMons?.forEach((lead, i) => {
                const reason = ctx.leadReasons[i] || 'Flexible lead';
                html += `<li>${link(lead?.species)} — ${esc(reason)}</li>`;
            });
            html += '</ul></div>';
        }

        return html;
    }

    function composeChecksSection(mainMon, db, mainRoles, threatResults) {
        const weak = getWeaknessList(db, mainMon);
        const moves = (mainMon.moves || []).map(m => normKey(m));
        let html = '';

        html += `<div class="build-prose-checks-banner">
            <div class="build-prose-checks-banner__visual">
                <img src="${getStrategySprite(mainMon)}" alt="${esc(mainMon.species)}">
                <img src="${getStrategyAsset('move-status.png')}" alt="">
            </div>
            <div>
                <span class="build-prose-eyebrow">Defensive risk profile</span>
                <strong>Plan around ${weak.length ? weak.length : 'unknown'} pressure type${weak.length === 1 ? '' : 's'}</strong>
                <div>${weak.slice(0, 6).map(type => `<span><img src="${getStrategyAsset(`type-icons/${type}_type.png`)}" alt="">${esc(capitalize(type))}</span>`).join('') || '<span>Neutral coverage</span>'}</div>
            </div>
        </div>`;
        html += '<p><strong>What threatens this set:</strong> ';
        html += `${link(mainMon.species)} is pressured by ${weak.length ? joinList(weak.map(t => link(t))) : 'common coverage types'}. `;
        if (mainRoles.includes('Physical Sweeper') || mainRoles.includes('Wallbreaker')) {
            html += 'Intimidate users, Will-O-Wisp, and priority (Sucker Punch, Extreme Speed, Bullet Punch) often stop a sweep before it starts. Faster Choice Scarf revenge killers capitalize on a locked or boosted position.';
        } else if (mainRoles.includes('Special Sweeper')) {
            html += 'Assault Vest tanks, faster special attackers, and priority revenge kills punish a failed prediction. Status — especially paralysis — permanently reduces the value of a speed-invested spread.';
        } else if (mainRoles.includes('Redirection') || mainRoles.includes('Fake Out Pressure')) {
            html += 'Once redirection or Fake Out pressure is spent, spread Ghost-, Dark-, or Fairy attacks can hit your back line freely. Taunt and Imprison shut down support before it activates.';
        } else if (moves.includes('auroraveil') || mainRoles.includes('Screener')) {
            html += 'Taunt, Defog, and Brick Break remove screens; a fast attacker that OHKOs before Aurora Veil goes up ends the strategy immediately.';
        } else {
            html += 'Residual damage, status, and super-effective coverage from common meta types force switches — never assume a neutral turn is safe.';
        }
        html += '</p>';

        html += '<p><strong>Common counters to respect:</strong> ';
        const counterHints = [];
        weak.forEach(w => {
            if (w === 'fire') counterHints.push(`${link('Fire')}-type wallbreakers and Sun teams`);
            if (w === 'fighting') counterHints.push(`${link('Fighting')}-type attackers and Close Combat users`);
            if (w === 'rock') counterHints.push(`${link('Rock')}-type priority and Stealth Rock chip`);
            if (w === 'steel') counterHints.push(`${link('Steel')}-types that resist STAB`);
            if (w === 'steel' || w === 'fairy') counterHints.push('Poison and Steel coverage');
        });
        if ((mainMon.item || '').toLowerCase().includes('choice')) {
            counterHints.push('Protect scouting and pivoting into a resist while locked');
        }
        html += (counterHints.length ? [...new Set(counterHints)].slice(0, 4).join('; ') : 'Bulky pivots and faster sweepers in the current meta') + '.</p>';

        if (threatResults?.length) {
            const pressures = [];
            threatResults.forEach(t => {
                const hit = t.defensiveHits?.find(d => d.species === mainMon.species && parseFloat(d.maxPercent) >= 40);
                if (hit) pressures.push({ threat: t.name, hit, rank: t.rank });
            });
            if (pressures.length) {
                html += '<p><strong>Calc-backed meta pressure:</strong> ';
                html += pressures.sort((a, b) => a.rank - b.rank).slice(0, 5).map(p =>
                    `${link(p.threat)} (#${p.rank}) — ${link(p.hit.move)} for ${p.hit.maxPercent}%`
                ).join('; ');
                html += '. Position around these threats or preserve Tera to survive a calculated hit.</p>';
            }
        }

        html += '<p><strong>How teammates cover you:</strong> Pair with Pokémon that resist your weaknesses and offer speed control or redirection so ' + link(mainMon.species) + ' can attack without taking a fatal hit. If the team lacks a hard answer to a top meta threat, treat that as a team-building gap rather than a single-set flaw.</p>';

        return html;
    }

    function composeAlternates(species, format, buildId) {
        const alts = findAlternateBuilds(species, format, buildId);
        if (!alts.length) return '';
        let html = '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Other sets in library</h5><ul class="build-prose-bullet-list">';
        alts.forEach(b => {
            const p = typeof parseAnalysisBuild === 'function' ? parseAnalysisBuild(b.build) : null;
            const item = p?.item && p.item.toLowerCase() !== 'none' ? p.item : 'no item';
            html += `<li>Build #${esc(b.id)} — ${link(item)} (${(p?.moves || []).filter(Boolean).slice(0, 2).join(', ') || 'moves vary'})</li>`;
        });
        html += '</ul><p class="build-prose-note">Swap sets from the build dropdown or library to compare roles.</p></div>';
        return html;
    }

    BN.composeMetaSection = function (threatResults, format, mainMon, activeMons) {
        if (!threatResults?.length) {
            return '<p>No ranked meta data available for this format.</p>';
        }

        const critical = threatResults.filter(t => t.dangerLevel === 'critical');
        const covered = threatResults.filter(t => t.dangerLevel === 'covered');
        const warnings = threatResults.filter(t => t.dangerLevel === 'warning');
        const topThreats = threatResults.slice(0, 8);
        let html = '';

        html += '<p>';
        if (critical.length) {
            html += 'Against the current <strong>' + esc(format) + '</strong> meta, this team has <strong class="analysis-highlight analysis-highlight--danger">' + critical.length + ' critical gap' + (critical.length > 1 ? 's' : '') + '</strong> versus staples such as ' + joinList(critical.slice(0, 3).map(t => link(t.name))) + '. ';
            html += 'Address these before tournament prep — consider adding a dedicated check, speed control, or Tera answer.</p>';
        } else if (covered.length >= 3) {
            html += 'This core handles several top threats well, including ' + joinList(covered.slice(0, 3).map(t => link(t.name))) + '. ';
            html += 'Focus on positioning and preserving your fastest answers for endgame.</p>';
        } else {
            html += 'Matchups are mixed across the ' + esc(format) + ' field — no single gap dominates, but Tera timing and lead selection decide most games.</p>';
        }

        html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Key meta interactions</h5>';
        topThreats.forEach(t => {
            const statusCls = t.dangerLevel === 'critical' ? 'danger' : t.dangerLevel === 'covered' ? 'good' : 'warn';
            const statusLabel = t.dangerLevel === 'critical' ? 'Gap' : t.dangerLevel === 'covered' ? 'Covered' : t.dangerLevel === 'warning' ? 'Caution' : 'Neutral';

            let para = '<p class="build-prose-matchup build-prose-matchup--' + statusCls + '">';
            para += `<img src="${getStrategySprite({ species: t.name })}" alt="${esc(t.name)}" class="build-prose-matchup__sprite">`;
            para += '<span class="build-prose-matchup__rank">#' + t.rank + '</span> ';
            para += '<strong>' + link(t.name) + '</strong> <span class="build-prose-matchup__tag">' + statusLabel + '</span> — ';

            if (t.bestTeamAnswer) {
                const ans = t.bestTeamAnswer;
                const speedNote = ans.outspeedsThreat ? 'outspeeds' : ans.underspeedsThreat ? 'underspeeds' : 'ties speed with';
                para += `Best team answer: ${link(ans.species)} with ${link(ans.move)} (${ans.minPercent}–${ans.maxPercent}%${ans.koLabel ? ', ' + ans.koLabel.toLowerCase() : ''}). `;
                para += `${link(ans.species)} ${speedNote} this threat. `;
            } else if (t.teamCanHitSE > 0) {
                para += `Type chart gives ${t.teamCanHitSE} super-effective answer${t.teamCanHitSE > 1 ? 's' : ''}, but calc data is limited. `;
            } else {
                para += `No reliable offensive answer in the current six — add coverage or a faster check. `;
            }

            if (t.worstThreatHit) {
                const hit = t.worstThreatHit;
                para += `Defensively, ${link(t.name)} can hit ${link(hit.species)} for up to ${hit.maxPercent}% with ${link(hit.move)}`;
                if (hit.threatOutspeeds) para += ' before your check moves';
                para += '. ';
            }

            if (t.teammateCounters?.filter(c => c.neutralizesCheck).length) {
                const victims = t.teammateCounters.filter(c => c.neutralizesCheck).map(c => link(c.victim)).join(', ');
                para += `Warning: this threat can remove your checks (${victims}) if it outspeeds.`;
            }

            para += '</p>';
            html += para;
        });
        html += '</div>';

        if (warnings.length && !critical.length) {
            html += `<p class="build-prose-note">${warnings.length} matchup${warnings.length > 1 ? 's' : ''} need caution — rely on positioning rather than hard counters.</p>`;
        }

        return html;
    };

    function setProseSection(sectionId, bodyId, html) {
        const body = document.getElementById(bodyId);
        const section = document.getElementById(sectionId) || body?.closest('.build-prose-section');
        if (body) body.innerHTML = html || '';
        if (section) section.style.display = (html && String(html).trim()) ? '' : 'none';
    }

    BN.getStrategySpriteUrl = getStrategySprite;

    BN.inspectTeamStrategy = function (activeMons, roles, ctx) {
        const safeMons = activeMons || [];
        const safeRoles = roles || safeMons.map(() => []);
        const safeCtx = ctx || { utils: {}, speedTiers: {}, teamSize: safeMons.length, flatRoles: safeRoles.flat() };
        const strategies = safeMons.length ? detectTeamStrategies(safeMons, safeRoles, safeCtx) : [];
        const rankedAces = pickTeamAces(safeMons, safeRoles, safeCtx);
        const core = pickPrimaryCore(rankedAces, safeCtx);
        return {
            archetype: strategies[0]?.name || '',
            strategies: strategies.map(strategy => strategy.name),
            ace: rankedAces[0]?.mon?.species || '',
            core: core.map(entry => entry.mon.species),
            aceScores: rankedAces.map(entry => ({ species: entry.mon.species, score: Math.round(entry.score) }))
        };
    };

    BN.renderFullAnalysis = function (mainMon, activeMons, format, ctx, roles, options = {}) {
        const panel = document.getElementById('build-prose-panel');
        if (!panel || !mainMon?.species) return;

        panel.style.display = 'block';
        const dashboard = document.getElementById('analysis-dashboard');
        if (dashboard) dashboard.classList.add('synergy-analysis-active');

        const analysisMode = panel.dataset.analysisMode || (window.location.pathname.toLowerCase().includes('/teambuilder/') ? 'team' : 'build');
        const panelTitle = panel.querySelector('.build-prose-panel__title');
        if (panelTitle) panelTitle.textContent = analysisMode === 'team' ? 'Team Analysis' : 'Build Analysis';

        const fmtEl = document.getElementById('build-prose-format');
        if (fmtEl) fmtEl.textContent = format;

        setProseSection('build-prose-section-strategy', 'build-prose-strategy',
            safeCompose('strategy', () => composeTeamStrategy(activeMons, roles, ctx, format), '<p>Team strategy analysis unavailable.</p>'));

        // Team Builder intentionally renders only roster-level strategy. Set-specific
        // prose remains exclusive to the Builds page, though both use this module.
        if (analysisMode === 'team') return;

        const db = typeof getMonDb === 'function' ? getMonDb(mainMon) : null;
        const mainRoles = roles[0] || [];
        const teammates = activeMons.slice(1);
        const matchedSynergy = options.matchedSynergy || [];

        const setSection = safeCompose('set', () => composeSetSection(mainMon, db, mainRoles, format, ctx), { setName: 'Standard', html: '<p>Set analysis unavailable.</p>' });
        const setTitleEl = document.getElementById('build-prose-set-title');
        if (setTitleEl) setTitleEl.innerHTML = `<img src="${getStrategyAsset('move-physical.png')}" alt="">${esc(setSection.setName)} Set`;

        setProseSection('build-prose-section-overview', 'build-prose-overview',
            safeCompose('overview', () => composeOverview(mainMon, db, mainRoles, format, ctx, roles, activeMons), `<p>${link(mainMon.species)} — analysis loading.</p>`));
        setProseSection('build-prose-section-set', 'build-prose-set', setSection.html);
        setProseSection('build-prose-section-checks', 'build-prose-checks',
            safeCompose('checks', () => composeChecksSection(mainMon, db, mainRoles, options.threatResults || null), '<p>Checks analysis loading.</p>'));
        setProseSection('build-prose-section-teammates', 'build-prose-teammates',
            safeCompose('teammates', () => composeTeamSection(mainMon, teammates, roles, ctx, format, matchedSynergy), '<p>Add teammates for synergy analysis.</p>'));
        setProseSection('build-prose-section-meta', 'build-prose-meta', '<p class="analysis-section-note">Calculating meta matchup summary…</p>');

        const altHtml = safeCompose('alternates', () => composeAlternates(mainMon.species, format, options.buildId), '');
        setProseSection('build-prose-section-alternates', 'build-prose-alternates', altHtml);
    };

    BN.updateMetaSection = function (threatResults, format, mainMon, activeMons, roles) {
        const metaEl = document.getElementById('build-prose-meta');
        if (metaEl) {
            metaEl.innerHTML = BN.composeMetaSection(threatResults, format, mainMon, activeMons);
        }
        const checksEl = document.getElementById('build-prose-checks');
        if (checksEl && mainMon) {
            const db = typeof getMonDb === 'function' ? getMonDb(mainMon) : null;
            checksEl.innerHTML = composeChecksSection(mainMon, db, (roles && roles[0]) || [], threatResults);
        }
    };

    global.BuildNarrative = BN;
})(typeof globalThis !== 'undefined' ? globalThis : this);
