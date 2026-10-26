# 研究记录

记录日期：2026-10-26。参考对象：[1in8b.life](https://1in8b.life/)。

## 本项目的当前决定

- 用户已将研究仓库改为 public，已核实可见性。
- 用户将 sharing 调整为后续补充功能。
- MVP 草案相应改为先完成人生体验与事件记录；特殊事件记录的字段和持久化方案见 [事件记录设计](event-records.md)，仍是待实现的技术提案。
- 下文对原站 sharing 的观察继续作为后续研究材料，不表示当前 MVP 包含分享功能。

## 证据分类

- **直接观察：** 在原站界面实际看到的内容。
- **官方声明：** 原作者对制作、数据和规则的说明，尚不等于我们独立核验。
- **二创实现：** 公开仓库自己的行为或自述，不能替代对原作的调查。
- **研究判断：** 对产品机制的解释，需要通过观察或实验继续验证。

## 原站与制作

| 内容 | 分类 | 来源或边界 |
| --- | --- | --- |
| 运营者使用 Claude 辅助编写代码和文案，自己决定并检查内容 | 官方声明 | [About：Who makes it?](https://1in8b.life/en/about/) |
| 源码与开发记录保存在 GitHub 私有仓库 | 官方声明 | [Privacy：GitHub 条目](https://1in8b.life/en/privacy/) |
| 采用联合国、世界银行、WHO 等公开统计，部分缺失值经估算 | 官方声明 | [About：Where do the numbers come from?](https://1in8b.life/en/about/) |
| 这些数据是否逐项准确，模拟概率是否合理 | 未验证 | 尚未取得逐字段核验记录或完成模型验证 |
| 作者的官方公开 GitHub 地址 | 未找到 | 已找到的二创不能用来确认作者身份或原作内部实现 |

## 分享机制

| 机制 | 证据 | 研究判断，尚未验证效果 |
| --- | --- | --- |
| 出生后即可打开出生卡分享面板 | 原站直接观察；[首页](https://1in8b.life/zh-hans/) | 不必完成一生，首次抽样结果已经有表达机会 |
| 面板提供图片、X、Threads、复制文字与链接、保存图片 | 原站直接观察；分享意图链接已包含预填文案 | 用户可以用较少操作把结果带出站外 |
| 预填文案使用第一人称、出生统计和邀请读者参与的问题 | 原站直接观察 | 结果、个人表达与邀请可能共同推动点击 |
| 结局可以分享人生卡 | [官方 About](https://1in8b.life/en/about/) | 长体验可被压缩成可发布的结果 |
| 同秒出生的四个人、几个年龄节点的暂停问题 | [官方首页](https://1in8b.life/en/) | 比较与反思可能增加自我投射 |
| Shared lives、追思馆与互动 | [官方 About](https://1in8b.life/en/about/) | 人生结束后仍可以被访问和参与 |

我们实际观察到的是功能与文案，并未获得原站的分享转化率、归因数据或完整传播时间线。

## 公开实现参考

### rollroyces/born-somewhere

- [仓库](https://github.com/rollroyces/born-somewhere) 自称原作的二次创作；采用纯 HTML/CSS/JavaScript，适合阅读玩法和卡片实现。
- [README](https://github.com/rollroyces/born-somewhere/blob/main/README.md) 的功能清单是仓库作者自己的对齐说明，不是我们完成的验收表。
- [Shared Lives 实现](https://github.com/rollroyces/born-somewhere/blob/main/app.js#L4019) 读取本地人生，互动写入 localStorage；不能据此认定真实跨用户社区已实现。
- README 也列出动态多语言回退等待办，说明功能名称存在与实际完成程度需要分别检查。

### juren056/1in8billion.live

- [仓库](https://github.com/juren056/1in8billion.live) 是前者的 fork，包含分享、静态页面、部署和统计等后续改造。
- [数据审计说明](https://github.com/juren056/1in8billion.live/blob/main/DATA_SOURCES.md) 承认继承输入缺少观测年份、抽取脚本与逐行来源。
- 这一声明只能用于评价该派生项目的数据状态，不能用来证明或反证原站数据质量。

当前仓库只保存研究文档，没有复制上述仓库代码或原站资产。原站对代码、文字、图片及新作品的说明见 [使用条款](https://1in8b.life/en/terms/)。

## 后续需要取得的证据

1. 原站出生卡与结局卡的完整跨设备分享流程和落地页行为。
2. 可追溯的社媒样本：发布时间、分享对象、叙述方式、是否含卡片与入口。
3. 首批国家核心数据的字段级出处、观测年份与处理记录。
4. 本项目测试者的分享动机与有效回流，不以原站表面热度替代验证。
