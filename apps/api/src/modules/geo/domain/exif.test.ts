/* EXIF stripping tests — a surveyor's phone embeds GPS (and personal data) in
   the JPEG APP1 segment; the stored photo must carry none of it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripJpegExif } from './exif.js';

/** Build a minimal JPEG: SOI, an APP1 (EXIF) segment carrying a marker, then
    an APP0 (JFIF) segment, then SOS + a few bytes of fake image data + EOI. */
function jpegWithExif(exifPayload: string): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const app1data = Buffer.from('Exif\0\0' + exifPayload, 'binary');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), len(app1data.length), app1data]);
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0]), len(4), Buffer.from('JFIF', 'binary')]);
  const sos = Buffer.from([0xff, 0xda]);
  const data = Buffer.from('fake-image-bytes');
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app1, app0, sos, data, eoi]);
}
const len = (n: number) => { const b = Buffer.alloc(2); b.writeUInt16BE(n, 0); return b; };

test('the EXIF APP1 segment is removed; the rest of the JPEG survives', () => {
  const jpeg = jpegWithExif('GPS latitude 31.2');
  const out = stripJpegExif(jpeg);
  assert.ok(!out.includes(Buffer.from('Exif\0\0', 'binary')), 'EXIF marker gone');
  assert.ok(out.includes(Buffer.from('GPS latitude 31.2', 'binary')) === false, 'GPS payload gone');
  assert.ok(out.includes(Buffer.from('JFIF', 'binary')), 'APP0 kept');
  assert.ok(out.includes(Buffer.from('fake-image-bytes', 'binary')), 'image data kept');
  assert.equal(out[0], 0xff);
  assert.equal(out[1], 0xd8);
});

test('non-JPEG input is returned unchanged', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  assert.equal(stripJpegExif(png), png);
});

test('a JPEG with no APP1 segment is unchanged', () => {
  const soi = Buffer.from([0xff, 0xd8]);
  const eoi = Buffer.from([0xff, 0xd9]);
  const jpeg = Buffer.concat([soi, eoi]);
  assert.ok(stripJpegExif(jpeg).equals(jpeg), 'byte-for-byte identical');
});
