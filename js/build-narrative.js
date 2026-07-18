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
        const battle = ref?.battle || {};
        const parts = [];

        let role = isStab ? 'STAB' : 'coverage';
        if (power === 0 || category === 'Status') role = 'utility';
        if (battle.spread) role = 'spread damage';
        if (battle.priority || (ref?.priority > 0)) role = 'priority';

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
        return `<p>${link(teammate.species)} (${primaryRole}) ${reasons.join(', ')}${movePreview ? ` — key tools: ${movePreview}` : ''}.</p>`;
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
                <ul>${moves.map((m, i) => `<li><span class="build-prose-move-num">Move ${i + 1}:</span> ${link(m)}</li>`).join('') || '<li>No moves parsed</li>'}</ul>
            </div>
            <div>
                <div class="build-prose-set-card__label">Set details</div>
                <ul>
                    <li><strong>Item:</strong> ${item ? link(item) : 'None'}</li>
                    <li><strong>Ability:</strong> ${mainMon.ability ? link(mainMon.ability) : '—'}</li>
                    <li><strong>Nature:</strong> ${mainMon.nature || 'Serious'}</li>
                    <li><strong>EVs:</strong> ${formatEvSpread(mainMon.evs)}</li>
                    ${mainMon.tera && mainMon.tera !== 'Normal' ? `<li><strong>Tera Type:</strong> ${link(mainMon.tera)}</li>` : ''}
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
        let html = `<p><strong>Recommended core:</strong> ${joinList(teammates.map(t => link(t.species)))} round out this ${format} team around ${link(mainMon.species)}. ${leadPair.summary}</p>`;

        html += `<p>In ${format}, team synergy is not just type coverage — it is turn order, redirection, and speed control working together. ${link(mainMon.species)} should know which partner sets snow, Tailwind, or Trick Room before you click moves, because this set's damage moves assume those conditions when applicable.</p>`;

        if (matchedSynergy?.length) {
            html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Team archetypes detected</h5><ul class="build-prose-bullet-list">';
            matchedSynergy.forEach(r => {
                html += `<li><strong>${esc(r.text)}</strong> — ${esc(r.tip)}</li>`;
            });
            html += '</ul></div>';
        }

        html += '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Teammate roles</h5>';
        teammates.forEach((t, i) => {
            html += explainTeammateFit(mainMon, t, mainRoles, roles[i + 1] || [], ctx, i);
        });
        html += '</div>';

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

    BN.renderFullAnalysis = function (mainMon, activeMons, format, ctx, roles, options = {}) {
        const panel = document.getElementById('build-prose-panel');
        if (!panel || !mainMon?.species) return;

        panel.style.display = 'block';
        const dashboard = document.getElementById('analysis-dashboard');
        if (dashboard) dashboard.classList.add('synergy-analysis-active');

        const db = typeof getMonDb === 'function' ? getMonDb(mainMon) : null;
        const mainRoles = roles[0] || [];
        const teammates = activeMons.slice(1);
        const matchedSynergy = options.matchedSynergy || [];

        const fmtEl = document.getElementById('build-prose-format');
        if (fmtEl) fmtEl.textContent = format;

        const setSection = safeCompose('set', () => composeSetSection(mainMon, db, mainRoles, format, ctx), { setName: 'Standard', html: '<p>Set analysis unavailable.</p>' });
        const setTitleEl = document.getElementById('build-prose-set-title');
        if (setTitleEl) setTitleEl.textContent = `${setSection.setName} Set`;

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
