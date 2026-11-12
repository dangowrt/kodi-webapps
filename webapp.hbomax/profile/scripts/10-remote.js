// SPDX-License-Identifier: GPL-2.0-or-later
// The remote's BACK reaches the page as BrowserBack, which HBO Max's desktop
// site ignores. BACK closes an open dialog by its close button; while a
// dialog without one is open, BACK does nothing, so that the page behind
// it does not change. Without a dialog, BACK goes back in the page's
// history, and where there is none it is left to Kodi. The site marks the
// focus faintly or not at all, so the focused element gets a visible
// outline.

(function () {
    var KEY_BROWSER_BACK = 166;
    var DIALOG = "[role='dialog'], [aria-modal='true']";
    var CLOSE = "[aria-label*='close' i], [aria-label*='schlie' i], [data-testid*='close' i]";

    function dialogOpen() {
        var dialogs = document.querySelectorAll(DIALOG);

        for (var i = dialogs.length - 1; i >= 0; i--) {
            if (dialogs[i].getClientRects().length)
                return dialogs[i];
        }
        return null;
    }

    function back() {
        var dialog = dialogOpen();
        var close;

        if (dialog) {
            close = dialog.querySelector(CLOSE);
            if (close)
                close.click();
            return true;
        }
        if (history.length < 2)
            return false;
        history.back();
        return true;
    }

    function styleAdd() {
        var style;

        if (document.getElementById("kodi-remote-focus") || !document.head)
            return;
        style = document.createElement("style");
        style.id = "kodi-remote-focus";
        style.textContent = "a:focus-visible, button:focus-visible, [tabindex]:focus-visible" +
            " { outline: 4px solid #fff !important; outline-offset: 4px; }";
        document.head.appendChild(style);
    }

    if (window.top !== window)
        return;

    document.addEventListener("keydown", function (ev) {
        if (ev.keyCode !== KEY_BROWSER_BACK || !back())
            return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
    }, true);

    document.addEventListener("DOMContentLoaded", styleAdd);
})();
