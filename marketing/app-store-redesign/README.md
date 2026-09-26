# Konvo App Store redesign

Open `index.html` directly in a browser. It is self-contained and works without a server or internet connection. The file includes three directions, five screenshots per direction, a first-three comparison, thumbnail review, a full-size inspector, individual PNG downloads, and ZIP downloads.

- **Electric:** blue, direct, product-led. Recommended first conversion test.
- **After hours:** charcoal and lime, focused on control over scrolling.
- **Good company:** warm paper and yellow, focused on staying connected.

`exports/` contains the 15 rendered PNGs and `konvo-all-directions.zip`. Every PNG is 1320 × 2868, RGB, with no alpha channel. These are design-review exports: replace lower-resolution source phone images with fresh captures of the shipping app before final submission. Copy and graphics are rendered at full resolution.

## Editing

Edit `gallery.template.html`, then run from the repository root:

```sh
python3 marketing/app-store-redesign/build.py
```

The builder embeds existing repository product assets and downloaded reference thumbnails into `index.html`. It uses only Python's standard library. The exported PNGs are snapshots; after editing, regenerate them using the gallery's download controls.

The revised compositions use unobstructed phone imagery with all marketing copy above the device. Floating UI enlargements, benefit cards, and bottom pill captions have been removed from all three directions.

No production application files, dependencies, or app behavior were changed.

## Research

The supplied 16-page screenshot optimization playbook informed the copy, sequence, contrast, product imagery, thumbnail check, and test recommendation. The expandable sections in the HTML include the current Konvo screenshots, visual references from Opal and Cal AI, source links, revenue-estimate qualifications, and a proposed Product Page Optimization experiment. Commercial success is not evidence of screenshot causality.

References inspected September 19, 2026:

- [Konvo App Store listing](https://apps.apple.com/us/app/konvo-dms-only/id6794756261)
- [Opal App Store listing](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230)
- [Cal AI App Store listing](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616)
- [Cal AI revenue estimate, October 24, 2025](https://www.paywalls.com/paywalls/cal-ai-calorie-tracker)
- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Apple Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/)

## Verification

The final gallery was rendered in Chrome. All three tabs, comparison, thumbnail mode, dialog navigation, and closing behavior were exercised. A 390-pixel viewport had no page-level horizontal overflow. All embedded images loaded. Every screenshot's text bounds were checked for horizontal clipping, and all 15 exports were visually reviewed. Export dimensions, RGB color mode, and ZIP CRC integrity were verified. Existing app tests were not run because production code is untouched.
