// SPDX-License-Identifier: GPL-2.0-or-later
// The remote's BACK reaches the page as BrowserBack, which the site ignores,
// and the profile chooser takes no arrow keys.

(function () {
    var KEY_BROWSER_BACK = 166;
    var TILES = '[data-uia="profile-selector"] button';

    function previewClose() {
        var close = document.querySelector('[data-uia="previewModal-closebtn"]');

        if (!close)
            return false;
        close.click();
        return true;
    }

    function historyBack() {
        if (history.length < 2)
            return false;
        history.back();
        return true;
    }

    function tileFocus(step) {
        var tiles = Array.prototype.slice.call(document.querySelectorAll(TILES));
        var i = tiles.indexOf(document.activeElement);

        if (!tiles.length)
            return false;
        i = i < 0 ? 0 : Math.min(Math.max(i + step, 0), tiles.length - 1);
        tiles[i].focus();
        return true;
    }

    document.addEventListener("keydown", function (ev) {
        var handled = false;

        if (ev.keyCode === KEY_BROWSER_BACK)
            handled = previewClose() || historyBack();
        else if (ev.key === "ArrowLeft")
            handled = tileFocus(-1);
        else if (ev.key === "ArrowRight")
            handled = tileFocus(1);

        if (!handled)
            return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
    }, true);

    document.addEventListener("DOMContentLoaded", function () {
        var style = document.createElement("style");

        style.textContent = TILES + ":focus { outline: 4px solid #fff; outline-offset: 6px; }";
        document.head.appendChild(style);

        new MutationObserver(function () {
            var tiles = document.querySelectorAll(TILES);

            if (tiles.length && Array.prototype.indexOf.call(tiles, document.activeElement) < 0 &&
                    document.activeElement === document.body)
                tiles[0].focus();
        }).observe(document.body, { childList: true, subtree: true });
    });
})();
