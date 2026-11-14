# IBM Plex Sans assets

Unmodified normal-style IBM Plex Sans Regular (400), Medium (500), and SemiBold
(600) from the official `@ibm/plex-sans@1.1.0` package. Complete WOFF2 files include
Latin glyphs and preserve the upstream character coverage. The five legacy
consoles load these files through `next/font/local` with `display: "swap"` so
production builds do not depend on Google Fonts CSS or font URL formats.

- Upstream: https://github.com/IBM/plex/tree/master/packages/plex-sans
- Pinned archive: https://registry.npmjs.org/@ibm/plex-sans/-/plex-sans-1.1.0.tgz
- Archive integrity (verified before extraction):
  `sha512-WPgvO6Yfj2w5YbhyAr1tv95RUz4LRJlqN+CmYvBglabXteufP1D1E9BABMde+ZIKdRbFJDoKF5eQzfhpnbgZcQ==`
- License: SIL Open Font License 1.1; the upstream copyright notice and full license
  are included in `LICENSE.txt`. Font binaries are unchanged.
- Vendored: 2026-11-14.

The shared console package's existing Docker COPY includes this directory. No
runtime dependency or build-time font download is required.

| Local file | Archive member | SHA-256 |
| --- | --- | --- |
| `IBMPlexSans-Regular.woff2` | `package/fonts/complete/woff2/IBMPlexSans-Regular.woff2` | `ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a` |
| `IBMPlexSans-Medium.woff2` | `package/fonts/complete/woff2/IBMPlexSans-Medium.woff2` | `5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d` |
| `IBMPlexSans-SemiBold.woff2` | `package/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2` | `f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205` |
| `LICENSE.txt` | `package/LICENSE.txt` | `7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da` |
