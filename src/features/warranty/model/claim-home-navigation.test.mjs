import assert from "node:assert/strict";
import { test } from "node:test";
import { installClaimHomeNavigation, returnHomeFromClaim } from "./claim-home-navigation.ts";

function browserAt(pathname = "/klaim-garansi") {
  const listeners = new Set();
  const pushes = [];
  const replacements = [];
  const originalState = { frameworkState: { route: "claim" } };
  let backs = 0;
  const browser = {
    location: { pathname, href: `https://support.example${pathname}?sku=SKU-1`, replace: (url) => replacements.push(url) },
    history: {
      state: originalState,
      pushState(state, _title, url) { this.state = state; pushes.push({ state, url }); },
      back() { backs++; },
    },
    addEventListener(type, listener) { assert.equal(type, "popstate"); listeners.add(listener); },
    removeEventListener(type, listener) { assert.equal(type, "popstate"); listeners.delete(listener); },
  };
  return { browser, pushes, replacements, originalState, backs: () => backs,
    pop(state = originalState) { for (const listener of listeners) listener({ state }); } };
}

test("claim Back preserves framework state and adds only one entry across remounts", () => {
  const env = browserAt();
  const cleanup = installClaimHomeNavigation(env.browser);
  assert.equal(env.pushes.length, 1);
  assert.equal(env.pushes[0].url, env.browser.location.href);
  assert.deepEqual(env.browser.history.state.frameworkState, env.originalState.frameworkState);
  assert.deepEqual(env.originalState, { frameworkState: { route: "claim" } });
  cleanup();
  installClaimHomeNavigation(env.browser);
  assert.equal(env.pushes.length, 1);
  env.pop();
  assert.deepEqual(env.replacements, ["/"]);
  env.pop();
  assert.deepEqual(env.replacements, ["/"]);
});

test("the visible home action consumes the added entry and uses the same home redirect", () => {
  const env = browserAt();
  assert.equal(returnHomeFromClaim(env.browser), false);
  installClaimHomeNavigation(env.browser);
  assert.equal(returnHomeFromClaim(env.browser), true);
  assert.equal(env.backs(), 1);
  env.pop();
  assert.deepEqual(env.replacements, ["/"]);
});

test("forward restoration, other routes, and unmounted forms do not redirect", () => {
  const env = browserAt();
  const cleanup = installClaimHomeNavigation(env.browser);
  env.pop(env.browser.history.state);
  assert.deepEqual(env.replacements, []);
  cleanup();
  env.pop();
  assert.deepEqual(env.replacements, []);
  const home = browserAt("/");
  installClaimHomeNavigation(home.browser);
  assert.equal(returnHomeFromClaim(home.browser), false);
  assert.equal(home.pushes.length, 0);
  home.pop();
  assert.deepEqual(home.replacements, []);
});
