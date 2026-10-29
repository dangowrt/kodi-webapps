// SPDX-License-Identifier: GPL-2.0-or-later
// On an HbbTV user agent La7's player hands replays and clips to the video
// element as a DASH manifest, which the web view's native DASH playback
// rejects (MEDIA_ERR_SRC_NOT_SUPPORTED). Outside live streams its HbbTV
// check answers no, so it plays them through Shaka and MSE like live.

(function () {
    var player;

    function player_patch(cls) {
        var is_hbbtv = cls && cls.prototype && cls.prototype._isHbbTV;

        if (typeof is_hbbtv !== "function" || is_hbbtv.patched)
            return;
        cls.prototype._isHbbTV = function () {
            return !!(this.options && this.options.isLive) && is_hbbtv.call(this);
        };
        cls.prototype._isHbbTV.patched = true;
    }

    Object.defineProperty(window, "videoLa7", {
        configurable: true,
        get: function () {
            return player;
        },
        set: function (value) {
            player = value;
            player_patch(value);
        }
    });
})();
