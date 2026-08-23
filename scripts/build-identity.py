"""SPOOL identity generator — d12 geometry, m1 material.

Single source of truth for every brand asset. Both the SVG files and the PNG
rasters are produced from the numbers below, so they can never drift apart.
"""
import math, zlib, struct, os

OUT = 'public'

# ---------------------------------------------------------------- geometry
# d12: two annular sectors with radial cuts, plus the hub ring. 100x100 field.
CX = CY = 50.0
RO, RI = 46.0, 26.0          # tape arcs
SPAN = [(-38.0, 78.0), (142.0, 258.0)]
HUB_O, HUB_I = 17.0, 8.0     # hub ring — the locating hole, never a solid dot
TILE_R = 23.0                # platform convention for the icon tile, not product language

# ---------------------------------------------------------------- palette
CORAL_HI  = (0xFF, 0x7A, 0x50)   # m1 stop 0
CORAL_MID = (0xF0, 0x4B, 0x31)   # m1 stop .55 — the product's canvas
CORAL_LO  = (0xCE, 0x34, 0x13)   # m1 stop 1
CREAM     = (0xF2, 0xF0, 0xE7)   # machine body
INK       = (0x15, 0x17, 0x19)
EMBOSS    = (0x3A, 0x10, 0x06)   # inner-shadow colour
EMBOSS_A  = 0.50
SPEC_A    = 0.40                 # specular peak alpha
DY, BLUR  = 2.2, 2.2             # inner shadow offset / blur, in field units

def hexc(c): return '#%02X%02X%02X' % c

# ---------------------------------------------------------------- path data
def _pt(r, a):
    t = math.radians(a)
    return CX + r * math.cos(t), CY + r * math.sin(t)

def sector_d(ro, ri, a0, a1):
    ox0, oy0 = _pt(ro, a0); ox1, oy1 = _pt(ro, a1)
    ix1, iy1 = _pt(ri, a1); ix0, iy0 = _pt(ri, a0)
    lg = 1 if abs(a1 - a0) > 180 else 0
    return (f"M{ox0:.2f} {oy0:.2f}A{ro} {ro} 0 {lg} 1 {ox1:.2f} {oy1:.2f}"
            f"L{ix1:.2f} {iy1:.2f}A{ri} {ri} 0 {lg} 0 {ix0:.2f} {iy0:.2f}Z")

def circ_d(r):
    return f"M{CX-r} {CY}a{r} {r} 0 1 0 {r*2} 0a{r} {r} 0 1 0 {-r*2} 0"

D12 = ' '.join([sector_d(RO, RI, *SPAN[0]), sector_d(RO, RI, *SPAN[1]),
                circ_d(HUB_O), circ_d(HUB_I)])

# ---------------------------------------------------------------- coverage
def inside(x, y):
    dx, dy = x - CX, y - CY
    r = math.hypot(dx, dy)
    if HUB_I <= r <= HUB_O:
        return True
    if RI <= r <= RO:
        a = math.degrees(math.atan2(dy, dx)) % 360.0
        for a0, a1 in SPAN:
            lo, hi = a0 % 360.0, a1 % 360.0
            if lo <= hi:
                if lo <= a <= hi: return True
            else:
                if a >= lo or a <= hi: return True
    return False

def in_tile(x, y, rx):
    if rx <= 0: return True
    cx = min(max(x, rx), 100 - rx); cy = min(max(y, rx), 100 - rx)
    return math.hypot(x - cx, y - cy) <= rx

def coverage(size, fn, ss=4):
    """average of ss*ss point samples per pixel, in field units"""
    grid = [[0.0] * size for _ in range(size)]
    sub = 100.0 / (size * ss)
    inv = 1.0 / (ss * ss)
    for py in range(size):
        row = grid[py]
        for px in range(size):
            n = 0
            for sy in range(ss):
                y = (py * ss + sy + 0.5) * sub
                for sx in range(ss):
                    if fn((px * ss + sx + 0.5) * sub, y): n += 1
            row[px] = n * inv
    return grid

def box_blur(g, size, radius, passes=3):
    r = max(1, int(round(radius)))
    for _ in range(passes):
        # horizontal
        out = [[0.0] * size for _ in range(size)]
        for y in range(size):
            row = g[y]; o = out[y]
            for x in range(size):
                a = max(0, x - r); b = min(size - 1, x + r)
                o[x] = sum(row[a:b+1]) / (b - a + 1)
        g = out
        # vertical
        out = [[0.0] * size for _ in range(size)]
        for x in range(size):
            col = [g[y][x] for y in range(size)]
            for y in range(size):
                a = max(0, y - r); b = min(size - 1, y + r)
                out[y][x] = sum(col[a:b+1]) / (b - a + 1)
        g = out
    return g

# ---------------------------------------------------------------- shading
def grad_t(x, y, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    d = vx * vx + vy * vy
    return max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / d))

def coral_at(t):
    if t <= .55:
        k = t / .55
        return tuple(CORAL_HI[i] + (CORAL_MID[i] - CORAL_HI[i]) * k for i in range(3))
    k = (t - .55) / .45
    return tuple(CORAL_MID[i] + (CORAL_LO[i] - CORAL_MID[i]) * k for i in range(3))

def lerp(a, b, k): return tuple(a[i] + (b[i] - a[i]) * k for i in range(3))

# ---------------------------------------------------------------- png
def write_png(path, size, px):
    raw = b''.join(b'\x00' + px[y*size*4:(y+1)*size*4] for y in range(size))
    def chunk(tag, d):
        body = tag + d
        return struct.pack('>I', len(d)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
                + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    print(f"  {path}  {size}x{size}  {os.path.getsize(path)}B")

def render_m1(size, tile_rx=0.0, ss=4):
    """m1: cream tile, coral gradient mark, inner shadow, specular sweep."""
    cov  = coverage(size, inside, ss)
    tile = coverage(size, lambda x, y: in_tile(x, y, tile_rx), ss) if tile_rx > 0 else None
    # inner shadow: offset the alpha down, blur it, keep what the mark does NOT overlap
    dy_px = DY * size / 100.0
    off = [[cov[max(0, min(size-1, int(round(y - dy_px))))][x] for x in range(size)]
           for y in range(size)]
    blurred = box_blur(off, size, BLUR * size / 100.0)

    px = bytearray()
    for y in range(size):
        for x in range(size):
            fx = (x + .5) * 100.0 / size
            fy = (y + .5) * 100.0 / size
            base = CREAM
            a = cov[y][x]
            if a > 0:
                col = coral_at(grad_t(fx, fy, 20, 0, 80, 100))
                sh = a * (1.0 - blurred[y][x]) * EMBOSS_A
                col = lerp(col, EMBOSS, sh)
                st = grad_t(fx, fy, 0, 0, 10, 100)
                sa = SPEC_A * max(0.0, 1.0 - st / .46)
                col = lerp(col, (255, 255, 255), sa)
                base = lerp(base, col, a)
            ta = tile[y][x] if tile else 1.0
            px += bytes((round(base[0]), round(base[1]), round(base[2]), round(ta * 255)))
    return bytes(px)

def render_flat_inverted(size, tile_rx=TILE_R, ss=8):
    """small-size member of the same family: coral tile, cream mark, no effects."""
    cov  = coverage(size, inside, ss)
    tile = coverage(size, lambda x, y: in_tile(x, y, tile_rx), ss)
    px = bytearray()
    for y in range(size):
        for x in range(size):
            ta = tile[y][x]
            if ta == 0:
                px += bytes((0, 0, 0, 0)); continue
            col = lerp(CORAL_MID, CREAM, cov[y][x])
            px += bytes((round(col[0]), round(col[1]), round(col[2]), round(ta * 255)))
    return bytes(px)

# ---------------------------------------------------------------- svg
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="SPOOL">\n  <title>SPOOL</title>\n'

def write(path, s):
    open(path, 'w').write(s)
    print(f"  {path}  {os.path.getsize(path)}B")

def main():
    # 1 · favicon.svg — small-size lockup. Flat on purpose: filters blur at 16px.
    write(f'{OUT}/favicon.svg', HEAD
        + f'  <rect width="100" height="100" rx="{TILE_R}" fill="{hexc(CORAL_MID)}"/>\n'
        + f'  <path d="{D12}" fill-rule="evenodd" fill="{hexc(CREAM)}"/>\n</svg>\n')

    # 2 · icon.svg — m1 as approved, vector, for large use
    write(f'{OUT}/icon.svg', HEAD
        + '  <defs>\n'
        + '    <linearGradient id="spool-coral" x1="20%" y1="0%" x2="80%" y2="100%">\n'
        + f'      <stop offset="0" stop-color="{hexc(CORAL_HI)}"/>\n'
        + f'      <stop offset=".55" stop-color="{hexc(CORAL_MID)}"/>\n'
        + f'      <stop offset="1" stop-color="{hexc(CORAL_LO)}"/>\n'
        + '    </linearGradient>\n'
        + '    <linearGradient id="spool-spec" x1="0%" y1="0%" x2="10%" y2="100%">\n'
        + f'      <stop offset="0" stop-color="#FFFFFF" stop-opacity="{SPEC_A}"/>\n'
        + '      <stop offset=".46" stop-color="#FFFFFF" stop-opacity="0"/>\n'
        + '    </linearGradient>\n'
        + '    <filter id="spool-emboss" x="-30%" y="-30%" width="160%" height="160%">\n'
        + f'      <feOffset dy="{DY}"/><feGaussianBlur stdDeviation="{BLUR}" result="o"/>\n'
        + '      <feComposite operator="out" in="SourceGraphic" in2="o" result="inv"/>\n'
        + f'      <feFlood flood-color="{hexc(EMBOSS)}" flood-opacity="{EMBOSS_A}"/>\n'
        + '      <feComposite operator="in" in2="inv"/><feComposite operator="over" in2="SourceGraphic"/>\n'
        + '    </filter>\n  </defs>\n'
        + f'  <rect width="100" height="100" rx="{TILE_R}" fill="{hexc(CREAM)}"/>\n'
        + f'  <path d="{D12}" fill-rule="evenodd" fill="url(#spool-coral)" filter="url(#spool-emboss)"/>\n'
        + f'  <path d="{D12}" fill-rule="evenodd" fill="url(#spool-spec)"/>\n</svg>\n')

    # 3 · mark.svg — bare geometry, no tile, no material
    write(f'{OUT}/mark.svg', HEAD
        + f'  <path d="{D12}" fill-rule="evenodd" fill="{hexc(INK)}"/>\n</svg>\n')

    # 4 · rasters
    print('rasterising:')
    write_png(f'{OUT}/apple-touch-icon.png', 180, render_m1(180, tile_rx=0.0))  # iOS masks it itself
    write_png(f'{OUT}/icon-512.png',         512, render_m1(512, tile_rx=TILE_R, ss=3))
    write_png(f'{OUT}/favicon-32.png',        32, render_flat_inverted(32))

if __name__ == '__main__':
    main()
