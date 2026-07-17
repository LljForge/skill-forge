# skill-forge

## 改任何 skill 之前，先读 `meta/<名>/`

每个 skill 的元层账（治理宪法 / 候选清单 / 覆盖账本 / 变更史 / 理论底座）住在 `meta/<名>/`，**不在** `skills/<名>/`。

`skills/` 里**没有任何线索**会告诉你 `meta/` 存在——那是分家的代价，不是疏漏：skill 目录会被 `npx skills add` 整个拷给使用者，任何指向 `meta/` 的引用在他们机器上都指空。**发现路径是被主动切断的，所以这一步靠纪律、不靠发现。**

约定权威（指针纪律、验证断言、当前账目）在 [`meta/README.md`](meta/README.md)。仓库布局见 [`README.md`](README.md)。
