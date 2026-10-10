# Hayaku for VS Code（非公式移植版）

Sublime Text用の[Hayaku](https://github.com/hayaku/hayaku)をVS Codeで使うためのCSS入力支援拡張です。元の略記エンジンをJavaScriptに移植し、現代のCSS辞書とVS Code用の操作を追加しています。

現在のバージョンは **0.5.3**。Pythonのインストールは不要です。公式Hayakuプロジェクトが配布する拡張ではありません。

## インストール

VSIXをお持ちの場合は、VS Codeの「VSIXからのインストール」で適用できます。以前のローカル版（local-hayaku.hayaku-vscode-local）とは拡張IDが異なるため、旧版はアンインストールしてから使ってください。

ソースから作成する場合：

1. このリポジトリをダウンロードまたはcloneします。
2. Node.js/npmを用意し、このフォルダーで `npm run package` を実行します。
3. VS Codeの拡張機能画面の「…」→「VSIXからのインストール」で、生成された `.vsix` を選びます。

デスクトップ版VS Codeが対象です。SSH/WSLでもPythonは不要です。Marketplace公開用のパッケージです。

## 略記の展開

CSSルール内で略記を入力し、Tabを押します。

| 入力 | 展開結果 |
|---|---|
| `mb16` | `margin-bottom: 16px;` |
| `por` / `pstnrltv` / `p:r` | `position: relative;` |
| `w10` | `width: 10px;` |
| `ml-10` | `margin-left: -10px;` |
| `w10.5` | `width: 10.5em;` |
| `d:g` | `display: grid;` |
| `gap16` | `gap: 16px;` |
| `margin-inline16` | `margin-inline: 16px;` |
| `h100dvh` | `height: 100dvh;` |
| `fw600` | `font-weight: 600;` |
| `ffs` | `font-feature-settings: "palt" 1;` |
| `cFA` | `color: #FAFAFA;` |

`w` → Tab → `10` → Tabのように、プロパティを展開した後に値を入力する使い方にも対応します。値の後展開は単一カーソル・単一プロパティが対象です。

CSS、SCSS、Less、Sass、Stylus、PostCSSに対応します。CSS以外は別途言語拡張が必要な場合があります。

## 自作スニペットとの使い分け

自動サジェストはVS Codeの設定に従います。候補はEnterで確定できます。Tabの優先順位は次のとおりです。

1. スニペット編集中なら次の入力欄へ移動。Hayakuの入力欄は値を後展開。
2. 自作スニペットの `prefix` と完全一致したら、そのスニペットを挿入。
3. 一致しなければHayakuで展開。
4. どちらも対象外なら通常のTab。

自作の `mb` があればそれを使い、なければHayakuの `margin-bottom` を展開します。同じ略記が複数あれば選択画面を表示します。

ユーザーの言語別 `.json`、グローバル `.code-snippets`、現在のプロジェクトの `.vscode/*.code-snippets` を読み込みます。拡張機能由来のスニペットは優先対象に含めません。

保存先を検出できない場合は、コマンドパレットの **「Hayaku: 自作スニペットの保存先を選択」** から使用中の `snippets` フォルダーを指定してください。別プロファイルやリモート環境では明示指定が必要な場合があります。

## 数値変更とブロック挿入

| 操作 | キー |
|---|---|
| 数値を±1 | Alt+↑ / ↓ |
| 数値を±10 | Alt+Shift+↑ / ↓ |
| 数値を±0.1 | Ctrl+Alt+↑ / ↓ |
| CSSブロックを挿入 | Mac: Cmd+Enter / Windows・Linux: Ctrl+Enter |

Cmd+Enterは空白以外の文字がある行の末尾でのみブロックを挿入します。行頭・行の途中・空行・末尾の空白を除いた最後の文字が `;` の場合や、テキストを選択中の場合は、標準の「下に行を挿入」になります。

数値変更はカーソルが数値の直前・途中・単位の直後にある場合だけ有効です。それ以外では通常の行移動などに戻ります。文字列、コメント、URL、16進色の数字は対象外です。

## 設定

設定画面で `@ext:tikusieg.hayaku-vscode` を検索してください。説明文は日本語です。以下のスイッチは、ベンダープレフィックス無効化を除いて既定でオンです。

| 設定キー | 機能 |
|---|---|
| `hayaku.enableAbbreviations` | 略記の展開 |
| `hayaku.enableUserSnippets` | 自作スニペットを優先 |
| `hayaku.enablePostexpand` | 値の後展開 |
| `hayaku.enableCodeBlocks` | CSSブロックの挿入 |
| `hayaku.enableValueCycling` | 数値の変更 |
| `hayaku.enableValueCyclingShortcuts` | 数値変更のキー操作 |
| `hayaku.enableSnippetNavigation` | Tabで入力欄を移動する操作を優先 |
| `hayaku.clipboardDefaults` | コピーした色・画像パスを初期値に利用 |
| `hayaku.disableVendorPrefixes` | ベンダープレフィックスを無効化（既定でオフ） |

その他に `hayaku.userSnippetDirectories`、`hayaku.options`、`hayaku.aliases`、`hayaku.dictionary` があります。数値変更のキーだけを無効にする例：

```json
{
  "hayaku.enableValueCyclingShortcuts": false
}
```

独自に `keybindings.json` に追加した割り当ては別管理です。以前のHayaku用設定と競合する場合は手動設定を削除して、本拡張の既定の割り当てを使用してください。

## 辞書と互換性

MicrosoftのVS Code CSSデータを元にプロパティ377件を追加しています。既存の略記は旧辞書を優先し、新しいプロパティを省略せず書いた場合は新辞書を使用します。詳細と再生成方法は [DICTIONARY_UPDATE.md](DICTIONARY_UPDATE.md) を参照してください。

完全互換ではありません。主な制限：

- HTML/Vueなどの埋め込みCSS、異なる略記の複数カーソル同時展開は未対応。
- 入力中の後展開はHayakuで作った単一の入力欄が対象です。Sublime版のスニペット変換と完全に同じ仕組みではありません。
- 日付・バージョン変更、独自の行移動、設定自動移行などは未移植。
- 関数・複合値・文脈の解析は限定的です。最新CSSの全構文を扱うものではありません。
- `isFileTemplate`、`include` / `exclude` 付きの自作スニペットは自動優先の対象外。
- VS Code実画面でのキー競合は未検証です。

拡張自身はネットワーク通信しません。

## 開発・テスト

通常のテスト・パッケージ作成にはNode.js/npmを用意してください。拡張の実行にはVS Code内蔵のJavaScript実行環境を使用します。

```sh
npm test
npm run package
```

59件の自動テストが通過しています。既存略記69例の回帰確認、辞書、設定の切り替え、自作スニペット、数値位置の判定を含みます。VS Code API部分は模擬環境でのテストです。`test/vscode-integration.js` はExtension Host用ですが、作成環境ではVS Codeの起動に失敗し、実行完了していません。

`npm run package` は初回にVSIX作成ツールをダウンロードします。

JavaScript移植時に旧版で正常に処理された7,427入力の展開結果が完全一致することを確認済みです。旧Pythonエンジンと比較専用スクリプトは0.5.2で削除しました。辞書を再生成する開発用スクリプト `scripts/update_dictionary.py` のみPythonを使用します。通常の利用・テスト・パッケージ作成には不要です。

手元の計測では代表的な5種類の略記の平均処理時間が旧版約47ms、新版約0.2msでした。新版の初回辞書準備を含む処理は約7.5msです。環境で変わる値で、VS Codeの入力・描画時間は含みません。

## Marketplaceへの公開

GitHub Actionsでテスト後に自動公開できます。初回設定とリリース手順は [MARKETPLACE_RELEASE.md](MARKETPLACE_RELEASE.md) を参照してください。

## ライセンス

MIT。元のHayakuの著作権表記を [LICENSE](LICENSE) に残しています。VS Code CSSデータの表記は [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt) を参照してください。

- 元のHayaku: https://github.com/hayaku/hayaku
- 同梱元リビジョン: [UPSTREAM_COMMIT](UPSTREAM_COMMIT)
- CSSデータ: https://github.com/microsoft/vscode-custom-data

0.4.2ではTabの言語・設定判定を見直しました。以前手動で追加したhayaku.expandのTab割り当ては削除し、拡張の既定設定をご利用ください。

0.5.0では略記エンジンをJavaScriptに移植しました。旧設定 `hayaku.pythonPath` は使用しないため、設定ファイルに残っていれば削除できます。自作スニペット優先、各機能のオンオフ、日本語の設定説明は引き継いでいます。

### 優先する略記

`of` は `object-fit`、`ar` は `aspect-ratio`、`mi` は `margin-inline`、`mbm` は `mix-blend-mode` を優先します。`mi16` → `margin-inline: 16px;`、`mia` → `margin-inline: auto;`、`ar16/9` → `aspect-ratio: 16/9;` のように値を続けられます。

cursorは `cu` から始めて入力します。`cup` → `cursor: pointer;`、`cud` → `cursor: default;`。従来の `cp` などはcursorの略記として扱いません。独自の略記を設定した場合は、その設定を優先します。

数値をハイフンで区切ると複数の値を指定できます。`p6-10` → `padding: 6px 10px;`、`m6-10-12-14` → `margin: 6px 10px 12px 14px;`。単位付きの `p6px-10rem` や負数の `m-6--10` にも対応します。

### 0.5.9で追加した入力支援

- CSSのルール内で `//` を入力すると `/* 入力欄 */` に変換します。Sass/SCSS等の行コメントは変換しません。
- Hayakuで作った値入力欄では、入力中に単位・キーワード・色を補完します。`w` → Tab → `10` で `width: 10px;`。RGBAの `255,`、`255,.` や `!im` も扱います。Tabによる確定も引き続き使えます。
- 数値の一部を選択すると、その桁に応じて増減します。`123` の `1` を選択して増やすと `223` になります。widthなどの非負の値は0を下限にします。
- コマンド「Hayaku: カーソル付近のキーワードを変更」で `position: static` などの値を順送りします。Alt+↑/↓で使うには「キーワード変更のキー操作」をオンにします。初期状態はオフなので、数値以外での行移動は維持されます。
- `bgi:linear-gradient()` などに複数の入力欄を用意します。`trf:rotate()`、`trf:skew()` の数値には入力欄の確定時に `deg` を補完します。

これらは設定画面の「Hayaku」で個別にオン・オフできます。「入力中の後展開」「CSSのコメント変換」「選択した桁の数値変更」「数値変更の下限」「キーワードの値変更」「関数の入力支援」を参照してください。

`hayaku.options` の `CSS_syntax_url_quotes` でURLの引用符を指定できます。未指定ではCSS系は引用符なし、Sass/Stylusは引用符ありです。`CSS_syntax_quote_symbol` で引用符の種類を指定します。

ブロックの書式は `CSS_whitespace_block_start_before` / `after`、`CSS_whitespace_block_end_before` / `after`、`CSS_syntax_no_curly_braces` で変更できます。`CSS_syntax_autoguess` に `selector {`、`  property: value;`、`}` のような行の配列を指定して書式を設定することもできます。これは現在のファイルを読み取って書式を推測する機能ではありません。個別に指定した設定を優先します。

`CSS_function_snippets` は関数値とスニペット文字列の対応を指定するオブジェクトです。例えば `linear-gradient()` の入力欄を変更できます。ユーザー辞書はオブジェクト形式のほか元版の配列形式も使え、`remove_values` だけの指定にも対応します。
