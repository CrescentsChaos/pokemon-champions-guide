/**
 * Smogon-style dynamic build narrative composer.
 * Requires analysis.js globals (detectRole, getMonDb, linkMon, etc.)
 */
(function (global) {
    const BN = {};

    function esc(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        if (mon?.tera && mon.tera !== 'Normal') return [mon.tera];
        return [db?.Type_1, db?.Type_2].filter(Boolean);
    }

    function formatEvSpread(evs) {
        if (typeof window.formatEvLine === 'function') return window.formatEvLine(evs);
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
        const types = getMonTypes(db, mon);
        const moveType = ref?.type || 'Normal';
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
        const types = getMonTypes(db, mon);
        if (typeof getWeaknesses === 'function') return getWeaknesses(types.map(t => t.toLowerCase()));
        return [];
    }

    function getResistanceList(db, mon) {
        const types = getMonTypes(db, mon);
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

    function composeOverview(mainMon, db, mainRoles, format, ctx) {
        const types = getMonTypes(db, mainMon).join('/') || 'Unknown';
        const speed = typeof getMonSpeed === 'function' ? getMonSpeed(mainMon, db) : null;
        const roleText = mainRoles.slice(0, 4).join(', ') || 'generalist';
        const archetype = inferArchetype(ctx, mainRoles);
        const weak = getWeaknessList(db, mainMon);
        const resist = getResistanceList(db, mainMon);
        const paras = [];

        const roleBlurbs = mainRoles.slice(0, 2).map(r => roleDescriptions?.[r] || r).filter(Boolean);
        paras.push(`<p>${link(mainMon.species)} is a ${link(types)} ${format.toLowerCase()} Pokémon positioned as a <strong>${archetype}</strong> within the current Champions meta. This spread emphasizes <strong>${roleText.toLowerCase()}</strong>${roleBlurbs.length ? ' — ' + roleBlurbs.join(' ') : ''}.</p>`);

        if (mainMon.ability) {
            paras.push(`<p>${describeAbility(mainMon.ability, mainMon, mainRoles, format)}</p>`);
        }

        if (speed != null) {
            paras.push(`<p>${speedTierNote(speed, format)}</p>`);
        }

        if (weak.length || resist.length) {
            let def = '<p>Defensively, ';
            if (resist.length) def += `it resists or ignores ${resist.slice(0, 4).map(t => link(t)).join(', ')}`;
            if (weak.length && resist.length) def += '; however, ';
            else if (weak.length) def += 'it ';
            if (weak.length) def += `watch for ${weak.slice(0, 4).map(t => link(t)).join(', ')} — pair with teammates that switch into those typings or use Tera to flip a bad matchup.`;
            else def += '.';
            def += '</p>';
            paras.push(def);
        }

        return paras.join('');
    }

    function composeSetSection(mainMon, db, mainRoles, format, ctx) {
        const item = mainMon.item && mainMon.item.toLowerCase() !== 'none' ? mainMon.item : '';
        const setName = item || 'Standard';
        const moves = (mainMon.moves || []).filter(Boolean);
        const evLine = formatEvSpread(mainMon.evs);
        const intents = evIntent(mainMon.evs, mainRoles);

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
                    <li><strong>EVs:</strong> ${evLine}</li>
                    ${mainMon.tera && mainMon.tera !== 'Normal' ? `<li><strong>Tera Type:</strong> ${link(mainMon.tera)}</li>` : ''}
                </ul>
            </div>
        </div>`;

        const moveAnalysis = moves.length
            ? `<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Move breakdown</h5>${moves.map(m =>
                `<p class="build-prose-move-para">${describeMoveSlot(m, mainMon, db, format)}</p>`
            ).join('')}</div>`
            : '';

        const spreadBlock = `
        <div class="build-prose-subblock">
            <h5 class="build-prose-subtitle">EV spread &amp; nature</h5>
            <p><strong>${mainMon.nature || 'Serious'}</strong> nature — ${natureAnalysis(mainMon.nature, mainMon.evs)} The ${evLine} spread targets ${intents.join(', ') || 'balanced benchmarks'}.</p>
        </div>`;

        const itemBlock = `<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Item</h5><p>${describeItem(item, mainMon, mainRoles, moves, format)}</p></div>`;

        const teraBlock = mainMon.tera && mainMon.tera !== 'Normal'
            ? `<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Terastallization</h5><p>${describeTera(mainMon, mainRoles)}</p></div>`
            : '';

        return { setName, html: setCard + moveAnalysis + spreadBlock + itemBlock + teraBlock };
    }

    function composeTeamSection(mainMon, teammates, roles, ctx, format, matchedSynergy) {
        if (!teammates.length) {
            return '<p>Shuffle or accept recommended teammates to populate full synergy and meta matchup analysis.</p>';
        }

        const mainRoles = roles[0] || [];
        const leadPair = typeof describeLeadPair === 'function' ? describeLeadPair(ctx, [mainMon, ...teammates], roles) : { summary: '' };
        let html = `<p><strong>Recommended core:</strong> ${teammates.map(t => link(t.species)).join(', ')} complement ${link(mainMon.species)} in the library team builder. ${leadPair.summary}</p>`;

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
        let html = '<div class="build-prose-subblock"><h5 class="build-prose-subtitle">Defensive profile</h5>';
        html += `<p>${link(mainMon.species)} is pressured by ${weak.length ? weak.map(t => link(t)).join(', ') : 'common coverage types'}. `;
        if (mainRoles.includes('Physical Sweeper') || mainRoles.includes('Wallbreaker')) {
            html += 'Intimidate, priority (Sucker Punch, Extreme Speed), and bulky pivots often end a sweep before it starts.';
        } else if (mainRoles.includes('Special Sweeper')) {
            html += 'Assault Vest tanks, priority, and faster special attackers can revenge kill after a lock or setup turn.';
        } else if (mainRoles.includes('Redirection') || mainRoles.includes('Fake Out Pressure')) {
            html += 'Once redirection is gone, Ghost-, Dark-, or spread attackers can target your back line freely.';
        } else {
            html += 'Status, hazards, and super-effective coverage remain the primary ways to force it out.';
        }
        html += '</p></div>';

        if (threatResults?.length) {
            const pressures = [];
            threatResults.forEach(t => {
                const hit = t.defensiveHits?.find(d => d.species === mainMon.species && parseFloat(d.maxPercent) >= 50);
                if (hit) pressures.push({ threat: t.name, hit });
            });
            if (pressures.length) {
                html += '<p><strong>Meta pressure:</strong> ';
                html += pressures.slice(0, 4).map(p =>
                    `${link(p.threat)} threatens with ${link(p.hit.move)} (${p.hit.maxPercent}% on ${link(mainMon.species)})`
                ).join('; ');
                html += '.</p>';
            }
        }
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
            html += 'Against the current <strong>' + esc(format) + '</strong> meta, this team has <strong class="analysis-highlight analysis-highlight--danger">' + critical.length + ' critical gap' + (critical.length > 1 ? 's' : '') + '</strong> versus staples such as ' + critical.slice(0, 3).map(t => link(t.name)).join(', ') + '. ';
            html += 'Address these before tournament prep — consider adding a dedicated check, speed control, or Tera answer.</p>';
        } else if (covered.length >= 3) {
            html += 'This core handles several top threats well, including ' + covered.slice(0, 3).map(t => link(t.name)).join(', ') + '. ';
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

    BN.renderFullAnalysis = function (mainMon, activeMons, format, ctx, roles, options = {}) {
        const panel = document.getElementById('build-prose-panel');
        if (!panel || !mainMon?.species) return;

        panel.style.display = 'block';
        const db = typeof getMonDb === 'function' ? getMonDb(mainMon) : null;
        const mainRoles = roles[0] || [];
        const teammates = activeMons.slice(1);
        const matchedSynergy = options.matchedSynergy || [];

        const fmtEl = document.getElementById('build-prose-format');
        if (fmtEl) fmtEl.textContent = format;

        const setSection = composeSetSection(mainMon, db, mainRoles, format, ctx);
        const setTitleEl = document.getElementById('build-prose-set-title');
        if (setTitleEl) setTitleEl.textContent = `${setSection.setName} Set`;

        const sections = {
            'build-prose-overview': composeOverview(mainMon, db, mainRoles, format, ctx),
            'build-prose-set': setSection.html,
            'build-prose-teammates': composeTeamSection(mainMon, teammates, roles, ctx, format, matchedSynergy),
            'build-prose-checks': composeChecksSection(mainMon, db, mainRoles, options.threatResults || null),
            'build-prose-alternates': composeAlternates(mainMon.species, format, options.buildId),
            'build-prose-meta': '<p class="analysis-section-note">Calculating meta matchup summary…</p>'
        };

        Object.entries(sections).forEach(([id, html]) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });

        const altSection = document.querySelector('.build-prose-section--compact');
        if (altSection) {
            altSection.style.display = sections['build-prose-alternates'] ? '' : 'none';
        }
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
