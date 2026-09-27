# Mafioso Android

Independent Android launcher + Play Billing bridge ported from Junction.
The game's existing frontend/backend remain authoritative and unchanged.
Build from this directory using JDK 17+ and Android SDK 36:
`./gradlew :app:assembleDebug`.

Uses application ID `com.splinch.mafioso`, not Junction's application ID.
Before Play release, register this app and its existing `mafioso_points_*`
products, configure signing and update the backend Google Play package setting.
The current infrastructure default `com.splinch.junction` belongs to the old
embedded app. Existing purchases must remain verifiable under their original
package; plan dual-package verification/migration before releasing this wrapper.
No production billing configuration or deployment has been changed here.
No live purchases, sign-in or backend mutations were exercised during extraction.
Local WebView sessions do not migrate across Android application sandboxes;
sign in with the same game account to recover server-side progress.
