#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 Vela 应用所需的全部 PNG 资源（纯 Python，无第三方依赖）。
用法: python3 tools/gen_icons.py
输出: src/common/images/*.png
"""
import math
import os
import struct
import zlib

SS = 4  # 超采样倍数
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'common', 'images')


class Canvas:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.px = [[(0.0, 0.0, 0.0, 0.0) for _ in range(w)] for _ in range(h)]

    def _blend(self, x, y, r, g, b, a):
        if a <= 0 or x < 0 or y < 0 or x >= self.w or y >= self.h:
            return
        dr, dg, db, da = self.px[y][x]
        a = min(1.0, a)
        na = a + da * (1 - a)
        if na <= 0:
            return
        self.px[y][x] = (
            (r * a + dr * da * (1 - a)) / na,
            (g * a + dg * da * (1 - a)) / na,
            (b * a + db * da * (1 - a)) / na,
            na,
        )

    def fill(self, fn):
        """fn(x, y) -> (r,g,b,a) or None ; x,y 为超采样坐标（0..w*SS-1）"""
        for y in range(self.h * SS):
            fy = (y + 0.5) / SS
            base = y // SS
            for x in range(self.w * SS):
                fx = (x + 0.5) / SS
                c = fn(fx, fy)
                if c is None:
                    continue
                self._blend(x // SS, base, c[0], c[1], c[2], c[3] / SS)

    def to_png(self, path):
        raw = bytearray()
        for y in range(self.h):
            raw.append(0)
            for x in range(self.w):
                r, g, b, a = self.px[y][x]
                a = max(0.0, min(1.0, a))
                raw.append(int(r * 255 + 0.5))
                raw.append(int(g * 255 + 0.5))
                raw.append(int(b * 255 + 0.5))
                raw.append(int(a * 255 + 0.5))
        comp = zlib.compress(bytes(raw), 9)

        def chunk(tag, data):
            c = struct.pack('>I', len(data)) + tag + data
            return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

        png = b'\x89PNG\r\n\x1a\n'
        png += chunk(b'IHDR', struct.pack('>IIBBBBB', self.w, self.h, 8, 6, 0, 0, 0))
        png += chunk(b'IDAT', comp)
        png += chunk(b'IEND', b'')
        with open(path, 'wb') as f:
            f.write(png)
        print('  ->', os.path.relpath(path), '(%dx%d)' % (self.w, self.h))


def hexc(h, alpha=1.0):
    h = h.lstrip('#')
    return (int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0, alpha)


def rrect(x0, y0, x1, y1, r):
    def f(x, y):
        if x < x0 or x > x1 or y < y0 or y > y1:
            return None
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
            return (1, 1, 1, 1)
        if x0 + r <= x <= x1 - r or y0 + r <= y <= y1 - r:
            if x0 <= x <= x1 and y0 <= y <= y1:
                return (1, 1, 1, 1)
        return None
    return f


def seg(x0, y0, x1, y1, w):
    """线段 + 圆角端点"""
    dx, dy = x1 - x0, y1 - y0
    ln2 = dx * dx + dy * dy
    hw = w / 2.0

    def f(x, y):
        if ln2 == 0:
            d2 = (x - x0) ** 2 + (y - y0) ** 2
        else:
            t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / ln2))
            px, py = x0 + t * dx, y0 + t * dy
            d2 = (x - px) ** 2 + (y - py) ** 2
        if d2 <= hw * hw:
            return (1, 1, 1, 1)
        return None
    return f


def circle(cx, cy, r):
    def f(x, y):
        if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
            return (1, 1, 1, 1)
        return None
    return f


def compose(*shapes):
    """shapes: (fn, color) ；后画的覆盖先画的"""
    def f(x, y):
        for fn, col in shapes:
            if fn(x, y):
                return col
        return None
    return f


def paint(canvas, fn, color):
    def g(x, y):
        return color if fn(x, y) else None
    canvas.fill(g)


def draw_white(canvas, *fns):
    for fn in fns:
        paint(canvas, fn, (1, 1, 1, 1.0))


# ---------------------------------------------------------------- 资源定义

def make_back():
    c = Canvas(72, 72)
    draw_white(c, seg(44, 16, 20, 36, 7), seg(20, 36, 44, 56, 7))
    c.to_png(os.path.join(OUT, 'back.png'))


def make_more():
    c = Canvas(72, 72)
    draw_white(c,
               circle(36, 20, 6), circle(36, 36, 6), circle(36, 52, 6))
    c.to_png(os.path.join(OUT, 'more.png'))


def make_enter():
    c = Canvas(48, 48)
    draw_white(c, seg(18, 10, 31, 24, 5), seg(31, 24, 18, 38, 5))
    c.to_png(os.path.join(OUT, 'enter.png'))


def make_pre():
    c = Canvas(40, 40)
    draw_white(c, seg(13, 20, 27, 20, 5))
    c.to_png(os.path.join(OUT, 'pre.png'))


def make_next():
    c = Canvas(40, 40)
    draw_white(c, seg(13, 20, 27, 20, 5), seg(20, 13, 20, 27, 5))
    c.to_png(os.path.join(OUT, 'next.png'))


def make_plus():
    c = Canvas(40, 40)
    draw_white(c, seg(12, 20, 28, 20, 5), seg(20, 12, 20, 28, 5))
    c.to_png(os.path.join(OUT, 'plus.png'))


def make_del():
    c = Canvas(40, 40)
    draw_white(c, seg(20, 10, 20, 30, 4.5), circle(20, 20, 3))
    c.to_png(os.path.join(OUT, 'del.png'))


def make_hd():
    """顶部渐变遮罩：底部淡出到透明"""
    c = Canvas(336, 110)
    top = hexc('#0A0E17')

    def f(x, y):
        t = y / c.h
        a = 1.0 if t < 0.45 else max(0.0, 1.0 - (t - 0.45) / 0.55)
        a = a * a
        return (top[0], top[1], top[2], a)
    c.fill(f)
    c.to_png(os.path.join(OUT, 'hd.png'))


def make_switch(on):
    w, h = 102, 60
    c = Canvas(w, h)
    accent = '#2F7BFF' if on else '#2A3038'
    knob = '#FFFFFF' if on else '#6B7280'
    paint(c, rrect(3, 6, w - 3, h - 6, (h - 12) / 2), hexc(accent))
    kx = w - 6 - (h - 12) / 2 if on else 6 + (h - 12) / 2
    paint(c, circle(kx, h / 2.0, (h - 12) / 2 - 3), hexc(knob))
    c.to_png(os.path.join(OUT, 'Switch_ON.png' if on else 'Switch_OFF.png'))


def make_icon():
    """应用图标：电路节点 + 闪电"""
    s = 192
    c = Canvas(s, s)

    # 背景：深色 + 径向青色辉光
    def bg(x, y):
        cx, cy = s / 2.0, s / 2.0
        d = math.hypot(x - cx, y - cy) / (s * 0.72)
        t = max(0.0, 1.0 - d)
        r = 0.035 + 0.10 * (t ** 2)
        g = 0.055 + 0.34 * (t ** 2.2)
        b = 0.090 + 0.52 * (t ** 2.4)
        # 顶部偏紫的微光
        b += 0.10 * max(0.0, 1 - y / s) ** 3
        return (r, g, b, 1.0)
    c.fill(bg)

    cyan = hexc('#5FE3FF')
    white = hexc('#FFFFFF')
    amber = hexc('#FFC94D')

    # 电路走线（矩形回路，留出缺口放闪电）
    lw = 7.0
    m1, m2 = 34, 158
    left = seg(m1, m1, m1, m2, lw)
    bottom = seg(m1, m2, m2, m2, lw)
    right = seg(m2, m2, m2, 96, lw)
    right2 = seg(m2, 100, m2, m1, lw)
    top1 = seg(m1, m1, 96, m1, lw)
    top2 = seg(100, m1, m2, m1, lw)
    for fn in (left, bottom, right, right2, top1, top2):
        paint(c, fn, cyan)

    # 节点
    for (nx, ny) in ((m1, m1), (m1, m2), (m2, m2), (m2, m1)):
        paint(c, circle(nx, ny, 9), white)

    # 闪电
    bolt = [
        (108, 58), (76, 108), (98, 108), (84, 146),
        (122, 96), (100, 96), (114, 58),
    ]

    def inpoly(px, py, poly):
        inside = False
        n = len(poly)
        j = n - 1
        for i in range(n):
            xi, yi = poly[i]
            xj, yj = poly[j]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi):
                inside = not inside
            j = i
        return inside

    def boltfn(x, y):
        return (inpoly(x, y, bolt) or inpoly(x + 1, y + 1, bolt) or inpoly(x - 1, y - 1, bolt))

    paint(c, boltfn, amber)
    c.to_png(os.path.join(OUT, 'icon.png'))


def make_logo():
    make_icon()


def make_empty():
    c = Canvas(96, 96)
    for fn in (rrect(14, 22, 82, 74, 12), seg(14, 44, 82, 44, 4), seg(30, 22, 30, 44, 4), seg(66, 22, 66, 44, 4)):
        paint(c, fn, (1, 1, 1, 0.28))
    c.to_png(os.path.join(OUT, 'empty.png'))


def main():
    os.makedirs(OUT, exist_ok=True)
    print('generating assets ->', os.path.abspath(OUT))
    make_icon()
    make_hd()
    make_back()
    make_more()
    make_enter()
    make_pre()
    make_next()
    make_plus()
    make_del()
    make_switch(True)
    make_switch(False)
    make_empty()
    print('done.')


if __name__ == '__main__':
    main()
