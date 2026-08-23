(function () {
    var STORAGE_KEY = 'theme';
    var COOKIE_DOMAIN = '.wyrihaximus.net';
    var COOKIE_MAX_AGE = 31536000;
    var ORDER = ['system', 'light', 'dark'];
    var LABELS = {
        system: 'System theme',
        light: 'Light theme',
        dark: 'Dark theme',
    };

    function usesSharedCookie() {
        var host = location.hostname;

        return host === 'wyrihaximus.net' || /\.wyrihaximus\.net$/i.test(host);
    }

    function getCookie(name) {
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));

        return match ? decodeURIComponent(match[1]) : null;
    }

    function setCookie(name, value) {
        var parts = [
            name + '=' + encodeURIComponent(value),
            'path=/',
            'max-age=' + COOKIE_MAX_AGE,
            'samesite=lax',
            'domain=' + COOKIE_DOMAIN,
        ];

        if (location.protocol === 'https:') {
            parts.push('secure');
        }

        document.cookie = parts.join('; ');
    }

    function removeCookie(name) {
        var parts = [
            name + '=',
            'path=/',
            'max-age=0',
            'samesite=lax',
            'domain=' + COOKIE_DOMAIN,
        ];

        if (location.protocol === 'https:') {
            parts.push('secure');
        }

        document.cookie = parts.join('; ');
    }

    function readStoredTheme() {
        if (usesSharedCookie()) {
            var cookie = getCookie(STORAGE_KEY);
            if (cookie === 'light' || cookie === 'dark') {
                return cookie;
            }
        }

        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') {
                if (usesSharedCookie()) {
                    setCookie(STORAGE_KEY, stored);
                }

                return stored;
            }
        } catch (e) {}

        return 'system';
    }

    function storeTheme(pref) {
        if (pref === 'system') {
            if (usesSharedCookie()) {
                removeCookie(STORAGE_KEY);
            }

            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}

            return;
        }

        if (usesSharedCookie()) {
            setCookie(STORAGE_KEY, pref);
        }

        try {
            localStorage.setItem(STORAGE_KEY, pref);
        } catch (e) {}
    }

    function preference() {
        return readStoredTheme();
    }

    function applyHighlightTheme(resolved) {
        var light = document.getElementById('hljs-theme-light');
        var dark = document.getElementById('hljs-theme-dark');
        if (!light || !dark) {
            return;
        }

        light.media = resolved === 'dark' ? 'not all' : 'all';
        dark.media = resolved === 'dark' ? 'all' : 'not all';
    }

    function apply(pref) {
        var root = document.documentElement;
        if (pref === 'system') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', pref);
        }

        root.setAttribute('data-theme-preference', pref);

        var resolved = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'dark'
            : 'light';
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', resolved === 'dark' ? '#121614' : '#1abc9c');
        }

        applyHighlightTheme(resolved);

        var button = document.getElementById('theme-toggle');
        if (!button) {
            return;
        }

        button.setAttribute('aria-label', LABELS[pref] + ' (click to change)');
        button.setAttribute('title', LABELS[pref]);
        Array.prototype.forEach.call(button.querySelectorAll('[data-theme-icon]'), function (icon) {
            if (icon.getAttribute('data-theme-icon') === pref) {
                icon.removeAttribute('hidden');
            } else {
                icon.setAttribute('hidden', '');
            }
        });
    }

    function cycle(event) {
        event.preventDefault();
        var next = ORDER[(ORDER.indexOf(preference()) + 1) % ORDER.length];
        storeTheme(next);
        apply(next);
    }

    apply(preference());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (preference() === 'system') {
            apply('system');
        }
    });
    document.addEventListener('DOMContentLoaded', function () {
        apply(preference());
        var button = document.getElementById('theme-toggle');
        if (button) {
            button.addEventListener('click', cycle);
        }
    });
})();
