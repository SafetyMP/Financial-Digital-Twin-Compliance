import { copyFile, mkdir } from 'node:fs/promises';

const publicDirectory = new URL('../public/', import.meta.url);
await mkdir(publicDirectory, { recursive: true });
// The repository root remains the single source for this advisory public index.
await copyFile(new URL('../../../llms.txt', import.meta.url), new URL('llms.txt', publicDirectory));
