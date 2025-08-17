import json
import os

# 入力ファイル（全国版）
INPUT_FILE = "japan.geojson"
OUTPUT_DIR = "geojsons"

# 地方区分マッピング
REGIONS = {
    "Hokkaido": ["北海道"],
    "Touhoku": ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
    "Kanto": ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
    "Chubu": ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"],
    "Kinki": ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
    "Chugoku": ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
    "Shikoku": ["徳島県", "香川県", "愛媛県", "高知県"],
    "Kyushu": ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
    "Okinawa": ["沖縄県"]
}

# 日本語名 → 英語短縮名マッピング
NAME_MAP = {
    "北海道": "Hokkaido",
    "青森県": "Aomori", "岩手県": "Iwate", "宮城県": "Miyagi",
    "秋田県": "Akita", "山形県": "Yamagata", "福島県": "Fukushima",
    "茨城県": "Ibaraki", "栃木県": "Tochigi", "群馬県": "Gunma",
    "埼玉県": "Saitama", "千葉県": "Chiba", "東京都": "Tokyo", "神奈川県": "Kanagawa",
    "新潟県": "Niigata", "富山県": "Toyama", "石川県": "Ishikawa",
    "福井県": "Fukui", "山梨県": "Yamanashi", "長野県": "Nagano",
    "岐阜県": "Gifu", "静岡県": "Shizuoka", "愛知県": "Aichi",
    "三重県": "Mie", "滋賀県": "Shiga", "京都府": "Kyoto",
    "大阪府": "Osaka", "兵庫県": "Hyogo", "奈良県": "Nara", "和歌山県": "Wakayama",
    "鳥取県": "Tottori", "島根県": "Shimane", "岡山県": "Okayama",
    "広島県": "Hiroshima", "山口県": "Yamaguchi",
    "徳島県": "Tokushima", "香川県": "Kagawa", "愛媛県": "Ehime", "高知県": "Kochi",
    "福岡県": "Fukuoka", "佐賀県": "Saga", "長崎県": "Nagasaki",
    "熊本県": "Kumamoto", "大分県": "Oita", "宮崎県": "Miyazaki", "鹿児島県": "Kagoshima",
    "沖縄県": "Okinawa"
}

# GeoJSON読み込み
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

features = data.get("features", [])

# 出力先ディレクトリ準備
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 各県ごとに分割
for region, prefectures in REGIONS.items():
    region_dir = os.path.join(OUTPUT_DIR, region)
    os.makedirs(region_dir, exist_ok=True)

    for pref in prefectures:
        feats = [f for f in features if f["properties"].get("nam_ja") == pref]
        if not feats:
            print(f"[WARN] {pref} not found in input data")
            continue

        out_data = {"type": "FeatureCollection", "features": feats}
        filename = NAME_MAP[pref] + ".geojson"
        out_path = os.path.join(region_dir, filename)

        with open(out_path, "w", encoding="utf-8") as out:
            json.dump(out_data, out, ensure_ascii=False)

        print(f"Saved {out_path}")
