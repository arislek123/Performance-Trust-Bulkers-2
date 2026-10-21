# Performance Evaluation Tool

Static website for GitHub Pages. All website files are in this directory; no application subfolders or local installation are required.

Upload the extracted files to the root of the performance website repository. In GitHub Settings → Pages, select deployment from the `main` branch and `/(root)`. Open the resulting HTTPS URL after publication.

Firebase project: `performance-tool-291b7`. The dedicated Firebase Authentication user and web configuration are already assigned in `firebase-config.js`. Username: `TrustBulkers`. Passwords are managed in Firebase Authentication and are not included in these files.

Complete the one-time Firestore setup from the separate private setup package before using the tool. That package must remain private and must not be uploaded to GitHub. Remove obsolete website files containing old public shop-test references when replacing an earlier deployment.

HTML, CSS and JavaScript are public static assets. Reference data is loaded from Firestore only after authorization; Firestore rules enforce the assigned UID. Imported reports remain in the local browser. An authorized user can save information received by their browser.

The included third-party license files belong with their components. No analytics integration is initialized.
