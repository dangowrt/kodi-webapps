// SPDX-License-Identifier: GPL-2.0-or-later
// What an HbbTV terminal gives its applications and the web view lacks: the
// receivers' key codes, the OIPF A/V Control object (played by a <video> next
// to it, as WebKit renders no fallback content), the video/broadcast object,
// the capabilities object, listing the media profiles the web view plays and
// Widevine where encrypted media is available, and the application manager,
// whose destroyApplication() returns to Kodi.

(function () {
    var VK = {
        VK_LEFT: 37, VK_UP: 38, VK_RIGHT: 39, VK_DOWN: 40, VK_ENTER: 13,
        VK_BACK: 461, VK_RED: 403, VK_GREEN: 404, VK_YELLOW: 405, VK_BLUE: 406,
        VK_PLAY: 415, VK_PAUSE: 19, VK_PLAY_PAUSE: 463, VK_STOP: 413,
        VK_FAST_FWD: 417, VK_REWIND: 412, VK_NEXT: 425, VK_PREV: 424,
        VK_0: 48, VK_1: 49, VK_2: 50, VK_3: 51, VK_4: 52,
        VK_5: 53, VK_6: 54, VK_7: 55, VK_8: 56, VK_9: 57
    };
    var WPE_CODES = {
        VK_BACK: 166, VK_PLAY: 250, VK_STOP: 178, VK_FAST_FWD: 228,
        VK_REWIND: 227, VK_NEXT: 176, VK_PREV: 177
    };
    var keyEvent = window.KeyEvent || (window.KeyEvent = {});
    var hbbtvCodes = {};
    var name;

    for (name in VK)
        keyEvent[name] = VK[name];
    for (name in WPE_CODES)
        hbbtvCodes[WPE_CODES[name]] = VK[name];

    function forward(ev) {
        var code = hbbtvCodes[ev.keyCode];
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

(function () {
    var AV_TYPES = [
        "video/mp4", "video/mpeg4", "video/mpeg", "video/mp2t",
        "audio/mp4", "audio/mpeg", "application/dash+xml"
    ];
    var STOPPED = 0, PLAYING = 1, PAUSED = 2, CONNECTING = 3, BUFFERING = 4,
        FINISHED = 5, ERROR = 6;
    // OIPF DAE 7.14.1.1 error codes, indexed by HTML MediaError code
    var MEDIA_ERRORS = { 1: 2, 2: 1, 3: 4, 4: 0 };
    var proto = HTMLObjectElement.prototype;
    var dataDesc = Object.getOwnPropertyDescriptor(proto, "data");
    var setAttr = Element.prototype.setAttribute;
    var getAttr = Element.prototype.getAttribute;
    var removeAttr = Element.prototype.removeAttribute;
    var states = new WeakMap();

    function isAv(obj) {
        var type = getAttr.call(obj, "type");

        return type !== null && AV_TYPES.indexOf(type.toLowerCase()) >= 0;
    }

    function fire(obj, name, extra) {
        var handler = obj["on" + name];
        var ev = new Event(name);
        var key;

        for (key in extra)
            ev[key] = extra[key];
        if (typeof handler === "function") {
            try {
                if (name === "PlayPositionChanged")
                    handler.call(obj, extra.position);
                else if (name === "PlaySpeedChanged")
                    handler.call(obj, extra.speed);
                else
                    handler.call(obj);
            } catch (e) {
                console.error(e);
            }
        }
        obj.dispatchEvent(ev);
    }

    function stateSet(obj, st, playState) {
        if (st.playState === playState)
            return;
        st.playState = playState;
        fire(obj, "PlayStateChange", { state: playState });
    }

    function geometrySync(obj, st) {
        var style, v = st.video;

        if (!v)
            return;
        if (!obj.isConnected) {
            v.remove();
            return;
        }
        if (v.parentNode !== obj.parentNode || v.previousSibling !== obj)
            obj.parentNode.insertBefore(v, obj.nextSibling);
        style = getComputedStyle(obj);
        if (st.fullScreen) {
            v.style.position = "fixed";
            v.style.left = v.style.top = "0px";
            v.style.width = "100vw";
            v.style.height = "100vh";
        } else {
            v.style.position = "absolute";
            v.style.left = obj.offsetLeft + "px";
            v.style.top = obj.offsetTop + "px";
            v.style.width = obj.offsetWidth + "px";
            v.style.height = obj.offsetHeight + "px";
        }
        v.style.zIndex = style.zIndex;
        v.style.display = style.display === "none" ? "none" : "block";
        v.style.visibility = style.visibility;
    }

    function videoCreate(obj, st) {
        var v = document.createElement("video");
        var sync = function () { geometrySync(obj, st); };

        v.style.pointerEvents = "none";
        v.addEventListener("playing", function () {
            if (st.playState !== STOPPED)
                stateSet(obj, st, PLAYING);
        });
        v.addEventListener("waiting", function () {
            if (st.playState === PLAYING)
                stateSet(obj, st, BUFFERING);
        });
        v.addEventListener("ended", function () {
            stateSet(obj, st, FINISHED);
        });
        v.addEventListener("error", function () {
            if (st.playState === STOPPED || !v.error)
                return;
            st.error = MEDIA_ERRORS[v.error.code] !== undefined ?
                MEDIA_ERRORS[v.error.code] : 2;
            stateSet(obj, st, ERROR);
        });
        v.addEventListener("seeked", function () {
            fire(obj, "PlayPositionChanged",
                 { position: Math.floor(v.currentTime * 1000) });
        });
        new ResizeObserver(sync).observe(obj);
        new MutationObserver(sync).observe(obj,
            { attributes: true, attributeFilter: ["style", "class"] });
        st.video = v;
        return v;
    }

    function stateGet(obj) {
        var st = states.get(obj);
        var data;

        if (st)
            return st;
        st = { data: "", video: null, playState: STOPPED, error: undefined,
               speed: 0, fullScreen: false };
        states.set(obj, st);
        data = getAttr.call(obj, "data");
        if (data !== null) {
            st.data = data;
            removeAttr.call(obj, "data");
        }
        return st;
    }

    function stop(obj, st) {
        var v = st.video;

        if (v) {
            v.pause();
            v.removeAttribute("src");
            v.load();
        }
        st.speed = 0;
        stateSet(obj, st, STOPPED);
    }

    function av(name, fn) {
        Object.defineProperty(proto, name, {
            configurable: true,
            value: function () {
                if (!isAv(this))
                    return undefined;
                return fn.apply(this, [stateGet(this)].concat([].slice.call(arguments)));
            }
        });
    }

    function avGetter(name, fn) {
        Object.defineProperty(proto, name, {
            configurable: true,
            get: function () {
                return isAv(this) ? fn.call(this, stateGet(this)) : undefined;
            }
        });
    }

    Object.defineProperty(proto, "data", {
        configurable: true,
        get: function () {
            return isAv(this) ? stateGet(this).data : dataDesc.get.call(this);
        },
        set: function (url) {
            var st;

            if (!isAv(this)) {
                dataDesc.set.call(this, url);
                return;
            }
            st = stateGet(this);
            if (st.playState !== STOPPED)
                stop(this, st);
            st.data = String(url);
        }
    });

    Element.prototype.setAttribute = function (name, value) {
        if (this instanceof HTMLObjectElement && String(name).toLowerCase() === "data" && isAv(this)) {
            this.data = value;
            return;
        }
        return setAttr.apply(this, arguments);
    };

    Element.prototype.getAttribute = function (name) {
        if (this instanceof HTMLObjectElement && String(name).toLowerCase() === "data" &&
            isAv(this) && stateGet(this).data)
            return stateGet(this).data;
        return getAttr.apply(this, arguments);
    };

    Element.prototype.removeAttribute = function (name) {
        if (this instanceof HTMLObjectElement && String(name).toLowerCase() === "data" && isAv(this)) {
            stateGet(this).data = "";
            return;
        }
        return removeAttr.apply(this, arguments);
    };

    avGetter("playState", function (st) { return st.playState; });
    avGetter("error", function (st) { return st.error; });
    avGetter("speed", function (st) { return st.speed; });
    avGetter("fullScreen", function (st) { return st.fullScreen; });
    avGetter("playPosition", function (st) {
        return st.video && st.playState !== STOPPED ?
            Math.floor(st.video.currentTime * 1000) : 0;
    });
    avGetter("playTime", function (st) {
        var v = st.video, end;

        if (!v)
            return 0;
        if (isFinite(v.duration))
            return Math.floor(v.duration * 1000);
        end = v.seekable.length ? v.seekable.end(v.seekable.length - 1) : 0;
        return Math.floor(end * 1000);
    });

    av("play", function (st, speed) {
        var v = st.video || videoCreate(this, st);
        var obj = this;

        speed = speed === undefined ? 1 : Number(speed);
        if (speed < 0 || !st.data)
            return false;
        geometrySync(this, st);
        if (speed === 0) {
            if (st.playState === STOPPED || st.playState === FINISHED ||
                st.playState === ERROR)
                return false;
            v.pause();
            st.speed = 0;
            fire(this, "PlaySpeedChanged", { speed: 0 });
            stateSet(this, st, PAUSED);
            return true;
        }
        if (st.playState === STOPPED || st.playState === FINISHED ||
            st.playState === ERROR) {
            st.error = undefined;
            if (getAttr.call(v, "src") !== st.data)
                v.src = st.data;
            else if (st.playState === FINISHED)
                v.currentTime = 0;
            stateSet(this, st, CONNECTING);
        }
        v.playbackRate = speed;
        if (st.speed !== speed) {
            st.speed = speed;
            fire(this, "PlaySpeedChanged", { speed: speed });
        }
        v.play().catch(function (e) {
            if (e.name === "NotSupportedError" && st.playState !== STOPPED) {
                st.error = 0;
                stateSet(obj, st, ERROR);
            }
        });
        return true;
    });

    av("stop", function (st) {
        stop(this, st);
        return true;
    });

    av("seek", function (st, position) {
        if (!st.video || st.playState === STOPPED || st.playState === ERROR)
            return false;
        st.video.currentTime = Number(position) / 1000;
        return true;
    });

    av("setVolume", function (st, volume) {
        var v = st.video || videoCreate(this, st);

        volume = Number(volume);
        if (!(volume >= 0 && volume <= 100))
            return false;
        v.volume = volume / 100;
        return true;
    });

    av("getVolume", function (st) {
        return st.video ? Math.round(st.video.volume * 100) : 100;
    });

    av("setFullScreen", function (st, fullScreen) {
        fullScreen = !!fullScreen;
        if (st.fullScreen === fullScreen)
            return;
        st.fullScreen = fullScreen;
        geometrySync(this, st);
        fire(this, "FullScreenChange", {});
    });

    av("queue", function () { return false; });

    function components() {
        var list = [];

        list.item = function (i) { return this[i]; };
        return list;
    }

    av("getComponents", components);
    av("getCurrentActiveComponents", components);
    av("selectComponent", function () {});
    av("unselectComponent", function () {});
})();

(function () {
    // OIPF DAE 7.13.1.1: the video/broadcast object's stopped play state
    var BROADCAST_STOPPED = 3;
    var KEYSET = {
        RED: 0x1, GREEN: 0x2, YELLOW: 0x4, BLUE: 0x8, NAVIGATION: 0x10,
        VCR: 0x20, SCROLL: 0x40, INFO: 0x80, NUMERIC: 0x100, ALPHA: 0x200,
        OTHER: 0x400
    };
    var APP_MANAGER = "application/oipfapplicationmanager";
    var BROADCAST = "video/broadcast";
    var CAPABILITIES = "application/oipfcapabilities";
    var CAPABILITIES_NS = "urn:hbbtv:config:oitf:oitfCapabilities:2017-1";
    var WIDEVINE = "urn:dvb:casystemid:19156";
    // OIPF Media V2.3 table 3: the MP4 system format with CENC protection
    var WIDEVINE_FORMATS = "MP4_CENC";
    // TS 101 154 5.6.1.2 and table L.1: the codecs the format labels stand for
    var AVC_SD_25 = "avc1.4D401E", AVC_HD_25 = "avc1.640028",
        HEAAC = "mp4a.40.5", EAC3 = "ec-3";
    var proto = HTMLObjectElement.prototype;
    var getAttr = Element.prototype.getAttribute;
    var application, profiles;

    function typeOf(obj) {
        var type = getAttr.call(obj, "type");

        return type === null ? "" : type.toLowerCase();
    }

    function list(items) {
        items.item = function (i) { return this[i]; };
        return items;
    }

    function close() {
        try {
            window.top.close();
        } catch (e) {
            window.close();
        }
    }

    function keyset() {
        var set = { value: 0x1f, otherKeys: [] };
        var key;

        for (key in KEYSET)
            set[key] = KEYSET[key];
        set.setValue = function (value) { this.value = value; return value; };
        return set;
    }

    function owner() {
        if (application)
            return application;
        application = {
            visible: true,
            privateData: { keyset: keyset(), currentChannel: null },
            show: function () { this.visible = true; return true; },
            hide: function () { this.visible = false; return true; },
            activate: function () {},
            deactivate: function () {},
            activateInput: function () { return true; },
            deactivateInput: function () { return true; },
            destroyApplication: close,
            createApplication: function (uri) {
                window.location.href = uri;
                return null;
            }
        };
        application["private"] = application.privateData;
        return application;
    }

    function children() {
        return list([]);
    }

    function playable(type, codecs) {
        return !!window.MediaSource && MediaSource.isTypeSupported(
            type + (codecs.length ? '; codecs="' + codecs.join(",") + '"' : ""));
    }

    // widevine: the web view plays the profile protected by Widevine, through EME and MSE
    function profileAdd(tag, name, type, transport, probe, codecs, widevine) {
        if (!playable(probe, codecs))
            return;
        profiles.push({ tag: tag, name: name, type: type, transport: transport, widevine: widevine });
    }

    function avcProfilesAdd(video, audio, widevine) {
        var name = video[0] + "_" + audio[0];
        var codecs = [video[1], audio[1]];

        profileAdd("video_profile", "MP4_" + name, "video/mp4", "dash", "video/mp4", codecs, widevine);
        profileAdd("video_profile", "MP4_" + name + "_EBUTTD", "video/mp4", "dash", "video/mp4", codecs, widevine);
        profileAdd("video_profile", "TS_" + name, "video/mpeg", "", "video/mp2t", codecs, false);
        profileAdd("video_profile", "MP4_" + name, "video/mp4", "", "video/mp4", codecs, false);
    }

    function profilesGet() {
        if (profiles)
            return profiles;
        profiles = [];
        profileAdd("audio_profile", "MPEG1_L3", "audio/mpeg", "", "audio/mpeg", [], false);
        profileAdd("audio_profile", "HEAAC", "audio/mp4", "", "audio/mp4", [HEAAC], false);
        profileAdd("audio_profile", "MP4_HEAAC", "audio/mp4", "dash", "audio/mp4", [HEAAC], true);
        profileAdd("audio_profile", "MP4_E-AC3", "audio/mp4", "", "audio/mp4", [EAC3], false);
        profileAdd("audio_profile", "MP4_E-AC3", "audio/mp4", "dash", "audio/mp4", [EAC3], false);
        [["AVC_SD_25", AVC_SD_25], ["AVC_HD_25", AVC_HD_25]].forEach(function (video) {
            avcProfilesAdd(video, ["HEAAC", HEAAC], true);
            avcProfilesAdd(video, ["E-AC3", EAC3], false);
        });
        return profiles;
    }

    function encryptedMediaAvailable() {
        return typeof Navigator.prototype.requestMediaKeySystemAccess === "function";
    }

    function capabilities() {
        var doc = document.implementation.createDocument(CAPABILITIES_NS, "profilelist", null);
        var drm = encryptedMediaAvailable();
        var el;

        profilesGet().forEach(function (p) {
            el = doc.createElementNS(CAPABILITIES_NS, p.tag);
            el.setAttribute("name", p.name);
            el.setAttribute("type", p.type);
            if (p.transport)
                el.setAttribute("transport", p.transport);
            if (drm && p.widevine)
                el.setAttribute("DRMSystemID", WIDEVINE);
            doc.documentElement.appendChild(el);
        });
        if (drm) {
            el = doc.createElementNS(CAPABILITIES_NS, "drm");
            el.setAttribute("DRMSystemID", WIDEVINE);
            el.textContent = WIDEVINE_FORMATS;
            doc.documentElement.appendChild(el);
        }
        return doc;
    }

    function hasCapability(name) {
        return String(name) === "+DRM" && encryptedMediaAvailable();
    }

    // an earlier helper may own the name for other object types
    function method(type, name, fn) {
        var previous = Object.getOwnPropertyDescriptor(proto, name);

        Object.defineProperty(proto, name, {
            configurable: true,
            value: function () {
                if (typeOf(this) === type)
                    return fn.apply(this, arguments);
                if (previous && typeof previous.value === "function")
                    return previous.value.apply(this, arguments);
                return undefined;
            }
        });
    }

    function getter(type, name, fn) {
        var previous = Object.getOwnPropertyDescriptor(proto, name);

        Object.defineProperty(proto, name, {
            configurable: true,
            get: function () {
                if (typeOf(this) === type)
                    return fn.call(this);
                return previous && previous.get ? previous.get.call(this) : undefined;
            }
        });
    }

    method(APP_MANAGER, "getOwnerApplication", owner);
    method(APP_MANAGER, "getChildApplications", children);

    getter(BROADCAST, "playState", function () { return BROADCAST_STOPPED; });
    getter(BROADCAST, "currentChannel", function () { return null; });
    method(BROADCAST, "bindToCurrentChannel", function () { return null; });
    method(BROADCAST, "getChannelConfig", function () {
        return { channelList: list([]), favouriteLists: list([]) };
    });
    method(BROADCAST, "setChannel", function () {});
    method(BROADCAST, "prevChannel", function () {});
    method(BROADCAST, "nextChannel", function () {});
    method(BROADCAST, "stop", function () {});
    method(BROADCAST, "release", function () {});
    method(BROADCAST, "setFullScreen", function () {});
    method(BROADCAST, "getVolume", function () { return 100; });
    method(BROADCAST, "setVolume", function () { return true; });

    getter(CAPABILITIES, "xmlCapabilities", capabilities);
    method(CAPABILITIES, "hasCapability", hasCapability);

    if (!window.oipfObjectFactory) {
        window.oipfObjectFactory = {
            isObjectSupported: function (type) {
                return [APP_MANAGER, BROADCAST, CAPABILITIES].indexOf(String(type).toLowerCase()) >= 0;
            },
            createApplicationManagerObject: function () {
                return { getOwnerApplication: owner, getChildApplications: children };
            },
            createCapabilitiesObject: function () {
                return {
                    get xmlCapabilities() { return capabilities(); },
                    hasCapability: hasCapability
                };
            }
        };
    }
})();
