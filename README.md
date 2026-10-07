# Hayaku for VS Code（非公式移植版）

Sublime Text用の[Hayaku](https://github.com/hayaku/hayaku)をVS Codeで使うためのCSS入力支援拡張です。元のPythonエンジンと辞書に、現代のCSS辞書とVS Code用の操作を追加しています。

現在のバージョンは **0.4.0**。Python **3.9以降**が必要です。公式Hayakuプロジェクトが配布する拡張ではありません。

## インストール

1. このリポジトリをダウンロードまたはcloneします。
2. Node.js/npmを用意し、このフォルダーで `npm run package` を実行します。
3. VS Codeの拡張機能画面の「…」→「VSIXからのインストール」で、生成された `.vsix` を選びます。
4. Pythonが見つからない場合は設定 `hayaku.pythonPath` に実行ファイルを指定します。Macでは通常 `python3`、Windowsでは `python` または絶対パスです。

デスクトップ版VS Codeが対象です。SSH/WSLでは拡張が動く側にPythonが必要です。Marketplaceには公開していません。

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

数値変更はカーソルが数値の直前・途中・単位の直後にある場合だけ有効です。それ以外では通常の行移動などに戻ります。文字列、コメント、URL、16進色の数字は対象外です。

## 設定

設定画面で `@ext:local-hayaku.hayaku-vscode-local` を検索してください。説明文は日本語です。以下のスイッチはすべて既定でオンです。

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

その他に `hayaku.pythonPath`、`hayaku.userSnippetDirectories`、`hayaku.options`、`hayaku.aliases`、`hayaku.dictionary` があります。数値変更のキーだけを無効にする例：

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
- Sublime専用のライブ変換は、Tabで確定する後展開に置き換えています。
- 元版の特殊な関数スニペット、日付・バージョン変更、独自の行移動、設定自動移行などは未移植。
- 関数・複合値・文脈の解析は限定的です。最新CSSの全構文を扱うものではありません。
- `isFileTemplate`、`include` / `exclude` 付きの自作スニペットは自動優先の対象外。
- 略記の展開ごとにPythonを起動します。5秒でタイムアウトします。
- VS Code実画面でのキー競合は未検証です。

拡張自身はネットワーク通信しません。

## 開発・テスト

Node.jsとPython 3.9以降を用意してください。追加Pythonパッケージは不要です。

```sh
npm test
npm run package
```

51件の自動テストが通過しています。既存略記69例の回帰確認、辞書、設定の切り替え、自作スニペット、数値位置の判定を含みます。VS Code API部分は模擬環境でのテストです。`test/vscode-integration.js` はExtension Host用ですが、作成環境ではVS Codeの起動に失敗し、実行完了していません。

`npm run package` は初回にVSIX作成ツールをダウンロードします。

## ライセンス

MIT。元のHayakuの著作権表記を [LICENSE](LICENSE) に残しています。VS Code CSSデータの表記は [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt) を参照してください。

- 元のHayaku: https://github.com/hayaku/hayaku
- 同梱元リビジョン: [UPSTREAM_COMMIT](UPSTREAM_COMMIT)
- CSSデータ: https://github.com/microsoft/vscode-custom-data
