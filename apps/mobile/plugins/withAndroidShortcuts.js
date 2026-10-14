/* eslint-disable @typescript-eslint/no-require-imports -- config plugins run in Node as CommonJS */
// Static launcher shortcuts (long-press the app icon), brand handoff "marca" 4.5:
// dictate, photo, +250 ml water, repeat the usual meal. Each one opens bocado://shortcut/<id>,
// handled by src/app/shortcut/[action].tsx.
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} = require('@expo/config-plugins');

// Short labels show in the launcher's popup (≈10 characters fit), long ones where there is room.
const SHORTCUTS = [
  { id: 'listen', short: 'Dictar', long: 'Dictar comida' },
  { id: 'camera', short: 'Sacar foto', long: 'Sacar foto' },
  { id: 'water', short: '+250 ml agua', long: 'Sumar 250 ml de agua' },
  { id: 'usual', short: 'Lo de siempre', long: 'Repetir lo de siempre' },
];

const shortcutsXml = (pkg, scheme) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${SHORTCUTS.map(
  (s) => `  <shortcut
    android:shortcutId="${s.id}"
    android:enabled="true"
    android:icon="@drawable/ic_shortcut_${s.id}"
    android:shortcutShortLabel="@string/shortcut_${s.id}_short"
    android:shortcutLongLabel="@string/shortcut_${s.id}_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:data="${scheme}://shortcut/${s.id}"
      android:targetPackage="${pkg}"
      android:targetClass="${pkg}.MainActivity" />
  </shortcut>`,
).join('\n')}
</shortcuts>
`;

function withShortcutFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      const pkg = cfg.android.package;
      const scheme = Array.isArray(cfg.scheme) ? cfg.scheme[0] : cfg.scheme;
      fs.mkdirSync(path.join(res, 'xml'), { recursive: true });
      fs.writeFileSync(path.join(res, 'xml/shortcuts.xml'), shortcutsXml(pkg, scheme));
      const drawable = path.join(res, 'drawable-xxxhdpi');
      fs.mkdirSync(drawable, { recursive: true });
      for (const s of SHORTCUTS) {
        fs.copyFileSync(
          path.join(cfg.modRequest.projectRoot, `assets/shortcuts/ic_shortcut_${s.id}.png`),
          path.join(drawable, `ic_shortcut_${s.id}.png`),
        );
      }
      return cfg;
    },
  ]);
}

function withShortcutMeta(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity['meta-data'] = (activity['meta-data'] ?? []).filter(
      (m) => m.$['android:name'] !== 'android.app.shortcuts',
    );
    activity['meta-data'].push({
      $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' },
    });
    return cfg;
  });
}

function withShortcutStrings(config) {
  return withStringsXml(config, (cfg) => {
    for (const s of SHORTCUTS) {
      cfg.modResults = AndroidConfig.Strings.setStringItem(
        [
          { $: { name: `shortcut_${s.id}_short`, translatable: 'false' }, _: s.short },
          { $: { name: `shortcut_${s.id}_long`, translatable: 'false' }, _: s.long },
        ],
        cfg.modResults,
      );
    }
    return cfg;
  });
}

module.exports = function withAndroidShortcuts(config) {
  return withShortcutStrings(withShortcutMeta(withShortcutFiles(config)));
};
