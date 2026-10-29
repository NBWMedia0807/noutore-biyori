"""
脳トレ日和 マッチ棒クイズ Pinterest 用縦長画像（1000×1500）の自動生成

公開済みの新着マッチ棒クイズのうち pinterestImage が未設定のものについて、
問題画像（problemImage）を縦長キャンバスに組み直し、Sanity にアップロードして
pinterestImage に保存する。答えは画像に入れず、下部に「答えはサイトで」と表示する。

  # Sanity から対象を取得して生成・保存（GitHub Actions から実行）
  python scripts/pinterest_image.py

  # 手元の画像でレイアウトだけ確認する（Sanity には触れない）
  python scripts/pinterest_image.py --preview problem.png out.jpg --title "【マッチ棒クイズ】1本だけ動かして正しい式に：6+5=14？"

環境変数:
  SANITY_PROJECT_ID / SANITY_DATASET / SANITY_TOKEN  書き込み可能なトークンが必要
  PINTEREST_LIMIT           1回の実行で処理する最大件数（既定 5）
  PINTEREST_LOOKBACK_HOURS  何時間以内に作成された問題を「新着」とみなすか（既定 72）
  PINTEREST_FONT            日本語太字フォントのパス（未指定なら既知のパスから探す）
  DRY_RUN=1                 生成した画像を scripts/out/ に保存するだけで Sanity に書き込まない
"""

import argparse
import datetime
import io
import os
import re

import requests
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1000, 1500

# docs/ui-style-guide.md のデザイントークンに合わせる
COLOR_CANVAS = "#FFF9EF"
COLOR_SURFACE = "#FFFFFF"
COLOR_BORDER = "#F6DFAF"
COLOR_PRIMARY = "#F97316"
COLOR_TITLE = "#1F2933"
COLOR_ON_PRIMARY = "#FFFFFF"

HEADER_TOP = 70
FOOTER_HEIGHT = 250
CARD_MARGIN_X = 50
CARD_PADDING = 28
CARD_RADIUS = 26

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]

# 行頭に来てはいけない文字（簡易禁則）
NO_LINE_START = set("、。，．・：；？！ー）」』】〕〉》”’…")

MATCHSTICK_SLUG_PREFIX = "matchstick-quiz/"
API_VERSION = "v2021-06-07"


# ---------------------------------------------------------------------------
# 画像生成
# ---------------------------------------------------------------------------

def resolve_font_path() -> str:
    explicit = os.environ.get("PINTEREST_FONT")
    if explicit:
        return explicit
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise RuntimeError(
        "日本語フォントが見つかりません。fonts-noto-cjk を入れるか PINTEREST_FONT を指定してください。"
    )


def load_font(size: int) -> ImageFont.FreeTypeFont:
    # Noto Sans CJK の .ttc は index 0 が JP
    return ImageFont.truetype(resolve_font_path(), size, index=0)


def clean_title(title: str) -> str:
    """ラベルで「マッチ棒クイズ」と出すので、タイトル先頭の【…】は外す"""
    return re.sub(r"^【[^】]*】\s*", "", (title or "").strip()) or "1本だけ動かして正しい式にできるかな？"


def tokenize(text: str) -> list[str]:
    """式（6+5=14 など）の途中で折り返さないよう、英数字・記号の並びは1語として扱う"""
    return re.findall(r"[0-9A-Za-z+\-=×÷*/.＋－＝]+|.", text)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    # 「…式に：6+5=14？」の全角コロンは、そこで改行して式を独立した行にする
    for paragraph in re.split(r"\s*[：:]\s*", text):
        current = ""
        for token in tokenize(paragraph):
            candidate = current + token
            if current and draw.textlength(candidate, font=font) > max_width and token[0] not in NO_LINE_START:
                lines.append(current)
                current = token
            else:
                current = candidate
        if current:
            lines.append(current)
    return lines


def fit_title(draw, text: str, max_width: int, max_lines: int = 4):
    for size in (60, 56, 52, 48, 44, 40):
        font = load_font(size)
        lines = wrap_text(draw, text, font, max_width)
        if len(lines) <= max_lines:
            return font, lines
    # それでも収まらなければ前半を省略する。最終行（問題の式）は必ず残す
    font = load_font(40)
    lines = wrap_text(draw, text, font, max_width)
    head = lines[: max_lines - 1]
    head[-1] = head[-1][:-1] + "…"
    return font, head + lines[-1:]


def draw_centered(draw, y: int, text: str, font, fill) -> int:
    """y を上端として中央揃えで描き、描いた行の高さを返す"""
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    draw.text(((WIDTH - (right - left)) / 2 - left, y - top), text, font=font, fill=fill)
    return bottom - top


def render_pinterest_image(problem_image: bytes, title: str) -> bytes:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), COLOR_CANVAS)
    draw = ImageDraw.Draw(canvas)

    # ── ヘッダー：カテゴリラベル＋タイトル ──
    label_font = load_font(34)
    label = "マッチ棒クイズ"
    l, t, r, b = draw.textbbox((0, 0), label, font=label_font)
    pill_w, pill_h = (r - l) + 64, (b - t) + 28
    pill_x = (WIDTH - pill_w) / 2
    draw.rounded_rectangle(
        (pill_x, HEADER_TOP, pill_x + pill_w, HEADER_TOP + pill_h), radius=pill_h / 2, fill=COLOR_PRIMARY
    )
    draw_centered(draw, HEADER_TOP + 14, label, label_font, COLOR_ON_PRIMARY)

    title_font, title_lines = fit_title(draw, clean_title(title), WIDTH - CARD_MARGIN_X * 2 - 20)
    line_gap = int(title_font.size * 0.45)
    y = HEADER_TOP + pill_h + 40
    for line in title_lines:
        y += draw_centered(draw, y, line, title_font, COLOR_TITLE) + line_gap
    header_bottom = y - line_gap

    # ── フッター：答えはサイトで ──
    footer_top = HEIGHT - FOOTER_HEIGHT
    draw.rectangle((0, footer_top, WIDTH, HEIGHT), fill=COLOR_PRIMARY)
    cta_font = load_font(84)
    site_font = load_font(34)
    cta_h = draw.textbbox((0, 0), "答えはサイトで", font=cta_font)
    site_h = draw.textbbox((0, 0), "脳トレ日和｜noutorebiyori.com", font=site_font)
    block_h = (cta_h[3] - cta_h[1]) + 30 + (site_h[3] - site_h[1])
    fy = footer_top + (FOOTER_HEIGHT - block_h) / 2
    fy += draw_centered(draw, fy, "答えはサイトで", cta_font, COLOR_ON_PRIMARY) + 30
    draw_centered(draw, fy, "脳トレ日和｜noutorebiyori.com", site_font, COLOR_ON_PRIMARY)

    # ── 中央：問題画像をカードに収める（カードは画像の大きさに合わせ、空き領域の中央に置く） ──
    source = Image.open(io.BytesIO(problem_image))
    if source.mode in ("RGBA", "LA", "P"):
        source = source.convert("RGBA")
        flattened = Image.new("RGB", source.size, COLOR_SURFACE)
        flattened.paste(source, mask=source.split()[-1])
        source = flattened
    else:
        source = source.convert("RGB")

    area_top, area_bottom = header_bottom + 50, footer_top - 50
    box_w = WIDTH - CARD_MARGIN_X * 2 - CARD_PADDING * 2
    box_h = area_bottom - area_top - CARD_PADDING * 2
    scale = min(box_w / source.width, box_h / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))), Image.LANCZOS
    )
    card_w, card_h = resized.width + CARD_PADDING * 2, resized.height + CARD_PADDING * 2
    card_x = (WIDTH - card_w) // 2
    card_y = area_top + (area_bottom - area_top - card_h) // 2
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_w, card_y + card_h),
        radius=CARD_RADIUS,
        fill=COLOR_SURFACE,
        outline=COLOR_BORDER,
        width=3,
    )
    canvas.paste(resized, (card_x + CARD_PADDING, card_y + CARD_PADDING))

    out = io.BytesIO()
    canvas.save(out, format="JPEG", quality=92, subsampling=0, optimize=True)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Sanity
# ---------------------------------------------------------------------------

# 公開済み・審査OK・新着（作成から LOOKBACK 以内）のマッチ棒クイズで、
# pinterestImage が未設定のものだけを拾う。daily-publish による「再公開」は
# _createdAt が古いため対象にならない。
TARGET_QUERY = """
*[
  _type == "quiz" &&
  !(_id in path("drafts.**")) &&
  string::startsWith(slug.current, $prefix) &&
  coalesce(reviewStatus, "approved") == "approved" &&
  coalesce(publishedAt, _createdAt) <= now() &&
  _createdAt >= $since &&
  defined(coalesce(problemImage.asset, questionImage.asset)) &&
  !defined(pinterestImage.asset)
] | order(coalesce(publishedAt, _createdAt) desc)[0...{limit}]{
  _id,
  title,
  "slug": slug.current,
  "sourceUrl": coalesce(problemImage.asset->url, questionImage.asset->url),
  "hasDraft": defined(*[_id == "drafts." + ^._id][0]._id)
}
"""


class Sanity:
    def __init__(self, project_id: str, dataset: str, token: str):
        self.base = f"https://{project_id}.api.sanity.io/{API_VERSION}"
        self.dataset = dataset
        self.session = requests.Session()
        self.session.headers["Authorization"] = f"Bearer {token}"

    def query(self, groq: str, params: dict) -> list[dict]:
        payload = {"query": groq, "params": params}
        res = self.session.post(f"{self.base}/data/query/{self.dataset}", json=payload, timeout=30)
        if res.status_code == 401:
            raise RuntimeError("Sanity API 認証エラー (401)。SANITY_EDITOR_TOKEN を確認してください。")
        res.raise_for_status()
        return res.json().get("result") or []

    def upload_image(self, data: bytes, filename: str) -> str:
        res = self.session.post(
            f"{self.base}/assets/images/{self.dataset}",
            params={"filename": filename},
            data=data,
            headers={"Content-Type": "image/jpeg"},
            timeout=60,
        )
        res.raise_for_status()
        return res.json()["document"]["_id"]

    def set_pinterest_image(self, doc_ids: list[str], asset_id: str) -> None:
        value = {"_type": "image", "asset": {"_type": "reference", "_ref": asset_id}}
        mutations = [{"patch": {"id": doc_id, "set": {"pinterestImage": value}}} for doc_id in doc_ids]
        res = self.session.post(
            f"{self.base}/data/mutate/{self.dataset}", json={"mutations": mutations}, timeout=30
        )
        res.raise_for_status()


def run() -> None:
    limit = int(os.environ.get("PINTEREST_LIMIT", "5"))
    lookback = int(os.environ.get("PINTEREST_LOOKBACK_HOURS", "72"))
    dry_run = os.environ.get("DRY_RUN") == "1"

    sanity = Sanity(
        os.environ["SANITY_PROJECT_ID"],
        os.environ.get("SANITY_DATASET") or "production",
        os.environ["SANITY_TOKEN"],
    )
    since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=lookback)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    # GROQ のスライスにはパラメータを使えないため件数は整数で埋め込む
    groq = TARGET_QUERY.replace("{limit}", str(max(1, limit)))
    targets = sanity.query(groq, {"prefix": MATCHSTICK_SLUG_PREFIX, "since": since})
    print(f"🔎 対象 {len(targets)} 件（{since} 以降に作成・pinterestImage 未設定）")

    failures = 0
    for doc in targets:
        slug = doc.get("slug") or doc["_id"]
        try:
            src = requests.get(doc["sourceUrl"], timeout=60)
            src.raise_for_status()
            image = render_pinterest_image(src.content, doc.get("title") or "")
            filename = f"pinterest-{slug.replace('/', '-')}.jpg"

            if dry_run:
                os.makedirs(os.path.join(os.path.dirname(__file__), "out"), exist_ok=True)
                path = os.path.join(os.path.dirname(__file__), "out", filename)
                with open(path, "wb") as f:
                    f.write(image)
                print(f"🧪 DRY_RUN: {path}")
                continue

            asset_id = sanity.upload_image(image, filename)
            # ドラフトがあると次の公開で pinterestImage が消えるので、両方に入れる
            doc_ids = [doc["_id"]] + ([f"drafts.{doc['_id']}"] if doc.get("hasDraft") else [])
            sanity.set_pinterest_image(doc_ids, asset_id)
            print(f"✅ {slug} → {asset_id}")
        except Exception as e:  # 1件の失敗で他の問題を止めない
            failures += 1
            print(f"❌ {slug}: {e}")

    if failures:
        raise SystemExit(f"{failures} 件の生成に失敗しました")
    print("🎉 完了")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--preview", nargs=2, metavar=("SRC", "OUT"), help="手元の問題画像からプレビューを書き出す")
    parser.add_argument("--title", default="", help="--preview で使うタイトル")
    args = parser.parse_args()

    if args.preview:
        src, out = args.preview
        with open(src, "rb") as f:
            image = render_pinterest_image(f.read(), args.title)
        with open(out, "wb") as f:
            f.write(image)
        print(f"🖼  {out}")
        return

    run()


if __name__ == "__main__":
    main()
