# Publishing updates to the stores

**Current setup:** Firefox Add-ons is **automatic**. The Chrome Web Store is **manual**: after each
tagged release, download `ascii-studio-chrome-X.Y.Z.zip` from the GitHub Release and upload it at
chrome.google.com/webstore/devconsole → ASCII Studio → **Package → Upload new package**, then
**Submit for review**. (To automate Chrome later, follow "Chrome Web Store keys" below; Google requires
the OAuth app to be in production, which may need ownership verification of the homepage.)

Once the secrets below are set, a release is:
```bash
python3 sync_web.py ../ascii-studio-web   # pick up the latest studio/scenes (if they changed)
# bump "version" in manifest.json, e.g. 1.5.0 -> 1.6.0
git commit -am "v1.6.0"
git tag v1.6.0
git push --follow-tags
```
GitHub Actions (`.github/workflows/release.yml`) then builds both packages, runs Mozilla's checker,
uploads to the **Chrome Web Store** and **Firefox Add-ons**, and attaches the zips to a GitHub Release.
Each store reviews the new version (Chrome: hours to a few days; Firefox: often minutes, sometimes
longer). After approval, browsers update installed copies by themselves.

- The version lives in **`manifest.json`** only. The workflow stops if the tag doesn't match it.
- Each upload needs a **new, higher** version; the stores reject a version they've already seen.
- A store whose secrets aren't set is **skipped** with a warning, so you can set them up one at a time.
- **Dry run:** GitHub → Actions → *Publish extension* → **Run workflow**. This builds and checks only,
  uploads nothing, and saves the zips as a downloadable artifact.
- Your store listing text, images and privacy answers aren't touched; only the code is replaced.

## Secrets
Add them in **GitHub → ascii-studio-extension → Settings → Secrets and variables → Actions →
New repository secret**, or with `gh secret set NAME -R zkp6c4vr89-coder/ascii-studio-extension`.

| Secret | Value |
|---|---|
| `CWS_EXTENSION_ID` | `hakkebdfegildgkhpmmoebncgjefcnmh` |
| `CWS_PUBLISHER_ID` | Your Chrome Web Store publisher ID (step 6 below) |
| `CWS_CLIENT_ID` | OAuth client ID (step 4) |
| `CWS_CLIENT_SECRET` | OAuth client secret (step 4) |
| `CWS_REFRESH_TOKEN` | OAuth refresh token (step 5) |
| `AMO_JWT_ISSUER` | Firefox "JWT issuer", like `user:12345678:123` |
| `AMO_JWT_SECRET` | Firefox "JWT secret" |

None of these should ever be committed. If one leaks, revoke it at its source (Google Cloud /
addons.mozilla.org) and make a new one.

## Chrome Web Store keys (about 10 minutes, once)
1. Go to **console.cloud.google.com**, sign in with the Google account that owns the extension, and
   **create a project** (any name, e.g. "ascii-studio-publishing").
2. **APIs & Services → Library**, search for **Chrome Web Store API**, and click **Enable**.
3. **APIs & Services → OAuth consent screen** (also called "Google Auth Platform"): choose **External**,
   give it a name and your email, and add your own Google account as a **test user**. Then click
   **Publish app** to move it to **In production**.
   > ⚠️ If you leave it in *Testing*, Google expires the refresh token after **7 days** and uploads
   > start failing. You don't need Google to verify the app; it's only used by you.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Desktop app**.
   Copy the **Client ID** and **Client secret** into `CWS_CLIENT_ID` and `CWS_CLIENT_SECRET`.
5. Get a refresh token. In a terminal:
   ```bash
   npx chrome-webstore-upload-keys
   ```
   Paste the client ID and secret, sign in with the same Google account in the browser that opens,
   allow access, and copy the **refresh token** it prints into `CWS_REFRESH_TOKEN`.
   *(If that tool ever stops working: use developers.google.com/oauthplayground. Under the settings
   gear tick "Use your own OAuth credentials", authorise the scope
   `https://www.googleapis.com/auth/chromewebstore`, then "Exchange authorization code for tokens".
   For this route, make the OAuth client type **Web application** with redirect URI
   `https://developers.google.com/oauthplayground`.)*
6. Your **publisher ID**: open the Chrome Web Store developer dashboard
   (chrome.google.com/webstore/devconsole). The long ID in the address bar after `/devconsole/` is
   your publisher ID. Put it in `CWS_PUBLISHER_ID`.

## Firefox Add-ons keys (2 minutes, once)
1. Sign in at **addons.mozilla.org**, go to **Developer Hub → Tools → Manage API Keys**
   (addons.mozilla.org/developers/addon/api/key/).
2. Click **Generate new credentials**.
3. Copy **JWT issuer** into `AMO_JWT_ISSUER` and **JWT secret** into `AMO_JWT_SECRET`.

While the first Firefox version is still in review, new versions simply queue behind it.

## When something fails
Open the run under **Actions** and look at the failed step:
- *"Tag … doesn't match manifest.json"*: bump `manifest.json`, commit, delete and re-push the tag
  (`git tag -d v1.6.0 && git push --delete origin v1.6.0`, then tag again).
- *Chrome 401 / invalid_grant*: the refresh token expired or was revoked. Check step 3 (In production)
  and redo step 5.
- *Chrome "item is pending review"*: a previous version is still in review; wait for it, then re-run.
- *Firefox "version already exists"*: that version was already submitted; bump and tag again.
