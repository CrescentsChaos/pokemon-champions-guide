document.addEventListener('DOMContentLoaded', () => {
    // Determine path prefix (more robust for file:// URLs)
    const subDirs = ['guides/', 'pokedex/', 'teambuilder/', 'builds/'];
    const isSub = subDirs.some(dir => window.location.pathname.toLowerCase().includes(dir));
    const prefix = isSub ? '../' : '';

    // Header Injection
    const headerHTML = `
        <header id="main-header">
            <div class="container nav-container">
                <a href="${prefix}index.html" class="logo">
                    <span style="color:white">CHAMPIONS</span><span style="color:var(--primary-red)">GUIDE</span>
                </a>
                <button id="menu-toggle" class="menu-btn" aria-label="Toggle Menu">
                    <span class="bar"></span>
                    <span class="bar"></span>
                    <span class="bar"></span>
                </button>
                <nav class="nav-links">
                    <a href="${prefix}index.html" data-page="home">Home</a>
                    <a href="${prefix}pokedex/index.html" data-page="pokedex">Pokedex</a>
                    <a href="${prefix}teambuilder/index.html" data-page="teambuilder">Builder</a>
                    <a href="${prefix}builds/index.html" data-page="builds">Builds</a>
                    <a href="${prefix}guides/index.html" data-page="guides">Guides</a>
                    <div class="mobile-only" style="margin-top: 2rem;">
                        <a href="${prefix}teambuilder/index.html" class="btn" style="width: 100%; text-align: center;">Build Team</a>
                    </div>
                </nav>
                <div class="header-action desktop-only">
                    <a href="${prefix}teambuilder/index.html" class="btn" style="padding: 0.6rem 1.2rem; font-size: 0.75rem;">Build Team</a>
                </div>
            </div>
        </header>
    `;

    const footerHTML = `
        <footer style="margin-top: 8rem; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.3); backdrop-filter: blur(10px);">
            <div class="container" style="padding: 6rem 2rem;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 4rem;">
                    <div>
                        <a href="${prefix}index.html" class="logo" style="margin-bottom: 1.5rem;">CHAMPIONS GUIDE</a>
                        <p style="color: var(--text-muted); max-width: 400px; font-size: 0.95rem;">The world's most advanced competitive Pokemon resource. Built for VGC Masters and Smogon Enthusiasts alike. Precision data, elite strategies, and professional tools.</p>
                    </div>
                    <div>
                        <h4 style="color: white; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px;">Navigation</h4>
                        <ul style="list-style: none;">
                            <li style="margin-bottom: 0.8rem;"><a href="${prefix}index.html" style="color: var(--text-muted); text-decoration: none;">Home</a></li>
                            <li style="margin-bottom: 0.8rem;"><a href="${prefix}pokedex/index.html" style="color: var(--text-muted); text-decoration: none;">Elite Pokedex</a></li>
                            <li style="margin-bottom: 0.8rem;"><a href="${prefix}builds/index.html" style="color: var(--text-muted); text-decoration: none;">Competitve Builds</a></li>
                            <li style="margin-bottom: 0.8rem;"><a href="${prefix}teambuilder/index.html" style="color: var(--text-muted); text-decoration: none;">Team Builder</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 style="color: white; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 1px;">Community</h4>
                        <ul style="list-style: none;">
                            <li style="margin-bottom: 0.8rem;"><a href="#" style="color: var(--text-muted); text-decoration: none;">Discord</a></li>
                            <li style="margin-bottom: 0.8rem;"><a href="#" style="color: var(--text-muted); text-decoration: none;">Twitter/X</a></li>
                            <li style="margin-bottom: 0.8rem;"><a href="#" style="color: var(--text-muted); text-decoration: none;">Contribute</a></li>
                        </ul>
                    </div>
                </div>
                <div style="margin-top: 6rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <p style="color: var(--text-muted); font-size: 0.85rem;">&copy; 2026 Pokemon Champions Guide. For educational use.</p>
                    <div class="mono" style="font-size: 0.7rem; opacity: 0.5;">LATEST_PATCH: 10.0.1 // SCALE_UP</div>
                </div>
            </div>
        </footer>
    `;

    // Inject if containers exist or at top/bottom
    const body = document.body;
    if (!document.getElementById('main-header')) {
        body.insertAdjacentHTML('afterbegin', headerHTML);
    }
    if (!document.querySelector('footer')) {
        body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // Menu logic
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
            document.body.style.overflow = navLinksContainer.classList.contains('active') ? 'hidden' : '';
        });
    }

    // Close menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinksContainer.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Active link highlighting
    const currentPath = window.location.pathname.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        if (currentPath.includes(page) || (page === 'home' && (currentPath === '/' || currentPath === '' || currentPath.endsWith('index.html')) && !currentPath.includes('pokedex') && !currentPath.includes('builds') && !currentPath.includes('teambuilder'))) {
            link.style.color = 'var(--primary-red)';
            link.style.textShadow = 'var(--accent-glow)';
        }
    });

    // Fade-in observer
    const faders = document.querySelectorAll('.fade-in');
    const appearOptions = {
        threshold: 0.2,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
        });
    }, appearOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });
});
