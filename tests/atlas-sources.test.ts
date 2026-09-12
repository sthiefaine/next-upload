import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/atlas-assets/[id]/sources/route';
import { GET as display } from '../src/app/api/display/[...path]/route';
import { middleware } from '../src/middleware';

test('Atlas réutilise uploads, garde les sources privées et préserve les podcasts', async () => {
  const cwd = process.cwd(), env = { dir: process.env.ATLAS_SOURCES_DIR, token: process.env.UPLOADFILES_WRITE_TOKEN };
  const dir = await mkdtemp(path.join(tmpdir(), 'next-upload-atlas-'));
  const ctx = { params: Promise.resolve({ id: 'unite_barge_base' }) };
  const url = 'http://localhost/api/atlas-assets/unite_barge_base/sources';
  try {
    process.chdir(dir); delete process.env.ATLAS_SOURCES_DIR; process.env.UPLOADFILES_WRITE_TOKEN = 'test-atlas';
    const auth = { Authorization: 'Bearer test-atlas' };
    await mkdir(path.join(dir, 'public/uploads/podcasts'), { recursive: true });
    await writeFile(path.join(dir, 'public/uploads/podcasts/existant.txt'), 'podcast intact');
    assert.equal((await GET(new Request(url), ctx)).status, 401);
    assert.deepEqual(await (await GET(new Request(url, { headers: auth }), ctx)).json(), { sources: [] });
    const json = JSON.stringify({ asset: { version: '2.0' }, meshes: [{ primitives: [] }] });
    const chunk = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4, ' '));
    const glb = Buffer.alloc(20 + chunk.length);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(chunk.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); chunk.copy(glb, 20);
    const result = await POST(new Request(url, { method: 'POST', headers: { ...auth, 'Content-Type': 'model/gltf-binary' }, body: new Uint8Array(glb) }), ctx);
    assert.equal(result.status, 201);
    const { source } = await result.json();
    assert.deepEqual(await readFile(path.join(dir, 'public/uploads/atlas/sources/unite_barge_base', source.revision + '.glb')), glb);
    const download = await GET(new Request(url + '?revision=' + source.revision, { headers: auth }), ctx);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), glb);
    for (const prefix of ['/uploads', '/api/display']) {
      assert.equal(middleware(new NextRequest('http://localhost' + prefix + '/atlas/sources/unite_barge_base/' + source.revision + '.glb')).status, 404);
      assert.equal(middleware(new NextRequest('http://localhost' + prefix + '/podcasts/existant.txt')).status, 200);
    }
    const blocked = await display(new NextRequest('http://localhost/api/display/atlas/sources/test.glb'), { params: Promise.resolve({ path: ['atlas', 'sources', 'test.glb'] }) });
    assert.equal(blocked.status, 404);
    const podcast = await display(new NextRequest('http://localhost/api/display/podcasts/existant.txt'), { params: Promise.resolve({ path: ['podcasts', 'existant.txt'] }) });
    assert.equal(await podcast.text(), 'podcast intact');
  } finally {
    process.chdir(cwd);
    if (env.dir === undefined) delete process.env.ATLAS_SOURCES_DIR; else process.env.ATLAS_SOURCES_DIR = env.dir;
    if (env.token === undefined) delete process.env.UPLOADFILES_WRITE_TOKEN; else process.env.UPLOADFILES_WRITE_TOKEN = env.token;
    await rm(dir, { recursive: true, force: true });
  }
});
