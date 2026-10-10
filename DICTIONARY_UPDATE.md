# CSS辞書更新 — 0.2.0

2026-10-07取得のMicrosoft vscode-custom-dataを元に更新しました。
元辞書にないプロパティ377件を追加し、既存184件を含む計561件に対して、単純なキーワードと扱える値の型を取り込みました。

## 使える例

| 入力 → Tab | 展開 |
|---|---|
| d:g | display: grid; |
| d:f | display: flex; |
| gap16 | gap: 16px; |
| row-gap8 | row-gap: 8px; |
| margin-inline16 | margin-inline: 16px; |
| padding-block8 | padding-block: 8px; |
| grid-template-columns:subgrid | grid-template-columns: subgrid; |
| container-type:inline-size | container-type: inline-size; |
| text-wrap:balance | text-wrap: balance; |
| position:sticky | position: sticky; |
| h100dvh | height: 100dvh; |
| w50cqw | width: 50cqw; |
| accent-colorF | accent-color: #FFF; |
| width:revert-layer | width: revert-layer; |

0.5.9では `ar16/9` のTab展開や `bgi:linear-gradient()` などの関数入力にも対応しています。すべての複合構文を解析するわけではないため、複雑な値はプロパティを展開してから手入力してください。

## 取り込み方針

- 元データで標準扱いの、ベンダー接頭辞なしのプロパティを取り込みました。非標準・廃止・実験的と明示された項目は新規取り込みの対象外です。これはすべてのブラウザーで使えるという保証ではありません。
- 値の一覧と構文定義から、単純なキーワード、長さ、割合、数、整数、色の型を取り込みます。参照先のプロパティもたどります。
- 新しい長さ単位（dvh、svh、lvh、cqw、cqi、lhなど）を追加しました。単位は省略せず書くと確実です。
- inherit、initial、unset、revert、revert-layerを追加しました。
- 関数テンプレート、@ルール、セレクター、疑似クラスは今回の範囲外です。元版にあったものは維持します。
- 古い値やプレフィックスの自動削除はしていません。互換性を保つため、既存の既定値と値の順序も維持しています。

## 略記の互換性

旧辞書で解決できる略記は旧辞書の結果を優先します。新しいプロパティ名を省略せず指定した場合は新辞書を優先します。それ以外は旧辞書で解決できなかった場合に新辞書で探します。
たとえば c は引き続き color、op は opacityです。新しい短縮形が既存の略記と衝突した場合は、長めに入力するか hayaku.aliases で指定してください。
代表的な既存略記69例の出力が更新前と同じことを自動テストで確認しました。すべての入力パターンの完全互換を保証するものではありません。

## 出典・再更新

- データ: https://github.com/microsoft/vscode-custom-data
- 固定リビジョン: 01df47ad7cc0b140624fc941ff57618c36ed46a1
- データファイル: web-data/data/browsers.css-data.json
- 長さ単位: https://drafts.csswg.org/css-values-4/#lengths
- コンテナー単位: https://drafts.csswg.org/css-conditional-5/#container-lengths

MITライセンス表記はTHIRD_PARTY_LICENSES.txtに同梱しています。
元データを取得したフォルダーを指定し、以下で追加辞書を再生成できます。

```sh
python3 scripts/update_dictionary.py /path/to/vscode-custom-data
npm test
```

再生成後は新しいリビジョン・変更内容・テスト結果を確認してから配布してください。
拡張の利用時にダウンロードは行いません。

## 0.2.1 — font-weightの数値

font-weight-absoluteを数値型として取り込むよう修正しました。fw200 → font-weight: 200;、fw600 → font-weight: 600;、fw450.5 → font-weight: 450.5; に展開します。fwn / fwbは従来どおりnormal / boldです。CSSの有効範囲は1〜1000で、実際の表示はフォントが持つウェイトに依存します。展開エンジン自体は範囲外の値の検証を行いません。

仕様: https://www.w3.org/TR/css-fonts-4/#font-weight-prop
