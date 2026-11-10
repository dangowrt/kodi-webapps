# kodi-webapps

Web app add-ons for Kodi and the Kodi add-on repository that installs and
updates them. A web app opens a streaming service or another web page in
Kodi's web view; it needs a Kodi with web app support (the `kodi.webapp`
add-on type) and a web client such as
[kodi-webkit](https://github.com/dangowrt/kodi-webkit).

| Add-on | Opens |
| --- | --- |
| `webapp.3satmediathek` | 3sat Mediathek, HbbTV edition |
| `webapp.ardmediathek` | ARD Mediathek, HbbTV edition |
| `webapp.arte` | ARTE, HbbTV edition, six languages |
| `webapp.duckduckgo` | DuckDuckGo |
| `webapp.francetv` | france.tv, big-screen edition |
| `webapp.la7` | La7, HbbTV edition |
| `webapp.luci` | Local OpenWrt web interface, TV view |
| `webapp.m6plus` | M6+, HbbTV edition |
| `webapp.mitele` | Mitele, HbbTV edition |
| `webapp.module.consent` | Nothing itself; consent banners that open on refusing, for the apps using common consent platforms |
| `webapp.module.hbbtv` | Nothing itself; the HbbTV terminal the HbbTV editions use |
| `webapp.netflix` | Netflix |
| `webapp.orfon` | ORF ON, HbbTV edition |
| `webapp.primevideo` | Prime Video |
| `webapp.raiplay` | RaiPlay, HbbTV edition |
| `webapp.twitch` | Twitch, TV edition |
| `webapp.videoland` | Videoland, smart-TV edition |
| `webapp.youtube` | YouTube TV |

## Installing

Install `repository.dangowrt.webapps`, then pick web apps from Kodi's add-on
browser or the home menu's "Web apps". Kodi keeps them up to date. Without
a packaged repository add-on, add `https://dangowrt.github.io/kodi-webapps/`
as a file source in Kodi and install
`repository.dangowrt.webapps/repository.dangowrt.webapps-<version>.zip` from
it with "Install from zip file".

## Layout

Each top-level directory with an `addon.xml` is one add-on. Web app
modules, `webapp.module.<name>`, hold user scripts that several web apps
share; Kodi installs a module with the first web app that needs it and
updates it on its own. `webapp.module.hbbtv` gives HbbTV editions what
an HbbTV terminal offers, the key codes HbbTV receivers send, the A/V
Control and video/broadcast objects and the application manager, whose
destroyApplication() returns to Kodi, and fits a 1280x720 HbbTV page to
the screen. `webapp.module.consent` opens the consent banners of common
consent platforms on refusing everything optional, and lets a remote
reach every choice. Kodi itself offers the settings it reads in every
web app, the uplink its connections leave through among them. An
add-on's icon is a URL of the service's logo, which Kodi fetches; no
logo is part of this repository.

`tools/build-repo.py <dir>` builds the repository: one zip per add-on with
its SHA-256, and `addons.xml` with its SHA-256. On every push to `main` the
`publish` workflow builds it and deploys it to GitHub Pages. Raise an
add-on's version for Kodi to update it.

## Contributing

`AGENTS.md` describes what is accepted, how a TV edition is ported and
tested, and how pull requests are titled and described; it is written
for people and for the coding agents they direct alike.

## Licence

GPL-2.0-or-later (LICENSE), except `webapp.youtube`, which carries its own
licence files.
