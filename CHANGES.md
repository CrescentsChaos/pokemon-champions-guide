# UI overhaul — Champions Guide
Unzip over the project root (overwrites existing files).

New:  css/theme.css, css/settings.css, js/theme-boot.js, js/settings.js, settings/index.html
Removed (delete these): css/a11y.css, js/a11y.js  (merged into Settings)
Changed: every page head (theme-boot.js + theme.css), js/main.js, css/home.css, index.html,
         plus all stylesheets/inline styles migrated from hard-coded colours to theme tokens.
Fonts load from Google Fonts at runtime (Funnel Display, Geist, Geist Mono, Fraunces,
Atkinson Hyperlegible, Lexend). Self-host them if you need offline use.
