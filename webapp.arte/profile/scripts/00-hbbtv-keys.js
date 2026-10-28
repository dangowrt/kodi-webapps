// SPDX-License-Identifier: GPL-2.0-or-later
// ARTE compares key codes with the values HbbTV receivers commonly send
// instead of reading KeyEvent.VK_*, so the web view's codes for BACK and
// the media keys are handed to the page as those values.

(function () {
    var HBBTV_CODES = {
        166: 461,   // BACK
        250: 415,   // PLAY
        178: 413,   // STOP
        228: 417,   // FAST_FWD
        227: 412,   // REWIND
        176: 425,   // NEXT
        177: 424    // PREV
    };

    function forward(ev) {
        var code = HBBTV_CODES[ev.keyCode];
        var copy;

        if (code === undefined || !ev.isTrusted)
            return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        copy = new KeyboardEvent(ev.type, { key: ev.key, code: ev.code, bubbles: true, cancelable: true });
        Object.defineProperty(copy, "keyCode", { value: code });
        Object.defineProperty(copy, "which", { value: code });
        ev.target.dispatchEvent(copy);
    }

    window.addEventListener("keydown", forward, true);
    window.addEventListener("keyup", forward, true);
})();
