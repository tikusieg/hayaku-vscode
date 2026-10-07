# Marketplaceへの自動公開

`.github/workflows/publish-marketplace.yml` は、`v` で始まるタグがpushされるとテストを実行し、成功後にVisual Studio Marketplaceへ公開します。タグの番号は `package.json` のバージョンと一致させます（例：`package.json` が `0.5.3` なら `v0.5.3`）。同じバージョンは再公開できないため、新しいリリースごとにバージョンを上げてください。

## 最初に一度だけ行う設定

1. [Azure DevOpsのサインイン画面](https://aex.dev.azure.com/)にアクセスし、Marketplaceのpublisher `tikusieg` を管理できるMicrosoftアカウントでサインインします。`dev.azure.com` のトップページは製品案内へ転送されるため、こちらのURLを使ってください。
2. Azure DevOpsの組織を選択してUser settings → Personal access tokens → New Tokenを開きます。PATは**Organization-scoped**で作り、使用する組織を1つ選択します。スコープは `Marketplace (Manage)` にします。組織がまだなければAzure DevOpsの「New organization」から作成してください。
3. GitHubの `tikusieg/hayaku-vscode` で **Settings → Secrets and variables → Actions → New repository secret** を開きます。
4. Secret名を `VSCE_PAT`、値を作成したトークンにして保存します。トークンはリポジトリのファイルやチャットに貼り付けないでください。
5. このworkflowを含む変更を `main` にpushします。

GitHub ActionsのSecretは、workflowで明示して渡した場合だけ実行環境から利用できます。詳細は[GitHubのSecrets説明](https://docs.github.com/en/actions/concepts/security/secrets)を参照してください。

## リリースのたびに行う操作

1. `package.json` の `version` を次の番号に上げ、`CHANGELOG.md` に変更内容を書きます。
2. GitHub Desktopで変更をコミットして `main` にpushします。
3. **Repository → Create Tag** を選び、`package.json` の番号に `v` を付けたタグを作成します。例：`v0.5.4`。
4. GitHub Desktopでタグをpushします。GitHub Actionsがテストし、成功するとMarketplaceへ公開します。進行状況と失敗理由はGitHubの **Actions** タブで確認できます。

GitHub Desktopの通常のpushだけでは公開されません。タグをpushした時だけ公開します。これにより、作業途中の変更やドキュメントだけの更新をMarketplaceへ出さずに済みます。

## 認証の今後

MicrosoftはグローバルPATの新規作成を停止し、既存のグローバルPATも **2026年12月1日** に無効化すると案内しています。この手順では組織単位のPATを使います。PATは有効期限を設定し、期限前にGitHub Secretを更新してください。Microsoftの[PAT作成手順](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops)と[Marketplace公開ガイド](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)を参照してください。
