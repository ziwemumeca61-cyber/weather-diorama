# AI 羊毛聚合（内测版）

AI 免费福利聚合页：聚合各大 AI 平台的免费额度 / 试用 / 优惠信息，可搜索、可筛选。

## 功能
- 列表 + 关键词搜索（标题/一句话）
- 3 个筛选：品类 / 地域 / 状态
- 过期条目置灰展示
- 移动端优先，米色风格

## 技术栈
Vite + React，纯 CSS，静态部署于 Vercel。

## 数据
`data/deals.json`：6 条种子（附录A原文）+ `scripts/parse-intel.js` 从开源情报仓库自动解析的真实条目（拒绝编造）。
`node scripts/validate.js` 校验全部条目。

## 本地
```bash
npm install
npm run dev        # 开发
npm run build      # 构建 → dist/
node scripts/validate.js   # 数据校验
```
