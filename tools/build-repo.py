#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Build the Kodi add-on repository of this tree into a directory.

Every top-level directory holding an addon.xml becomes <id>/<id>-<version>.zip
with a .sha256 next to it; addons.xml and addons.xml.sha256 list them all.
Files in common/ go into each web app lacking them, @ADDON_ID@ replaced.
"""

import hashlib
import html
import os
import sys
import xml.etree.ElementTree as ET
import zipfile

ZIP_DATE = (1980, 1, 1, 0, 0, 0)
TEXT_SUFFIXES = (".xml", ".po")


def files_list(top):
    found = []
    for root, dirs, names in os.walk(top):
        dirs.sort()
        for name in sorted(names):
            path = os.path.join(root, name)
            found.append(os.path.relpath(path, top))
    return found


def addon_files(src, common, addon_id):
    files = {}
    for rel in files_list(common) if common else []:
        data = open(os.path.join(common, rel), "rb").read()
        if rel.endswith(TEXT_SUFFIXES):
            data = data.replace(b"@ADDON_ID@", addon_id.encode())
        files[rel] = data
    for rel in files_list(src):
        files[rel] = open(os.path.join(src, rel), "rb").read()
    return files


def zip_write(path, addon_id, files):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in sorted(files):
            info = zipfile.ZipInfo(addon_id + "/" + rel, ZIP_DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            zf.writestr(info, files[rel])


def sha256_write(path):
    digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
    with open(path + ".sha256", "w") as f:
        f.write("%s  %s\n" % (digest, os.path.basename(path)))


def index_write(directory, entries):
    links = "".join('<li><a href="%s">%s</a></li>\n' % (html.escape(e), html.escape(e))
                    for e in entries)
    with open(os.path.join(directory, "index.html"), "w") as f:
        f.write("<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\">"
                "<title>Index</title></head><body><ul>\n%s</ul></body></html>\n" % links)


def addon_dirs(tree):
    for name in sorted(os.listdir(tree)):
        if os.path.isfile(os.path.join(tree, name, "addon.xml")):
            yield name


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: build-repo.py <output directory>")
    tree = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = sys.argv[1]
    common = os.path.join(tree, "common")
    manifests = []
    top_entries = []

    os.makedirs(out, exist_ok=True)
    for name in addon_dirs(tree):
        src = os.path.join(tree, name)
        manifest = ET.parse(os.path.join(src, "addon.xml")).getroot()
        addon_id = manifest.get("id")
        version = manifest.get("version")
        if addon_id != name:
            sys.exit("%s: add-on id %s differs from its directory" % (name, addon_id))

        target = os.path.join(out, addon_id)
        os.makedirs(target, exist_ok=True)
        zip_name = "%s-%s.zip" % (addon_id, version)
        is_webapp = manifest.find("extension[@point='kodi.webapp']") is not None
        zip_write(os.path.join(target, zip_name), addon_id,
                  addon_files(src, common if is_webapp else None, addon_id))
        sha256_write(os.path.join(target, zip_name))
        index_write(target, [zip_name, zip_name + ".sha256"])

        manifests.append(ET.tostring(manifest, encoding="unicode").strip())
        top_entries.append(addon_id + "/")

    addons_xml = os.path.join(out, "addons.xml")
    with open(addons_xml, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<addons>\n')
        for m in manifests:
            f.write(m + "\n")
        f.write("</addons>\n")
    sha256_write(addons_xml)
    index_write(out, top_entries + ["addons.xml", "addons.xml.sha256"])


if __name__ == "__main__":
    main()
