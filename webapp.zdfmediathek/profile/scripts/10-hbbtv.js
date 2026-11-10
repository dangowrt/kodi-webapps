// SPDX-License-Identifier: GPL-2.0-or-later
// The HbbTV edition plays through an OIPF A/V object unless its global
// htmlfive is set; the video element plays its streams natively. Red and
// the colour keys hide the edition for the broadcast behind it, which Kodi
// does not show, so they stay inside it, and BACK on its first screen
// closes it, which returns to Kodi. The consent dialog opens with the focus
// on its accepting button; it opens on its refusal instead, so that one
// press of OK refuses. Where the dialog has no such button, it stays as
// the edition shows it.

(function () {
    function refusalIndex(buttons) {
        var label = window.CMP_LOCALES && window.CMP_LOCALES.get &&
            window.CMP_LOCALES.get(window.CMP_LOCALES_BUTTON_REJECT);

        if (!label)
            return -1;
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].el && buttons[i].el.textContent.trim() === label)
                return i;
        }
        return -1;
    }

    function consentOnRefusal() {
        var popup = window.MxpCmpEntryPopup;
        var open = popup && popup.prototype.open;

        if (!open)
            return;
        popup.prototype.open = function () {
            var result = open.apply(this, arguments);
            var buttons = this.children || [];
            var i;

            try {
                i = refusalIndex(buttons);
                if (i >= 0 && i !== this.focusIdx) {
                    buttons[this.focusIdx].blur();
                    this.focusIdx = i;
                    buttons[i].focus();
                }
            } catch (e) {
            }
            return result;
        };
    }

    document.addEventListener("DOMContentLoaded", function () {
        var globals = window.GLOBALS;

        if (!globals)
            return;
        globals.htmlfive = 1;
        globals.allowbroadcast = false;
        globals.noclose = 1;
        globals.closeonback = 1;
        consentOnRefusal();
    });
})();
