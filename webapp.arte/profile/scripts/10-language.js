// SPDX-License-Identifier: GPL-2.0-or-later
// ARTE prefers the language it stored over the one in its start URL, so
// the language the add-on's setting put in the URL is stored first.

(function () {
    var lang = /[?&]lang=([a-z]{2})/.exec(location.search);

    if (!lang)
        return;
    document.cookie = "userLang=" + lang[1] + "; path=/; max-age=31536000";
    try {
        localStorage.setItem("userLang", lang[1]);
    } catch (e) {
    }
})();
