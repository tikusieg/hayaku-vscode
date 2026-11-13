# Hayaku for VS Code

[English](#english) | [日本語](#日本語)

## English

A CSS abbreviation expansion extension and unofficial port of [Hayaku for Sublime Text](https://github.com/hayaku/hayaku). Supports CSS, SCSS, Less, Sass, Stylus, and PostCSS. No Python installation is required.

### Installation

Search for **Hayaku for VS Code** in the VS Code Extensions view, or install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=tikusieg.hayaku-vscode).

To install a VSIX file, open the “…” menu in the Extensions view and choose **Install from VSIX…**. If settings are missing after an update, run **Developer: Reload Window** from the Command Palette.

### Usage

Type an abbreviation inside a CSS rule to see its expansion as a **Hayaku** suggestion. Select and accept the suggestion to expand it. When the suggestion list is closed, press **Tab** to expand directly.

| Abbreviation | Expansion |
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

SCSS/Sass variables such as `$black` and interpolation such as `#{$name}` are excluded from Hayaku value completion, so you can type them normally.

You can also expand a property first and then enter its value. For example, expand `w`, type `10` to add the unit automatically, and press Tab again to finish.

### Custom snippets

When expanding directly with Tab, a custom snippet whose `prefix` exactly matches your input takes priority over Hayaku. Otherwise, Hayaku expands the abbreviation. While editing a snippet, Tab moves to the next placeholder.

Language-specific user snippets, global snippets, and the current project's `.vscode/*.code-snippets` files are supported. If the snippets directory cannot be detected, run **Hayaku: 自作スニペットの保存先を選択** (“Select custom snippet directory”) from the Command Palette.

### Editing features and shortcuts

| Action | Shortcut |
|---|---|
| Adjust a number by ±1 | Alt+↑ / ↓ |
| Adjust a number by ±10 | Alt+Shift+↑ / ↓ |
| Adjust a number by ±0.1 | Ctrl+Alt+↑ / ↓ |
| Insert a CSS block | macOS: Cmd+Enter; Windows/Linux: Ctrl+Enter |

Number adjustment works when the cursor is adjacent to a number. Selecting part of a number adjusts it according to the selected digits. Numbers inside strings, comments, URLs, and hexadecimal colors are excluded.

Block insertion works at the end of a line containing non-whitespace text. At the start or middle of a line, on a blank line, after a semicolon, or with text selected, the shortcut runs VS Code's standard **Insert Line Below** command.

Other features include converting `//` inside CSS rules into a comment placeholder, gradient placeholders, and automatic angle units.

### Settings

Search for the following in VS Code Settings:

```text
@ext:tikusieg.hayaku-vscode
```

Features can be enabled or disabled individually. Main settings:

| Setting | Feature |
|---|---|
| `hayaku.enableAbbreviations` | Abbreviation expansion and suggestions |
| `hayaku.enableUserSnippets` | Prioritize custom snippets during direct expansion |
| `hayaku.enableLivePostexpand` | Complete values as you type |
| `hayaku.enableLiveKeywordCompletion` | Complete keywords as you type |
| `hayaku.enablePostexpand` | Expand and finish values with Tab |
| `hayaku.enableValueCyclingShortcuts` | Number adjustment shortcuts |
| `hayaku.enableKeywordCycling` | Cycle keyword values |
| `hayaku.enableKeywordCyclingShortcuts` | Keyword cycling shortcuts (off by default) |
| `hayaku.enableInlineComments` | CSS comment assistance |
| `hayaku.enableFunctionSnippets` | Function assistance |
| `hayaku.disableVendorPrefixes` | Disable vendor prefixes (off by default) |

To stop keyword completion while keeping automatic numeric units, turn off `hayaku.enableLiveKeywordCompletion`. This setting is separate from keyword cycling.

Use `hayaku.aliases` to map abbreviations to expansions, `hayaku.dictionary` to customize candidate values and defaults, and `hayaku.options` to change units, quotes, formatting, and other options.

### Scope and limitations

This extension targets CSS-family languages in desktop VS Code. Embedded CSS in HTML or Vue is not supported. Live value completion applies to a single value placeholder created by Hayaku. This port is not fully compatible with the Sublime Text version.

### Feedback

Report bugs and suggestions through [GitHub Issues](https://github.com/tikusieg/hayaku-vscode/issues). Include the language, abbreviation, and expected expansion to help reproduce the issue.

### License

[MIT License](LICENSE). Copyright notices for the original Hayaku and bundled data are retained. See [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt) for CSS data licenses.

---

## 日本語

CSSの略記をTabで展開する入力支援拡張です。[Sublime Text用Hayaku](https://github.com/hayaku/hayaku)の非公式移植版で、CSS、SCSS、Less、Sass、Stylus、PostCSSに対応します。Pythonのインストールは不要です。

### インストール

VS Codeの拡張機能画面で **Hayaku for VS Code** を検索するか、[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=tikusieg.hayaku-vscode)からインストールしてください。

VSIXファイルを使用する場合は、拡張機能画面の「…」から「VSIXからのインストール」を選択します。更新後に設定が表示されない場合は、コマンドパレットで「Developer: Reload Window」を実行してください。

### 使い方

CSSルール内で略記を入力すると、展開結果が「Hayaku」のサジェスト候補に表示されます。候補を選んで確定すると展開できます。サジェストが表示されていないときは、**Tab**で直接展開できます。

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

### 自作スニペット

入力した略記が自作スニペットの`prefix`と完全一致する場合は、スニペットを優先します。一致しなければHayakuで展開します。スニペット編集中のTabは入力欄の移動に使います。

ユーザーの言語別スニペット、グローバルスニペット、プロジェクトの`.vscode/*.code-snippets`が対象です。保存先を検出できない場合は、コマンド「Hayaku: 自作スニペットの保存先を選択」で指定してください。

### 入力支援とショートカット

| 操作 | キー |
|---|---|
| 数値を±1 | Alt+↑ / ↓ |
| 数値を±10 | Alt+Shift+↑ / ↓ |
| 数値を±0.1 | Ctrl+Alt+↑ / ↓ |
| CSSブロックを挿入 | macOS: Cmd+Enter、Windows/Linux: Ctrl+Enter |

数値変更はカーソルが数値に隣接している場合に動作します。数値の一部を選択すると、その桁に応じて増減します。文字列、コメント、URL、16進色の数字は対象外です。

ブロック挿入は空白以外の文字がある行の末尾で動作します。行頭、行の途中、空行、セミコロンの後、テキスト選択中はVS Code標準の「下に行を挿入」を実行します。

CSSルール内の`//`をコメントの入力欄に変換する機能や、グラデーションの入力欄、角度の単位補完にも対応します。

### 設定

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

### 対応範囲

デスクトップ版VS CodeのCSS系言語を対象としています。HTML/Vue内の埋め込みCSSには対応していません。入力中の値補完はHayakuで作った単一の入力欄が対象です。Sublime Text版との完全互換ではありません。

### フィードバック

不具合や改善提案は[GitHub Issues](https://github.com/tikusieg/hayaku-vscode/issues)へお寄せください。使用言語、入力した略記、期待する展開結果を添えると確認しやすくなります。

### ライセンス

[MIT License](LICENSE)。元のHayakuおよび同梱データの著作権表記を保持しています。CSSデータのライセンスは[THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt)をご覧ください。
