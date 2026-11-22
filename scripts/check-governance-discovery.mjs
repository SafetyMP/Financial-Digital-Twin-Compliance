import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('apps/governance-console/out/', root);
const canonical = 'https://safetymp.github.io/Financial-Digital-Twin-Compliance/';
const html = await readFile(new URL('index.html', output), 'utf8');
const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag]) =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])));
const meta = (name) => tags.find((tag) => tag.name === name || tag.property === name)?.content;

assert.equal(tags.filter((tag) => tag.rel === 'canonical').length, 1, 'Exactly one canonical URL');
assert.equal(tags.find((tag) => tag.rel === 'canonical')?.href, canonical);
assert.match(html, /<title>Financial Digital Twin \| Financial Governance Workspace<\/title>/);
assert.match(meta('description') ?? '', /synthetic governance workspace for financial institutions/i);
assert.equal(meta('og:url'), canonical);
assert.equal(meta('og:image'), `${canonical}social-card.png`);
assert.equal(meta('og:image:width'), '1200');
assert.equal(meta('og:image:height'), '630');
assert.equal(meta('twitter:card'), 'summary_large_image');
assert.equal(meta('twitter:image'), `${canonical}social-card.png`);
assert.equal(meta('robots'), 'index, follow');
assert.equal(tags.find((tag) => tag.rel === 'icon')?.href, `${canonical}favicon.svg`);
assert.equal(tags.find((tag) => tag.rel === 'sitemap')?.href, `${canonical}sitemap.xml`);
assert.equal(tags.find((tag) => tag.rel === 'alternate' && tag.type === 'text/plain')?.href, `${canonical}llms.txt`);
assert.match(html, /All financial data is synthetic/);

const jsonScripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
assert.equal(jsonScripts.length, 1, 'One static structured-data graph');
const schema = JSON.parse(jsonScripts[0][1]);
assert.equal(schema['@context'], 'https://schema.org');
const app = schema['@graph'].find((item) => item['@type'] === 'WebApplication');
assert.equal(app.url, canonical);
assert.match(app.description, /synthetic/i);
assert.equal(app.operatingSystem, 'Web browser');
assert.ok(!app.offers && !app.aggregateRating, 'No invented offers or ratings');
const source = schema['@graph'].find((item) => item['@type'] === 'SoftwareSourceCode');
assert.equal(source.codeRepository, 'https://github.com/SafetyMP/Financial-Digital-Twin-Compliance');

const sitemap = await readFile(new URL('sitemap.xml', output), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]), [canonical, `${canonical}workspace/`]);
assert.equal(await readFile(new URL('llms.txt', output), 'utf8'), await readFile(new URL('llms.txt', root), 'utf8'), 'Published index must exactly match the repository source');
const png = await readFile(new URL('social-card.png', output));
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
assert.match(await readFile(new URL('favicon.svg', output), 'utf8'), /<svg/);
console.log('Governance discovery export verified: canonical, metadata, structured data, sitemap, local assets, and documentation index.');
