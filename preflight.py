#!/usr/bin/env python3
"""
preflight.py - verify an APK is release-grade WITHOUT the Android SDK.

Parses the binary AndroidManifest.xml (AXML) and the APK Signing Block directly.
Prints package / versions / SDK levels / permissions / services / signature schemes
/ signer certificate, then a PASS-FAIL verdict.

usage: python3 preflight.py app-release.apk
"""
import sys, zipfile, struct, hashlib, io

# ---------------- AXML ----------------
STRING_POOL = 0x001C0001
START_TAG   = 0x00100102

def u32(b, o): return struct.unpack_from('<I', b, o)[0]
def u16(b, o): return struct.unpack_from('<H', b, o)[0]

def parse_string_pool(buf, off):
    chunk_size = u32(buf, off + 4)
    count      = u32(buf, off + 8)
    flags      = u32(buf, off + 16)
    strs_start = u32(buf, off + 20)
    utf8 = bool(flags & (1 << 8))
    offs = [u32(buf, off + 28 + 4 * i) for i in range(count)]
    base = off + strs_start
    out = []
    for o in offs:
        p = base + o
        if utf8:
            n = buf[p]
            p += 1
            if n & 0x80:
                n = ((n & 0x7F) << 8) | buf[p]; p += 1
            ln = buf[p]; p += 1
            if ln & 0x80:
                ln = ((ln & 0x7F) << 8) | buf[p]; p += 1
            out.append(buf[p:p + ln].decode('utf-8', 'replace'))
        else:
            ln = u16(buf, p); p += 2
            if ln & 0x8000:
                ln = ((ln & 0x7FFF) << 16) | u16(buf, p); p += 2
            out.append(buf[p:p + ln * 2].decode('utf-16-le', 'replace'))
    return out, off + chunk_size

def axml_tags(buf):
    """yield (tag_name, {attr_name: value}) for every start tag."""
    off = 8
    strings = []
    while off < len(buf):
        typ = u16(buf, off)
        size = u32(buf, off + 4)
        if typ == 0x0001:  # string pool
            strings, _ = parse_string_pool(buf, off)
        elif typ == 0x0102:  # start tag
            ext = off + u16(buf, off + 2)          # attrExt starts after the chunk header
            name = strings[u32(buf, ext + 4)]
            acount = u16(buf, ext + 12)
            astart = ext + u16(buf, ext + 8)        # attributeStart is relative to attrExt
            attrs = {}
            for i in range(acount):
                a = astart + i * 20
                nm = strings[u32(buf, a + 4)]
                raw = u32(buf, a + 8)
                dtype = buf[a + 15]
                data = u32(buf, a + 16)
                if dtype == 0x03:       # string
                    val = strings[data] if data < len(strings) else (strings[raw] if raw != 0xFFFFFFFF else '')
                elif dtype == 0x12:     # boolean
                    val = (data != 0)
                elif dtype == 0x10:     # int
                    val = data
                else:
                    val = data
                attrs[nm] = val
            yield name, attrs
        if size == 0:
            break
        off += size

# ---------------- signing block ----------------
EOCD = b'PK\x05\x06'
MAGIC = b'APK Sig Block 42'
SCHEMES = {0x7109871a: 'v2', 0xf05368c0: 'v3', 0x1b93ad61: 'v4', 0x1e4d0d0f: 'v3.1'}

def signing_block(path):
    data = open(path, 'rb').read()
    i = data.rfind(EOCD)
    if i < 0:
        return None, {}
    cd_off = struct.unpack_from('<I', data, i + 16)[0]
    if data[cd_off - 16:cd_off] != MAGIC:
        return data, {}
    size_after = struct.unpack_from('<Q', data, cd_off - 24)[0]
    start = cd_off - size_after - 8
    size_before = struct.unpack_from('<Q', data, start)[0]
    blk = data[start + 8:start + 8 + size_before - 24]
    found = {}
    p = 0
    while p + 12 <= len(blk):
        ln = struct.unpack_from('<Q', blk, p)[0]
        if ln <= 4 or p + 8 + ln > len(blk) + 8:
            break
        bid = struct.unpack_from('<I', blk, p + 8)[0]
        found[bid] = blk[p + 12:p + 8 + ln]
        p += 8 + ln
    return data, found

def certs_from_v2v3(payload):
    """walk length-prefixed structures and pull anything that parses as an X.509 cert."""
    from cryptography import x509
    out = []
    for i in range(0, max(0, len(payload) - 4)):
        if payload[i] != 0x30 or payload[i + 1] != 0x82:
            continue
        ln = struct.unpack_from('>H', payload, i + 2)[0] + 4
        try:
            c = x509.load_der_x509_certificate(payload[i:i + ln])
            out.append(c)
        except Exception:
            pass
    return out

def main(path):
    print('=' * 62)
    print('APK PREFLIGHT  ', path)
    print('=' * 62)
    fails, warns = [], []

    z = zipfile.ZipFile(path)
    raw = z.read('AndroidManifest.xml')
    app = {}
    manifest = {}
    perms, services, activities = [], [], []
    for tag, attrs in axml_tags(raw):
        if tag == 'manifest':
            manifest = attrs
        elif tag == 'application':
            app = attrs
        elif tag == 'uses-permission':
            perms.append(attrs.get('name'))
        elif tag == 'uses-sdk':
            manifest.setdefault('_sdk', attrs)
        elif tag == 'service':
            services.append(attrs.get('name'))
        elif tag == 'activity':
            activities.append(attrs.get('name'))

    sdk = manifest.get('_sdk', {})
    size = __import__('os').path.getsize(path)
    sha = hashlib.sha256(open(path, 'rb').read()).hexdigest()

    print(f"package       {manifest.get('package')}")
    print(f"versionName   {manifest.get('versionName')}")
    print(f"versionCode   {manifest.get('versionCode')}")
    print(f"minSdk        {sdk.get('minSdkVersion')}   targetSdk {sdk.get('targetSdkVersion')}")
    print(f"size          {size} bytes  ({size/1048576:.2f} MB)")
    print(f"sha256        {sha}")
    dbg = app.get('debuggable', False)
    print(f"debuggable    {dbg}")
    print(f"permissions   {', '.join(str(p) for p in perms) or '(none)'}")
    print(f"services      {', '.join(str(s) for s in services) or '(none)'}")
    print(f"activities    {len(activities)}")

    if dbg is True or dbg == 1:
        fails.append('android:debuggable="true" - Play Protect will block install')

    # signatures
    data, blocks = signing_block(path)
    schemes = [SCHEMES[b] for b in blocks if b in SCHEMES]
    v1 = [n for n in z.namelist() if n.upper().startswith('META-INF/') and n.upper().endswith(('.RSA', '.DSA', '.EC'))]
    if v1:
        schemes.insert(0, 'v1')
    print(f"sig schemes   {', '.join(schemes) if schemes else 'NONE'}")

    certs = []
    for bid in (0xf05368c0, 0x7109871a):
        if bid in blocks:
            certs = certs_from_v2v3(blocks[bid])
            if certs:
                break
    if not certs and v1:
        from cryptography import x509
        from cryptography.hazmat.primitives.serialization import pkcs7
        try:
            certs = pkcs7.load_der_pkcs7_certificates(z.read(v1[0]))
        except Exception:
            certs = []

    if certs:
        c = certs[0]
        subj = c.subject.rfc4514_string()
        print(f"signer        {subj}")
        print(f"valid         {c.not_valid_before_utc.date()} -> {c.not_valid_after_utc.date()}")
        fp = c.fingerprint(__import__('cryptography.hazmat.primitives.hashes', fromlist=['x']).SHA256())
        print(f"cert sha256   {fp.hex(':')}")
        if 'Android Debug' in subj:
            fails.append('signed with the DEBUG keystore (CN=Android Debug)')
        yrs = (c.not_valid_after_utc - c.not_valid_before_utc).days / 365
        if yrs < 25:
            warns.append(f'cert validity only ~{yrs:.0f} years (Play wants 25+)')
    else:
        warns.append('could not read signer certificate')

    if 'v2' not in schemes:
        fails.append('no v2 signature scheme')
    if 'v3' not in schemes:
        warns.append('no v3 signature scheme (rotation unsupported; install still fine)')

    print('-' * 62)
    for w in warns:
        print('WARN  ' + w)
    for f in fails:
        print('FAIL  ' + f)
    print('-' * 62)
    print('VERDICT: ' + ('PASS - safe to publish' if not fails else 'FAIL - do not publish'))
    return 0 if not fails else 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
