// SPDX-License-Identifier: GPL-2.0-or-later
// The La7 player takes the number of preroll, midroll and postroll adverts
// to fetch from window.rsetLa7.platforms.<platform>.<live|VOD|clip>; with no
// advert URLs it plays the video at once. The counts are zeroed whenever the
// page stores or reads that configuration; a missing count would mean three
// live prerolls, so they are set to zero rather than removed.

(function () {
    var config;

    function rollsZero(rolls) {
        if (!rolls || typeof rolls !== "object")
            return;
        rolls.preRoll = 0;
        rolls.midRoll = 0;
        rolls.postRoll = 0;
    }

    function configZero() {
        var platform, kind;

        if (!config || !config.platforms)
            return;
        for (platform in config.platforms)
            for (kind in config.platforms[platform])
                rollsZero(config.platforms[platform][kind]);
    }

    Object.defineProperty(window, "rsetLa7", {
        configurable: true,
        get: function () {
            configZero();
            return config;
        },
        set: function (value) {
            config = value;
            configZero();
        }
    });
})();
