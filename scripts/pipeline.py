"""
脳トレ日和 マッチ棒クイズ 自動生成パイプライン
Claude API → Sanity API (ドラフト入稿)
"""

import os
import csv
import json
import re
import uuid
import datetime
import anthropic
import requests

ANTHROPIC_API_KEY  = os.environ["ANTHROPIC_API_KEY"]
SANITY_PROJECT_ID  = os.environ["SANITY_PROJECT_ID"]
SANITY_DATASET     = os.environ.get("SANITY_DATASET", "production")
SANITY_TOKEN       = os.environ["SANITY_TOKEN"]
SANITY_CATEGORY_ID = os.environ["SANITY_CATEGORY_ID"]
SANITY_AUTHOR_ID   = os.environ["SANITY_AUTHOR_ID"]
NUM_QUIZZES        = int(os.environ.get("NUM_QUIZZES", "10"))

SYSTEM_PROMPT = """あなたは優秀なパズル作家です。
以下の【厳密なルール】に完全に従い、マッチ棒クイズ（数式）を作成してください。

【厳密なルール：マッチ棒のルール】
- マッチ棒を「1本だけ移動」して正しい等式にする問題を作ること
- 数字・演算子はすべてマッチ棒で表現できる（7セグメント表示）
- problemEquation は「現状の誤った式」、answerEquation は「正解の式」
- 実際にマッチ棒1本の移動だけで成立することを必ず確認すること
- 難易度（difficulty）は easy / normal / hard のいずれかを必ず含めること

JSON配列のみ返してください。前置き・後置き・コードブロック記号は不要です。

[
  {
    "problemEquation": "6+5=14",
    "answerEquation": "9+5=14",
    "difficulty": "normal",
    "title": "【マッチ棒クイズ】1本だけ動かして正しい式に：6+5=14？",
    "problemDescription": "今日の脳トレは、答えから逆算する2桁計算クイズです。マッチ棒1本だけを別の場所へ移動して、式「6+5=14」を正しい等式に直してください。",
    "hint": "「6+5=11」ですが、答えは「14」。左端の「6」を「9」に変えれば「9+5=14」になります。",
    "answerExplanation": "正解は、左端の「6」を「9」に変えることでした。「6」の左下にある縦棒を外し、右上へ移動させます。「9+5=14」。これで正解です！",
    "closingMessage": "難しい問題が解けた時の喜びは、何歳になっても嬉しいものです。この達成感が、脳を若々しく保つエネルギーになります。また明日も挑戦してみてくださいね！"
  }
]"""


CSV_PATH = os.path.join(os.path.dirname(__file__), "past_quizzes.csv")


def load_past_equations() -> list[str]:
    if not os.path.exists(CSV_PATH):
        return []
    equations = []
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            if len(row) > 3 and row[0].strip() == "マッチ棒クイズ":
                eq = row[3].strip()
                if eq:
                    equations.append(eq)
    return equations


def generate_quizzes() -> list[dict]:
    past = load_past_equations()
    if past:
        past_block = "\n".join(past)
        user_message = (
            f"マッチ棒クイズを{NUM_QUIZZES}問作成してください。JSON配列のみ返してください。\n\n"
            f"【使用済みの問題式（絶対に重複不可）】\n{past_block}"
        )
        print(f"📋 過去問 {len(past)} 件を除外リストに追加")
    else:
        user_message = f"マッチ棒クイズを{NUM_QUIZZES}問作成してください。JSON配列のみ返してください。"

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": user_message
            }
        ]
    )
    raw = message.content[0].text.strip()
    # コードブロック記号を除去
    raw = re.sub(r"^```[a-z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    quizzes = json.loads(raw)
    print(f"✅ Claude が {len(quizzes)} 件のクイズを生成しました")
    return quizzes


VERIFY_SYSTEM_PROMPT = """あなたはマッチ棒パズルの厳格な審査員です。
与えられたマッチ棒クイズのリストを1問ずつ検証し、以下の3つのNG条件に該当する問題を除外してください。

【NG条件】
1. 問題式が最初から正しい等式になっている（問題として成立しない）
2. 別解が存在する（正解が一意でない）
   - 移動パターンの例：0⇔6⇔9、2⇔3、3⇔5、8→0/6/9、+→-、-→+、=→≠ など
   - 同じ1本移動で複数の正しい式が作れる場合はNG
3. 1本移動ルールに違反している（2本以上動かさないと解けない）

【出力形式】
以下のJSON形式のみ返してください。前置き・後置き・コードブロック記号は不要です。

{
  "ok": [/* 検証を通過したクイズオブジェクトをそのまま列挙 */],
  "ng": [
    {"problemEquation": "...", "reason": "除外理由を日本語で簡潔に"}
  ]
}"""


def verify_quizzes(quizzes: list[dict]) -> list[dict]:
    if not quizzes:
        return []

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        payload = json.dumps(quizzes, ensure_ascii=False)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            system=VERIFY_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"以下のクイズリストを検証してください。\n\n{payload}"
                }
            ]
        )
        raw = message.content[0].text.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1:
            print("⚠️ 検証JSONが見つかりません。元のリストをそのまま使用します。")
            return quizzes
        raw = raw[start:end + 1]
        if not raw.strip():
            print("⚠️ 検証JSONが空です。元のリストをそのまま使用します。")
            return quizzes
        result = json.loads(raw)
        if isinstance(result, list):
            ok_list = result
            ng_list = []
        else:
            ok_list = result.get("ok", [])
            ng_list = result.get("ng", [])

        for ng in ng_list:
            print(f"❌ 除外: {ng.get('problemEquation', '?')} → {ng.get('reason', '')}")

        print(f"✅ 検証通過: {len(ok_list)} 件 / 除外: {len(ng_list)} 件")
        return ok_list if ok_list else quizzes

    except Exception as e:
        print(f"⚠️ 検証中にエラーが発生しました: {e}。元のリストをそのまま使用します。")
        return quizzes


def make_slug(title: str, uid: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    if len(slug) < 5:
        slug = f"matchstick-quiz-{uid[:8]}"
    return slug[:96]


def text_to_portable(text: str) -> list[dict]:
    return [
        {
            "_type": "block",
            "_key": uuid.uuid4().hex[:8],
            "style": "normal",
            "markDefs": [],
            "children": [
                {
                    "_type": "span",
                    "_key": uuid.uuid4().hex[:8],
                    "text": text,
                    "marks": []
                }
            ]
        }
    ]


def build_mutation(quiz: dict) -> dict:
    uid = uuid.uuid4().hex
    today = datetime.date.today().isoformat()
    difficulty_map = {"easy": "easy", "normal": "normal", "hard": "hard"}
    difficulty = difficulty_map.get(quiz.get("difficulty", "normal"), "normal")
    slug_str = make_slug(quiz.get("title", ""), uid)
    doc = {
        "_id": f"drafts.{uid}",
        "_type": "quiz",
        "title": quiz.get("title", "マッチ棒クイズ"),
        "slug": {"_type": "slug", "current": slug_str},
        "publishedAt": today,
        "problemDescription": text_to_portable(quiz["problemDescription"]),
        "hints": text_to_portable(quiz["hint"]),
        "answerExplanation": text_to_portable(quiz["answerExplanation"]),
        "closingMessage": text_to_portable(quiz["closingMessage"]),
        "difficulty": difficulty,
        "category": {"_type": "reference", "_ref": SANITY_CATEGORY_ID},
        "author": {"_type": "reference", "_ref": SANITY_AUTHOR_ID},
        "imageType": "original",
    }
    return {"createOrReplace": doc}


def post_to_sanity(quizzes: list[dict]) -> None:
    mutations = [build_mutation(q) for q in quizzes]
    url = f"https://{SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/{SANITY_DATASET}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SANITY_TOKEN}"
    }
    response = requests.post(url, headers=headers, json={"mutations": mutations})
    response.raise_for_status()
    result = response.json()
    print(f"✅ Sanity に {len(result.get('results', []))} 件のドラフトを入稿しました")


def main():
    print(f"🚀 パイプライン開始 ({NUM_QUIZZES}件生成)")
    quizzes = generate_quizzes()
    quizzes = verify_quizzes(quizzes)
    if not quizzes:
        print("⚠️ 検証通過した問題が0件のため、入稿をスキップします")
        return
    post_to_sanity(quizzes)
    print("🎉 完了")


if __name__ == "__main__":
    main()
