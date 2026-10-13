# Hayaku for VS Code

CSSの略記をTabで展開する入力支援拡張です。[Sublime Text用Hayaku](https://github.com/hayaku/hayaku)の非公式移植版で、CSS、SCSS、Less、Sass、Stylus、PostCSSに対応します。Pythonのインストールは不要です。

## インストール

VS Codeの拡張機能画面で **Hayaku for VS Code** を検索するか、[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=tikusieg.hayaku-vscode)からインストールしてください。

VSIXファイルを使用する場合は、拡張機能画面の「…」から「VSIXからのインストール」を選択します。更新後に設定が表示されない場合は、コマンドパレットで「Developer: Reload Window」を実行してください。

## 使い方

CSSルール内で略記を入力し、**Tab**を押します。

| 入力 | 展開結果 |
|---|---|
| `mb16` | `margin-bottom: 16px;` |
| `p6-10` | `padding: 6px 10px;` |
| `por` | `position: relative;` |
| `w10` | `width: 10px;` |
| `ml-10` | `margin-left: -10px;` |
| `w1.5` | `width: 1.5em;` |
| `d:g` | `display: grid;` |
| `gap16` | `gap: 16px;` |
| `mi16` | `margin-inline: 16px;` |
| `mia` | `margin-inline: auto;` |
| `ar16/9` | `aspect-ratio: 16/9;` |
| `of:cover` | `object-fit: cover;` |
| `mbmm` | `mix-blend-mode: multiply;` |
| `fw600` | `font-weight: 600;` |
| `ffs` | `font-feature-settings: "palt" 1;` |
| `cup` | `cursor: pointer;` |
| `cFA` | `color: #FAFAFA;` |

SCSS/Sassの`$black`などの変数や`#{$name}`の補間は、Hayakuの値補完の対象外です。通常どおり入力できます。

プロパティだけを展開してから値を入力することもできます。例えば、`w` → Tab → `10`で単位を補完し、もう一度Tabを押すと確定します。

## 自作スニペット

入力した略記が自作スニペットの`prefix`と完全一致する場合は、スニペットを優先します。一致しなければHayakuで展開します。スニペット編集中のTabは入力欄の移動に使います。

ユーザーの言語別スニペット、グローバルスニペット、プロジェクトの`.vscode/*.code-snippets`が対象です。保存先を検出できない場合は、コマンド「Hayaku: 自作スニペットの保存先を選択」で指定してください。

## 入力支援とショートカット

| 操作 | キー |
|---|---|
| 数値を±1 | Alt+↑ / ↓ |
| 数値を±10 | Alt+Shift+↑ / ↓ |
| 数値を±0.1 | Ctrl+Alt+↑ / ↓ |
| CSSブロックを挿入 | macOS: Cmd+Enter、Windows/Linux: Ctrl+Enter |

数値変更はカーソルが数値に隣接している場合に動作します。数値の一部を選択すると、その桁に応じて増減します。文字列、コメント、URL、16進色の数字は対象外です。

ブロック挿入は空白以外の文字がある行の末尾で動作します。行頭、行の途中、空行、セミコロンの後、テキスト選択中はVS Code標準の「下に行を挿入」を実行します。

CSSルール内の`//`をコメントの入力欄に変換する機能や、グラデーションの入力欄、角度の単位補完にも対応します。

## 設定

VS Codeの設定画面で次を検索してください。

```text
@ext:tikusieg.hayaku-vscode
```

各機能は個別にオン・オフできます。主な設定は以下のとおりです。

| 設定キー | 機能 |
|---|---|
| `hayaku.enableAbbreviations` | 略記の展開 |
| `hayaku.enableUserSnippets` | 自作スニペットを優先 |
| `hayaku.enableLivePostexpand` | 入力中の値補完 |
| `hayaku.enableLiveKeywordCompletion` | 入力中のキーワード補完 |
| `hayaku.enablePostexpand` | Tabで値を展開・確定 |
| `hayaku.enableValueCyclingShortcuts` | 数値変更のキー操作 |
| `hayaku.enableKeywordCycling` | キーワードの順送り |
| `hayaku.enableKeywordCyclingShortcuts` | キーワード変更のキー操作（既定でオフ） |
| `hayaku.enableInlineComments` | CSSコメントの入力支援 |
| `hayaku.enableFunctionSnippets` | 関数の入力支援 |
| `hayaku.disableVendorPrefixes` | ベンダープレフィックスを無効化（既定でオフ） |

入力中のキーワード補完だけを止めて、数値の単位補完を維持するには、`hayaku.enableLiveKeywordCompletion`をオフにしてください。キーワードの順送りとは別の設定です。

`hayaku.aliases`で略記の展開先、`hayaku.dictionary`で候補値や初期値、`hayaku.options`で単位・引用符・書式などを変更できます。

## 対応範囲

デスクトップ版VS CodeのCSS系言語を対象としています。HTML/Vue内の埋め込みCSSには対応していません。入力中の値補完はHayakuで作った単一の入力欄が対象です。Sublime Text版との完全互換ではありません。

## フィードバック

不具合や改善提案は[GitHub Issues](https://github.com/tikusieg/hayaku-vscode/issues)へお寄せください。使用言語、入力した略記、期待する展開結果を添えると確認しやすくなります。

## ライセンス

[MIT License](LICENSE.txt)。元のHayakuおよび同梱データの著作権表記を保持しています。CSSデータのライセンスは[THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)をご覧ください。
