/* ══════════════════════════════════════════════════════════════════════
   JPEG metadata stripping (P2.3): a field surveyor's phone embeds GPS — and
   often a home address in an earlier photo — inside the EXIF APP1 segment.
   The authoritative coordinate is the measured one, never the photo's, so
   every APP1 (EXIF and XMP) segment is dropped before the bytes are stored.
   Pure and testable; JPEG segmentation is stable and self-describing.
   ══════════════════════════════════════════════════════════════════════ */

/** Remove every APP1 (EXIF/XMP) segment from a JPEG. Non-JPEG input is
    returned unchanged (it carries no EXIF segment to strip). */
export function stripJpegExif(buf: Buffer): Buffer {
  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf; // not a JPEG
  const out: Buffer[] = [buf.subarray(0, 2)]; // SOI
  let i = 2;
  while (i < buf.length) {
    if (i + 2 > buf.length) { out.push(buf.subarray(i)); break; }   // truncated tail — keep it
    if (buf[i] !== 0xff) { out.push(buf.subarray(i)); break; }      // image data reached
    const seg = buf[i + 1]!;
    // standalone markers without a length (RST0-7, TEM)
    if (seg === 0x01 || (seg >= 0xd0 && seg <= 0xd7)) { out.push(buf.subarray(i, i + 2)); i += 2; continue; }
    // SOS (start of scan) and EOI: everything from here is image data — keep it
    if (seg === 0xda || seg === 0xd9) { out.push(buf.subarray(i)); break; }
    if (i + 4 > buf.length) { out.push(buf.subarray(i)); break; }   // truncated length — keep it
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) { out.push(buf.subarray(i)); break; }              // malformed: keep the rest verbatim
    if (seg === 0xe1) { i += 2 + len; continue; }                   // drop APP1 (EXIF / XMP)
    out.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat(out);
}
