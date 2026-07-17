/**
 * Local mega sprite catalog + URL helpers.
 * Champions-exclusive / missing Showdown megas live in assets/mega-sprites/.
 * Prefer those GIFs before remote Showdown URLs.
 */
(function (global) {
    const LOCAL_MEGA_SPRITES = new Set([
        'absol-mega-z',
        'barbaracle-mega',
        'baxcalibur-mega',
        'chandelure-mega',
        'chesnaught-mega',
        'chimecho-mega',
        'clefable-mega',
        'crabominable-mega',
        'darkrai-mega',
        'delphox-mega',
        'dragalge-mega',
        'drampa-mega',
        'eelektross-mega',
        'emboar-mega',
        'excadrill-mega',
        'falinks-mega',
        'feraligatr-mega',
        'floette-eternal-mega',
        'froslass-mega',
        'garchomp-mega-z',
        'glimmora-mega',
        'golisopod-mega',
        'golurk-mega',
        'greninja-mega',
        'hawlucha-mega',
        'heatran-mega',
        'lucario-mega-z',
        'magearna-mega',
        'malamar-mega',
        'meganium-mega',
        'meowstic-f-mega',
        'meowstic-m-mega',
        'pyroar-mega',
        'raichu-mega-x',
        'raichu-mega-y',
        'scolipede-mega',
        'scovillain-mega',
        'scrafty-mega',
        'skarmory-mega',
        'staraptor-mega',
        'starmie-mega',
        'tatsugiri-mega',
        'victreebel-mega',
        'zeraora-mega',
        'zygarde-mega'
    ]);

    function getAssetPrefix() {
        const path = (typeof location !== 'undefined' && location.pathname) ? location.pathname.toLowerCase() : '';
        const nested = [
            '/pokedex/', '/movedex/', '/abilitydex/', '/itemdex/',
            '/calc/', '/builds/', '/teambuilder/', '/compare/', '/counter/'
        ];
        return nested.some(d => path.includes(d)) ? '../' : '';
    }

    function cleanSpeciesSlug(species) {
        return (species || '')
            .toLowerCase()
            .replace(/ /g, '-')
            .replace(/\./g, '')
            .replace(/'/g, '')
            .replace(/:/g, '')
            .replace(/[^a-z0-9%-]/g, '');
    }

    function stripMegaSuffix(slug) {
        return (slug || '')
            .replace(/-mega-[xyz]$/, '')
            .replace(/-megax$/, '')
            .replace(/-megay$/, '')
            .replace(/-megaz$/, '')
            .replace(/-mega$/, '')
            .replace(/-primal$/, '');
    }

    /** @returns {'mega'|'mega-x'|'mega-y'|'mega-z'|'primal'|null} */
    function megaFormSuffixFromItem(item) {
        const it = (item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!it || it === 'eviolite' || it === 'meteorite') return null;
        if (it === 'redorb' || it === 'blueorb') return 'primal';
        if (it.endsWith('itex')) return 'mega-x';
        if (it.endsWith('itey')) return 'mega-y';
        if (it.endsWith('itez')) return 'mega-z';
        if (it.endsWith('ite')) return 'mega';
        return null;
    }

    /** Infer form suffix from a failed remote sprite URL. */
    function megaFormSuffixFromUrl(url) {
        const src = (url || '').toLowerCase();
        if (!src.includes('mega') && !src.includes('primal')) return null;
        if (src.includes('mega-x') || src.includes('megax')) return 'mega-x';
        if (src.includes('mega-y') || src.includes('megay')) return 'mega-y';
        if (src.includes('mega-z') || src.includes('megaz')) return 'mega-z';
        if (src.includes('primal')) return 'primal';
        return 'mega';
    }

    function megaFormSuffixFromSpecies(species) {
        const slug = cleanSpeciesSlug(species);
        if (/-mega-x$|-megax$/.test(slug)) return 'mega-x';
        if (/-mega-y$|-megay$/.test(slug)) return 'mega-y';
        if (/-mega-z$|-megaz$/.test(slug)) return 'mega-z';
        if (/-primal$/.test(slug)) return 'primal';
        if (/-mega$/.test(slug)) return 'mega';
        return null;
    }

    function candidateBasenames(species, formSuffix) {
        const suffix = formSuffix || 'mega';
        let slug = stripMegaSuffix(cleanSpeciesSlug(species));
        const out = [];

        // Meowstic gender variants
        if (slug === 'meowstic-f' || slug === 'meowsticfemale' || slug === 'meowstic-female') {
            out.push('meowstic-f-mega');
        } else if (slug === 'meowstic-m' || slug === 'meowsticmale' || slug === 'meowstic-male') {
            out.push('meowstic-m-mega');
        } else if (slug === 'meowstic') {
            out.push('meowstic-m-mega', 'meowstic-f-mega');
        }

        // Floette Eternal
        if (slug.includes('floette') && slug.includes('eternal')) {
            out.push('floette-eternal-mega');
            slug = 'floette-eternal';
        }

        out.push(`${slug}-${suffix}`);

        // Z-form local files use mega-z; some callers pass megaz
        if (suffix === 'mega-z') out.push(`${slug}-mega-z`);
        if (suffix === 'mega-x') out.push(`${slug}-mega-x`);
        if (suffix === 'mega-y') out.push(`${slug}-mega-y`);

        return out;
    }

    function resolveLocalMegaBasename(species, formSuffix) {
        const candidates = candidateBasenames(species, formSuffix || 'mega');
        for (const key of candidates) {
            if (LOCAL_MEGA_SPRITES.has(key)) return key;
        }
        return null;
    }

    function hasLocalMegaSprite(species, formSuffix) {
        return !!resolveLocalMegaBasename(species, formSuffix);
    }

    function getLocalMegaSpriteUrl(species, formSuffix, prefix) {
        const base = resolveLocalMegaBasename(species, formSuffix);
        if (!base) return null;
        const pfx = prefix != null ? prefix : getAssetPrefix();
        return `${pfx}assets/mega-sprites/${base}.gif`;
    }

    /**
     * Showdown ani URL for a mega/primal form.
     * Uses megax/megay/megaz (no hyphen before letter).
     */
    function getShowdownMegaSpriteUrl(species, formSuffix, shiny) {
        let slug = stripMegaSuffix(cleanSpeciesSlug(species));
        const folder = shiny ? 'ani-shiny' : 'ani';
        let sdSuffix = '-mega';
        if (formSuffix === 'mega-x') sdSuffix = '-megax';
        else if (formSuffix === 'mega-y') sdSuffix = '-megay';
        else if (formSuffix === 'mega-z') sdSuffix = '-megaz';
        else if (formSuffix === 'primal') sdSuffix = '-primal';
        return `https://play.pokemonshowdown.com/sprites/${folder}/${slug}${sdSuffix}.gif`;
    }

    /**
     * Prefer local mega GIF when we ship one; otherwise Showdown.
     */
    function resolveMegaSpriteUrl(species, itemOrSuffix, options = {}) {
        const { shiny = false, prefix = getAssetPrefix(), preferLocal = true } = options;
        let formSuffix = null;
        if (itemOrSuffix && typeof itemOrSuffix === 'string' && /^(mega|mega-[xyz]|primal)$/.test(itemOrSuffix)) {
            formSuffix = itemOrSuffix;
        } else {
            formSuffix = megaFormSuffixFromItem(itemOrSuffix) || megaFormSuffixFromSpecies(species);
        }
        if (!formSuffix) return null;

        if (preferLocal) {
            const local = getLocalMegaSpriteUrl(species, formSuffix, prefix);
            if (local) return local;
        }
        return getShowdownMegaSpriteUrl(species, formSuffix, shiny);
    }

    /**
     * First fallback for a failed remote mega sprite → local catalog.
     * @returns {boolean} true if a local URL was applied
     */
    function applyLocalMegaFallback(img, species, formSuffixHint) {
        if (!img || !species) return false;
        const suffix = formSuffixHint
            || megaFormSuffixFromUrl(img.src)
            || megaFormSuffixFromSpecies(species)
            || 'mega';
        const local = getLocalMegaSpriteUrl(species, suffix);
        if (!local) return false;
        img.src = local;
        if (img.classList.contains('mega-toggle') || img.classList.contains('form-toggle')) {
            img.dataset.mega = local;
        }
        return true;
    }

    const api = {
        LOCAL_MEGA_SPRITES,
        getAssetPrefix,
        megaFormSuffixFromItem,
        megaFormSuffixFromUrl,
        megaFormSuffixFromSpecies,
        resolveLocalMegaBasename,
        hasLocalMegaSprite,
        getLocalMegaSpriteUrl,
        getShowdownMegaSpriteUrl,
        resolveMegaSpriteUrl,
        applyLocalMegaFallback
    };

    global.MegaSprites = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
