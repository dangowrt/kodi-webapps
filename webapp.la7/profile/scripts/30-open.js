// SPDX-License-Identifier: GPL-2.0-or-later
// The TV edition starts as a red-button prompt that opens the app on Up. The
// prompt listens once the shell's banner cycle has run; after each cycle,
// until the app has started, it is handed the shell's VK_UP event.

(function () {
    function prompt_open() {
        document.dispatchEvent(new Event("VK_UP"));
    }

    function cycle_done() {
        Promise.resolve().then(prompt_open);
    }

    function app_started() {
        document.removeEventListener("LANNER_CYCLE_DONE", cycle_done, false);
        document.removeEventListener("APP_START", app_started, false);
    }

    document.addEventListener("LANNER_CYCLE_DONE", cycle_done, false);
    document.addEventListener("APP_START", app_started, false);
})();
