# セキュリティポリシー

## セキュリティ脆弱性の報告

このプロジェクトのセキュリティを重視しています。セキュリティ脆弱性を発見した場合は、以下の方法で報告してください。

### 報告方法
- GitHubのIssueは**使用しないでください**（公開されるため）
- 直接メールまたはプライベートな方法で連絡してください

### 対象となる脆弱性
- Cross-Site Scripting (XSS)
- コードインジェクション
- 機密情報の露出
- 認証・認可の問題
- その他のセキュリティ関連の問題

## セキュリティ対策

### 実装済み対策
- 外部リソースの安全な読み込み
- 適切なファイル権限設定
- 機密情報の除外

### 推奨される追加対策
- Content Security Policy (CSP) の実装
- Subresource Integrity (SRI) の使用
- HTTPS の強制使用

## 更新履歴
- 2025-07-17: セキュリティポリシーを策定