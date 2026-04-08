# Bugfix Requirements Document

## Introduction

The production Docker build throws "Minified React error #130: Element type is invalid — expected a string (for built-in components) or a class/function (for composite components) but got: undefined." This is accompanied by failed asset loading (`net::ERR_ABORTED` for `/assets/*.js` and `*.css`) and service worker errors ("Failed to convert value to 'Response'").

Root cause investigation reveals **two compounding issues**:

1. **Stale service worker asset cache** — `dist/service-worker.js` hardcodes `/assets/index.js` and `/assets/index.css` in its cache manifest, but the actual Vite build produces content-hashed filenames (`/assets/index-KCt3oKlR.js`, `/assets/index-CR71Dtao.css`). When the SW intercepts requests for the hashed filenames, it finds no cache match, attempts a network fetch, and the `cache.addAll()` during install fails entirely because the unhashed paths don't exist — leaving the browser with no valid JS bundle. React never loads, so every imported component resolves to `undefined`.

2. **Dual service worker registration** — `dist/index.html` registers `/service-worker.js` inline via a `<script>` tag, while `src/hooks/useOffline.js` also registers `/sw.js` programmatically. Two competing SWs with the same cache name `pulse-pro-v1` race to control the page, causing unpredictable cache state and the "Failed to convert value to 'Response'" errors when a SW tries to respond with a cached entry that is missing or corrupt.

The React error #130 is a **symptom**, not the root cause. The undefined component is React itself (or the entire app module) because the JS bundle never successfully loads.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Docker production container serves the app and a service worker from a previous session is active THEN the system serves a stale cached `index.html` that references `/assets/index.js` and `/assets/index.css` (unhashed paths that do not exist in the build output), causing `net::ERR_ABORTED` for all JS and CSS assets

1.2 WHEN `service-worker.js` runs its `install` event THEN the system attempts `cache.addAll(['/assets/index.css', '/assets/index.js'])` which fails with a network error because those unhashed paths return 404, leaving the SW in a broken install state and the page with no JS bundle

1.3 WHEN the JS bundle fails to load THEN the system throws "Minified React error #130" because every component import in `App.jsx` resolves to `undefined` (the module graph never executes)

1.4 WHEN `useOffline.js` registers `/sw.js` at runtime while `index.html` has already registered `/service-worker.js` THEN the system has two competing service workers with the same cache name `pulse-pro-v1`, producing "Failed to convert value to 'Response'" errors and non-deterministic asset serving

1.5 WHEN `vite.config.js` sets `process.env.NODE_ENV` to `"production"` as a hard-coded `define` constant THEN the system always runs in production mode even during local development, suppressing the non-minified React error messages that would identify the exact undefined component

### Expected Behavior (Correct)

2.1 WHEN the Docker production container serves the app THEN the system SHALL serve the correct content-hashed asset filenames (`/assets/index-[hash].js`, `/assets/index-[hash].css`) that match what `index.html` references, with no `ERR_ABORTED` errors

2.2 WHEN `service-worker.js` runs its `install` event THEN the system SHALL only cache assets that actually exist in the build output; the cache manifest SHALL NOT reference unhashed asset paths that Vite does not produce

2.3 WHEN the JS bundle loads successfully THEN the system SHALL render the React application without error #130, because all component imports resolve to valid functions

2.4 WHEN the application initialises THEN the system SHALL have exactly one active service worker; the inline SW registration in `index.html` and the programmatic registration in `useOffline.js` SHALL NOT both be active simultaneously

2.5 WHEN running in local development mode THEN the system SHALL display non-minified React errors with the exact component name, enabling fast diagnosis

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user loads the app with a warm browser cache and no stale service worker THEN the system SHALL CONTINUE TO render the full dashboard without any loading errors

3.2 WHEN the user is online and no service worker interference is present THEN the system SHALL CONTINUE TO fetch stories, run the pipeline, and display all views (Analytics, Calendar, Media, Research, Podcast, Settings) correctly

3.3 WHEN the nginx config serves `/api/` requests THEN the system SHALL CONTINUE TO proxy them to the backend at `http://backend:5000` without modification

3.4 WHEN `main.jsx` unregisters all service workers on startup THEN the system SHALL CONTINUE TO clear stale registrations so that a fresh SW can take over on the next load

3.5 WHEN the Vite build runs `npm run build` THEN the system SHALL CONTINUE TO produce a single `index-[hash].js` and `index-[hash].css` in `/dist/assets/` as configured by `rollupOptions` in `vite.config.js`
