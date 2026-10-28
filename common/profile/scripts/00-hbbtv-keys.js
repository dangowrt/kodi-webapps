// SPDX-License-Identifier: GPL-2.0-or-later
// HbbTV apps compare key codes with KeyEvent.VK_* or with the values HbbTV
// receivers commonly send; the web view sends its own codes for BACK and the
// media keys. Hand those keys to the page with the receivers' values and
// publish the same values in KeyEvent, so both kinds of app agree.

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
    var VK = {
        VK_LEFT: 37, VK_UP: 38, VK_RIGHT: 39, VK_DOWN: 40, VK_ENTER: 13,
        VK_BACK: 461, VK_RED: 403, VK_GREEN: 404, VK_YELLOW: 405, VK_BLUE: 406,
        VK_PLAY: 415, VK_PAUSE: 19, VK_PLAY_PAUSE: 463, VK_STOP: 413,
        VK_FAST_FWD: 417, VK_REWIND: 412, VK_NEXT: 425, VK_PREV: 424,
        VK_0: 48, VK_1: 49, VK_2: 50, VK_3: 51, VK_4: 52,
        VK_5: 53, VK_6: 54, VK_7: 55, VK_8: 56, VK_9: 57
    };
    var keyEvent = window.KeyEvent || (window.KeyEvent = {});
    var name;

    for (name in VK)
        keyEvent[name] = VK[name];

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
