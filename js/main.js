document.addEventListener('DOMContentLoaded', () => {
    // Determine path prefix (more robust for file:// URLs)
    const isSub = window.location.pathname.toLowerCase().includes('guides/') || 
                  window.location.pathname.toLowerCase().includes('pokedex/') ||
                  window.location.pathname.toLowerCase().includes('teambuilder/');
    const prefix = isSub ? '../' : '';

    // Header Injection
    const headerHTML = `
        <header id="main-header">
            <div class="container nav-container">
                <a href="${prefix}index.html" class="logo">CHAMPIONS GUIDE</a>
                <nav class="nav-links">
                    <a href="${prefix}index.html">Home</a>
                    <a href="${prefix}pokedex/index.html">Pokedex</a>
                    <a href="${prefix}teambuilder/index.html">Team Importer</a>
                    <a href="${prefix}guides/index.html">Guides</a>
                </nav>
            </div>
        </header>
    `;

    const footerHTML = `
        <footer>
            <div class="container">
                <p>&copy; 2026 Pokemon Champions Guide. Built for the Elite 4.</p>
                <div class="mono" style="font-size: 0.7rem; margin-top: 1rem; opacity: 0.5;">
                    VGC 2026 // GEN 10 COMPLIANT
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

    // Scroll effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
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
