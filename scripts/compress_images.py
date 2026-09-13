#!/usr/bin/env python3
"""压缩 generated-images 素材到微信小程序可用体积。

输出到 MpApp/assets/images/，按用途分尺寸：
- hero/    首页头图轮播（750x940，约 2:2.5 竖图裁切）
- route/   甄选路线大卡（750x560）
- lux/     奢享体验竖卡（600x750）
- dest/    目的地瓷贴（600x600）
- misc/    其他（头像、二维码占位等）
"""
import os
from PIL import Image, ImageOps

SRC = os.path.join(os.path.dirname(__file__), "..", "..", "generated-images")
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")

# (源文件, 输出目录, 输出名, 宽, 高, 质量)
JOBS = [
    # 首页头图轮播（3 张）
    ("Santorini_Oia_village_iconic_b_2026-09-11T06-01-20.png", "hero", "hero-santorini", 750, 940, 72),
    ("Athens_Acropolis_Parthenon_tem_2026-09-11T06-01-23.png", "hero", "hero-acropolis", 750, 940, 72),
    ("Romantic_couple_on_honeymoon_a_2026-09-11T06-01-28.png", "hero", "hero-couple", 750, 940, 72),
    # 甄选路线大卡（4 张）
    ("Athens_Plaka_old_town_charming_2026-09-11T06-01-23.png", "route", "route-athens", 750, 560, 70),
    ("Santorini_Oia_village_iconic_b_2026-09-11T06-01-20.png", "route", "route-santorini", 750, 560, 70),
    ("Nafplion_charming_old_town_har_2026-09-11T06-01-52.png", "route", "route-peloponnese", 750, 560, 70),
    ("Meteora_monasteries_cluster_vi_2026-09-11T06-02-14.png", "route", "route-heritage", 750, 560, 70),
    # 奢享体验竖卡（2 张）
    ("Luxury_private_jet_on_tarmac_a_2026-09-11T06-01-53.png", "lux", "lux-jet", 600, 750, 70),
    ("Luxury_motor_yacht_sailing_on__2026-09-11T06-01-51.png", "lux", "lux-yacht", 600, 750, 70),
    # 目的地瓷贴（8 张）
    ("Athens_Acropolis_Parthenon_tem_2026-09-11T06-01-23.png", "dest", "dest-athens", 600, 600, 68),
    ("Delphi_ancient_Greek_theater_r_2026-09-11T06-01-50.png", "dest", "dest-delphi", 600, 600, 68),
    ("Meteora_Greece__Orthodox_monas_2026-09-11T06-01-52.png", "dest", "dest-meteora", 600, 600, 68),
    ("Nafplion_charming_old_town_har_2026-09-11T06-01-52.png", "dest", "dest-nafplion", 600, 600, 68),
    ("Ancient_Corinth_or_Epidaurus_g_2026-09-11T06-02-14.png", "dest", "dest-peloponnese", 600, 600, 68),
    ("Santorini_Oia_village_iconic_b_2026-09-11T06-01-20.png", "dest", "dest-santorini", 600, 600, 68),
    ("Mykonos_iconic_windmills_on_hi_2026-09-11T06-02-14.png", "dest", "dest-mykonos", 600, 600, 68),
    ("Zakynthos_Navagio_shipwreck_be_2026-09-11T06-02-14.png", "dest", "dest-zakynthos", 600, 600, 68),
    ("Crete_Balos_lagoon_pink_white__2026-09-11T06-02-14.png", "dest", "dest-crete", 600, 600, 68),
]


def crop_cover(img, w, h):
    """按 cover 模式居中裁切到目标宽高比，再缩放到目标尺寸。"""
    img = ImageOps.exif_transpose(img).convert("RGB")
    sw, sh = img.size
    target_ratio = w / h
    src_ratio = sw / sh
    if src_ratio > target_ratio:
        new_w = int(sh * target_ratio)
        left = (sw - new_w) // 2
        img = img.crop((left, 0, left + new_w, sh))
    else:
        new_h = int(sw / target_ratio)
        top = int((sh - new_h) * 0.35)  # 略偏上裁切，保留天空/主体
        img = img.crop((0, top, sw, top + new_h))
    return img.resize((w, h), Image.LANCZOS)


def main():
    total = 0
    for src, sub, name, w, h, q in JOBS:
        src_path = os.path.join(SRC, src)
        out_dir = os.path.join(OUT, sub)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, name + ".jpg")
        with Image.open(src_path) as img:
            crop_cover(img, w, h).save(out_path, "JPEG", quality=q, optimize=True, progressive=True)
        size = os.path.getsize(out_path)
        total += size
        print(f"{out_path}  {size/1024:.0f} KB")
    print(f"--- TOTAL: {total/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
