# 小贷星管理 —— 测试代码落地交付

- **上游规范**：`meta/test-case-design/evals/2026-06-26-xiaodaixing-mgmt/claude-skill-on-v015-final.md`
- **技术栈**：Java 8+ / Spring Boot / JUnit 5 / MockMvc / Mockito
- **约束**：本次只交付代码文本，未编译、未运行（按任务要求禁止 mvn/gradle）。

---

## 0. 先读这一节（给上游 / 团队）

### 0.1 我做了什么

30 条用例（TC-F 13 / TC-E 16 / TC-ERR 4 / TC-ST 1）逐条落地，分四类处置：

| 处置 | 条数 | 用例 |
|---|---|---|
| ✅ 已写成可执行断言 | 22 | TC-F-001~010, TC-E-001~009, TC-E-011~013, TC-E-015, TC-E-016, TC-ERR-001, TC-ERR-003, TC-ERR-004, TC-ST-001（含 TC-E-014 的第一条 THEN） |
| 🟡 写成 `@Disabled` 骨架，等澄清 | 2 | TC-E-010（澄-1）、TC-E-014 第二条 THEN（澄-2） |
| ⛔ 不由 JUnit 承担，另派载体 | 3 | TC-F-011、TC-ERR-002（前端 E2E）、TC-F-013（CI 构建门禁） |
| 📄 不是测试，是交付物检查 | 1 | TC-F-012（文档评审清单，可选做成一条文件存在性断言） |

合计 28 条对应 JUnit / 骨架，另 3 条见 §6。

### 0.2 我必须自己填的空（**请上游或后端开发确认**）

规范严格遵守了「不写请求构造方式」的纪律，这在设计层是对的，但落到代码就意味着**下面这些东西规范里一个都没有，全是我从字段中文名和 `.java` 文件名反推的**。反推错了测试会全红，且红的原因与被测行为无关。

| 我假设的 | 依据 | 风险 |
|---|---|---|
| `Result` 有 `code` / `msg` / `data`，成功码 `200`、失败非 `200`；或有 `success` 布尔 | 通用范式猜测 | **高**。整个 MockMvc 断言层都挂在这上面 |
| 分页结果形如 `data.records[]` + `data.total` | MyBatis-Plus/QmPage 范式猜测 | **高** |
| 导入成功 `msg` 含处理条数（TC-F-001 / TC-E-004 需要断言"告知条数"） | 规范 THEN「成功信息中告知本次处理的条数」 | **高**，格式完全未知 |
| 实体/VO 的 Java 字段名（`projectNo`、`customerName`、`writeOffAmount2`、`dataDate`…） | 从规范提到的列名 `write_off_amount_2` 及中文列名反推 | 中 |
| 36 列的完整 idx→字段对照 | **规范未给全表**，只点名了 idx 17 / 31 / 35 | **高**，见 §0.3 |
| 查询端点吃 JSON body 的 `SearchVO` | 接口契约 #2 写 `SearchVO` → 分页结果 | 中 |
| 分页参数名 `pageNum` / `pageSize` | 通用猜测 | 中 |

**所有这些假设我集中到了一个类 `XdxTestContract`（§2.1）**，改一处即可全局生效。请后端开发拿到后先只改这一个文件，再跑测试。

### 0.3 规范里我认为需要补的三个洞

1. **36 列映射表没进规范**。规范 R10 说"design ③ 有 36 列映射表"，但规范本身只写了 idx 17 / 31 / 35 三列。TC-F-005 的第三条 THEN 是「其余 33 列各按其列序落入对照表约定的对应字段」——**我无法把这条写成断言，因为对照表不在我手里**。我写了一个数据驱动的骨架，把对照表抽成 `COLUMN_MAP` 常量数组，目前只填了已知的三列，其余 33 行留 TODO。请把 design ③ 的表贴进来（或直接贴进 `XdxTestContract.COLUMN_MAP`），补完即自动生效。这是本次交付**最大的一处未完成**。
2. **TC-E-014 的 N/P/M 是符号，不是数**。GIVEN 写「共有 N 条、每页 P 条、分 M 页」。我取 N=25、P=10、M=3。若真实分页组件对 `pageSize` 有上限或默认值，这组数可能不成立。
3. **歧义点用例的定位问题**。歧-1~11 共 11 条，规范已明确标注"取自实现、非产品契约、实现改了会红、实现错了不会红"。我把它们全部打上 `@Tag("impl-derived")` 并在 Javadoc 里回指歧义编号。**建议 CI 把这个 tag 单独分组跑**——它们红了不代表有 bug，代表实现改了需要人来重新签字。混在主套件里会制造假警报。

### 0.4 我在落地时发现的两个具体问题

**(a) TC-E-001 与 TC-E-016 的可测性冲突。**
TC-E-001 要断言「版本号在原值基础上递增一次」。这要求测试能读到 `version` 列。但如果 UPDATE 走的是 `TjdBaseXiaodaixingProjectMapper.xml` 里的自定义批量 SQL（规范提到 `:5-50`），version 是否自增取决于那段 SQL 有没有写 `version = version + 1`——**乐观锁插件通常不作用于自定义 XML SQL**。我按规范写了断言，但提醒：这条如果红了，很可能是规范的预期（想当然认为版本会自增）而非实现有错。**建议上游复核 TC-E-001 第三条 THEN 的依据**——它在"已裁决冲突存档"里没有出处，看起来是推断出来的。

**(b) TC-ERR-004 的"靠后某一行写库失败"没法在集成测试里自然构造。**
规范 GIVEN 写「其中靠后的某一行在写库阶段会触发失败」。真实触发写库失败的手段只有：超长字段（撞上澄-1，未定）、约束冲突（表上除主键外未见约束）、或 mock。我用了 Mockito `spy` + `doThrow` 打桩 mapper 层，这**引入了执行方式耦合**，但没有替代方案。如果表上有可依赖的 NOT NULL 约束，请告诉我，我改成数据驱动。

---

## 1. 目录布局

```
base-service/src/test/java/com/qfc/base/xiaodaixing/
├── support/
│   ├── XdxTestContract.java        # ★ 所有外部形状假设集中于此
│   ├── XlsxFixture.java            # 用 EasyExcel 现场生成测试 xlsx（不落磁盘固件）
│   └── XdxFixtures.java            # 领域固件：标准 66 行清单、脏值清单等
├── unit/
│   └── XdxImportServiceTest.java   # Mockito，导入解析/转换纯逻辑
└── integration/
    ├── XdxImportApiTest.java       # SpringBoot + MockMvc + 真库，导入链路
    ├── XdxSearchApiTest.java       # SpringBoot + MockMvc + 真库，查询链路
    └── XdxPendingSpecTest.java     # 预期待定用例的 @Disabled 骨架
```

不落磁盘 xlsx 固件是刻意的：规范里多条用例（TC-E-002/005/006/007/008/009）各需要一份形状不同的清单，用二进制固件维护会失控，且 diff 不可读。`XlsxFixture` 让每条用例在自己的测试方法里声明性地写出它要的表格内容。

---

## 2. 支撑代码

### 2.1 XdxTestContract —— 所有假设的单一收口

```java
package com.qfc.base.xiaodaixing.support;

/**
 * 【重要】本类集中承载测试对"被测系统外部形状"的全部假设。
 *
 * 上游测试规范（claude-skill-on-v015-final.md）按设计纪律没有描述请求构造方式与响应结构，
 * 因此下列常量均为落地时反推所得，未经代码核对。测试首次运行前，请后端开发只校正本文件。
 *
 * 校正清单见交付文档 §0.2。
 */
public final class XdxTestContract {

    private XdxTestContract() {}

    // ---------- 端点（来源：接口契约 #1 / #2，规范已明确，可信） ----------
    public static final String IMPORT_URL = "/xiaodaixing/tjdBaseXiaodaixingProject/importExcel";
    public static final String SEARCH_URL = "/xiaodaixing/tjdBaseXiaodaixingProject/search";
    public static final String MULTIPART_PART_NAME = "file";

    // ---------- Result 信封（假设） ----------
    public static final String JP_CODE  = "$.code";
    public static final String JP_MSG   = "$.msg";
    public static final String JP_DATA  = "$.data";
    public static final int    OK_CODE  = 200;

    // ---------- 分页信封（假设） ----------
    public static final String JP_RECORDS = "$.data.records";
    public static final String JP_TOTAL   = "$.data.total";
    public static final String REQ_PAGE_NUM  = "pageNum";
    public static final String REQ_PAGE_SIZE = "pageSize";

    // ---------- 错误提示语（来源：异常场景 #1，规范给了原文） ----------
    public static final String MSG_EMPTY_FILE = "文件不能为空！";
    /** 歧-10：后端无格式校验，仅"导入失败：<异常消息>"。断言只取前缀，避免绑死异常文案。 */
    public static final String MSG_IMPORT_FAIL_PREFIX = "导入失败";

    // ---------- 36 列对照表 ----------
    /**
     * 【未完成】规范 R10 引用了 design ③ 的 36 列映射表，但规范正文只点名了 idx 17 / 31 / 35。
     * 其余 33 行请从 design.md 补入，补完后 TC-F-005 的第三条 THEN 自动生效。
     *
     * 元素含义：{ excel列序(0基), 实体Java字段名, 期望类型: S=String / D=BigDecimal }
     */
    public static final String[][] COLUMN_MAP = new String[][] {
        // { "0",  "customerName",        "S" },   // TODO 待 design ③ 确认
        // { "1",  "projectNo",           "S" },   // TODO
        // ...
        { "17", "writeOffAmount",       "D" },   // 「核销金额」重复列①
        { "31", "writeOffAmount2",      "D" },   // 「核销金额」重复列②
        { "35", "guaranteeMethodDetail","S" },   // 空表头列 → 担保方式明细
    };

    // ---------- 实体字段名（假设，仅用于反射与断言） ----------
    public static final String F_CUSTOMER   = "customerName";
    public static final String F_PROJECT_NO = "projectNo";
    public static final String F_ORG        = "orgName";
    public static final String F_OVERDUE    = "isOverdue";
    public static final String F_RATING     = "projectRating";
    public static final String F_DATA_DATE  = "dataDate";
    public static final String F_CONTRACT_AMT = "contractAmount";
}
```

### 2.2 XlsxFixture —— 声明式生成 xlsx

```java
package com.qfc.base.xiaodaixing.support;

import com.alibaba.excel.EasyExcel;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 现场生成 xlsx 字节流，避免维护二进制固件。
 * 全部按"表头行 + 数据行"的裸二维结构写出，从而能够构造重复表头、空表头、缺列等异常形状。
 */
public final class XlsxFixture {

    private final List<String> headers = new ArrayList<>();
    private final List<List<Object>> rows = new ArrayList<>();
    private String fileName = "小贷星项目清单.xlsx";

    public static XlsxFixture create() { return new XlsxFixture(); }

    public XlsxFixture headers(List<String> h) { this.headers.clear(); this.headers.addAll(h); return this; }

    /** 生成 36 列的默认表头，其中 idx17/idx31 同名「核销金额」、idx35 为空表头 —— 即真实清单形状。 */
    public XlsxFixture standard36Headers() {
        List<String> h = new ArrayList<>();
        for (int i = 0; i < 36; i++) {
            h.add("列" + i);
        }
        h.set(17, "核销金额");
        h.set(31, "核销金额");
        h.set(35, "");            // 空表头列
        return headers(h);
    }

    public XlsxFixture row(List<Object> cells) { rows.add(new ArrayList<>(cells)); return this; }

    public XlsxFixture rows(List<List<Object>> rs) { rs.forEach(this::row); return this; }

    public XlsxFixture fileName(String n) { this.fileName = n; return this; }

    public byte[] toBytes() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        List<List<String>> head = new ArrayList<>();
        headers.forEach(h -> head.add(Arrays.asList(h)));
        EasyExcel.write(out).head(head).sheet("Sheet1").doWrite(rows);
        return out.toByteArray();
    }

    public MockMultipartFile toMultipart() {
        return new MockMultipartFile(
                XdxTestContract.MULTIPART_PART_NAME,
                fileName,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                toBytes());
    }
}
```

### 2.3 XdxFixtures —— 领域固件

```java
package com.qfc.base.xiaodaixing.support;

import org.springframework.mock.web.MockMultipartFile;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class XdxFixtures {

    /** 36 列中，各特殊列的列序。COLUMN_MAP 补全后应改为从其中派生。 */
    public static final int IDX_DATA_DATE   = 0;   // TODO 待 design ③ 确认「数据日期」实际列序
    public static final int IDX_CUSTOMER    = 1;   // TODO
    public static final int IDX_PROJECT_NO  = 2;   // TODO
    public static final int IDX_ORG         = 3;   // TODO
    public static final int IDX_OVERDUE     = 4;   // TODO 「是否逾期」
    public static final int IDX_RATING      = 5;   // TODO 「项目评级」
    public static final int IDX_CONTRACT_AMT= 6;   // TODO 「合同金额」
    public static final int IDX_LOAN_AMT    = 7;   // TODO 「放款金额」
    public static final int IDX_OVERDUE_FROM= 8;   // TODO 「逾期起始日」
    public static final int IDX_PROVISION   = 9;   // TODO 「准备金计提比例」
    public static final int IDX_WRITE_OFF_1 = 17;
    public static final int IDX_WRITE_OFF_2 = 31;
    public static final int IDX_BLANK_HEADER= 35;

    private XdxFixtures() {}

    /** 一行空白的 36 列骨架。 */
    public static List<Object> blankRow() {
        List<Object> r = new ArrayList<>(Collections.nCopies(36, (Object) ""));
        return r;
    }

    public static List<Object> row(String dataDate, String customer, String projectNo) {
        List<Object> r = blankRow();
        r.set(IDX_DATA_DATE, dataDate);
        r.set(IDX_CUSTOMER, customer);
        r.set(IDX_PROJECT_NO, projectNo);
        return r;
    }

    /**
     * 标准月度清单：66 条数据行，数据日期仅首行有值（真实文件形状，见业务规则 R3）。
     * 无同「数据日期+项目号」重复行、无空壳行 —— 满足 TC-F-001 的 GIVEN 场景限定。
     */
    public static MockMultipartFile standardList(String dataDate) {
        XlsxFixture f = XlsxFixture.create().standard36Headers();
        for (int i = 0; i < 66; i++) {
            List<Object> r = row(i == 0 ? dataDate : "", "客户" + i, "PRJ-" + dataDate + "-" + i);
            r.set(IDX_CONTRACT_AMT, "1000.500000");
            f.row(r);
        }
        return f.fileName("小贷星项目清单（" + dataDate + "）.xlsx").toMultipart();
    }

    /** 仅表头、零数据行。 */
    public static MockMultipartFile headerOnly() {
        return XlsxFixture.create().standard36Headers().toMultipart();
    }

    public static MockMultipartFile emptyFile() {
        return new MockMultipartFile(
                XdxTestContract.MULTIPART_PART_NAME, "empty.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", new byte[0]);
    }

    /** 非空但不是合法工作簿。 */
    public static MockMultipartFile notAWorkbook() {
        return new MockMultipartFile(
                XdxTestContract.MULTIPART_PART_NAME, "报表.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "这不是一个 Excel 工作簿，只是一段纯文本。".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
```

---

## 3. 集成测试 —— 导入链路

```java
package com.qfc.base.xiaodaixing.integration;

import com.qfc.base.xiaodaixing.support.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.qfc.base.xiaodaixing.support.XdxTestContract.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 导入链路集成测试。
 *
 * 每个方法 @Transactional 回滚，因此"台账中尚无该批次数据"的 GIVEN 靠事务隔离保证，
 * 而非靠 setUp 清库（清库会误伤开发本地数据）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("小贷星 · 导入链路")
class XdxImportApiTest {

    @Autowired MockMvc mvc;
    @Autowired TjdBaseXiaodaixingProjectService service;   // 用于读回落库结果做断言

    // ============ TC-F-001 ============
    @Test
    @DisplayName("TC-F-001 导入样例月度清单，66 行全部入库")
    void importStandardList_allRowsPersisted() throws Exception {
        String dataDate = "20260531";

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)))
           .andExpect(status().isOk())
           .andExpect(jsonPath(JP_CODE).value(OK_CODE))
           // THEN 成功信息中告知处理条数。规范未给文案格式，只断言数字出现，
           // 以免把测试绑死在具体措辞上。
           .andExpect(jsonPath(JP_MSG).value(org.hamcrest.Matchers.containsString("66")));

        assertThat(service.countByDataDate(dataDate)).isEqualTo(66);
    }

    // ============ TC-F-002 ============
    @Test
    @DisplayName("TC-F-002 数据日期 fill-down 到整批")
    void dataDate_fillsDownToWholeBatch() throws Exception {
        String dataDate = "20260531";
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));

        List<TjdBaseXiaodaixingProject> batch = service.listByDataDate(dataDate);
        assertThat(batch).hasSize(66);
        assertThat(batch).allSatisfy(r ->
                assertThat(r.getDataDate()).isEqualTo(dataDate));
        assertThat(batch).noneMatch(r -> r.getDataDate() == null || r.getDataDate().isEmpty());
    }

    // ============ TC-F-003 ============
    @Test
    @DisplayName("TC-F-003 同一次导入共享同一批次号与导入时间")
    void singleImport_sharesBatchNoAndImportTime() throws Exception {
        String dataDate = "20260531";
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)));

        List<TjdBaseXiaodaixingProject> batch = service.listByDataDate(dataDate);
        assertThat(batch).extracting(TjdBaseXiaodaixingProject::getBatchNo)
                         .containsOnly(batch.get(0).getBatchNo());
        assertThat(batch.get(0).getBatchNo()).isNotBlank();
        assertThat(batch).extracting(TjdBaseXiaodaixingProject::getImportTime)
                         .containsOnly(batch.get(0).getImportTime());
    }

    // ============ TC-F-004 ============
    @Test
    @DisplayName("TC-F-004 不同次导入产生不同批次号")
    void separateImports_produceDistinctBatchNos() throws Exception {
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList("20260531")));
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList("20260630")));

        String b1 = service.listByDataDate("20260531").get(0).getBatchNo();
        String b2 = service.listByDataDate("20260630").get(0).getBatchNo();
        assertThat(b1).isNotEqualTo(b2);
        // 可按批次号相互区分
        assertThat(service.listByBatchNo(b1)).allMatch(r -> "20260531".equals(r.getDataDate()));
        assertThat(service.listByBatchNo(b2)).allMatch(r -> "20260630".equals(r.getDataDate()));
    }

    // ============ TC-F-005 ============
    @Test
    @DisplayName("TC-F-005 重复列名与空表头列各自落位，互不覆盖")
    void duplicateAndBlankHeaders_mapByColumnIndex() throws Exception {
        List<Object> r = XdxFixtures.row("20260531", "甲公司", "PRJ-001");
        r.set(XdxFixtures.IDX_WRITE_OFF_1, "111.000000");
        r.set(XdxFixtures.IDX_WRITE_OFF_2, "222.000000");
        r.set(XdxFixtures.IDX_BLANK_HEADER, "抵押+保证");

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().standard36Headers().row(r).toMultipart()));

        TjdBaseXiaodaixingProject saved = service.listByDataDate("20260531").get(0);
        assertThat(saved.getWriteOffAmount()).isEqualByComparingTo("111.000000");
        assertThat(saved.getWriteOffAmount2()).isEqualByComparingTo("222.000000");
        assertThat(saved.getGuaranteeMethodDetail()).isEqualTo("抵押+保证");
    }

    /**
     * TC-F-005 第三条 THEN：「其余 33 列各按其列序落入对照表约定的对应字段」。
     *
     * 【未完成】对照表（design ③）未随规范交付，XdxTestContract.COLUMN_MAP 仅含已知 3 列。
     * 补全 COLUMN_MAP 后本用例自动覆盖全部 36 列。当前只会跑到 3 行，
     * 因此保留一条 assumption 断言把"未补全"这件事显式暴露出来，防止假绿。
     */
    @TestFactory
    @DisplayName("TC-F-005 全 36 列按列序落位（数据驱动，待对照表补全）")
    java.util.stream.Stream<org.junit.jupiter.api.DynamicTest> allColumnsMapByIndex() {
        Assumptions.assumeTrue(COLUMN_MAP.length == 36,
                "36 列对照表尚未补全（当前 " + COLUMN_MAP.length + " 行），见交付文档 §0.3");

        return java.util.Arrays.stream(COLUMN_MAP).map(spec ->
            org.junit.jupiter.api.DynamicTest.dynamicTest("列序 " + spec[0] + " → " + spec[1], () -> {
                int idx = Integer.parseInt(spec[0]);
                String marker = "MARK-" + idx;
                List<Object> row = XdxFixtures.row("20260531", "甲公司", "PRJ-" + idx);
                row.set(idx, "D".equals(spec[2]) ? String.valueOf(1000 + idx) : marker);

                mvc.perform(multipart(IMPORT_URL).file(
                        XlsxFixture.create().standard36Headers().row(row).toMultipart()));

                Object v = readField(service.listByProjectNo("PRJ-" + idx).get(0), spec[1]);
                assertThat(String.valueOf(v))
                        .as("列序 %s 应落入字段 %s", idx, spec[1])
                        .contains("D".equals(spec[2]) ? String.valueOf(1000 + idx) : marker);
            }));
    }

    // ============ TC-F-006 ============
    @Test
    @DisplayName("TC-F-006 脏值列原样保真、金额列按数值入库")
    void dirtyValuesPreserved_amountsTyped() throws Exception {
        String overdueDirty  = "2026-03-01是2026-04-01";   // 日期拼接脏值
        String serialNumber  = "45789";                     // Excel 日期序列号
        String ratio         = "0.6";

        List<Object> r = XdxFixtures.row("20260531", "甲公司", "PRJ-DIRTY");
        r.set(XdxFixtures.IDX_OVERDUE,     overdueDirty);
        r.set(XdxFixtures.IDX_OVERDUE_FROM, serialNumber);
        r.set(XdxFixtures.IDX_PROVISION,   ratio);
        r.set(XdxFixtures.IDX_CONTRACT_AMT, "1234567.891234");

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().standard36Headers().row(r).toMultipart()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));   // THEN 导入不中断

        List<TjdBaseXiaodaixingProject> saved = service.listByProjectNo("PRJ-DIRTY");
        assertThat(saved).hasSize(1);                       // THEN 该行未被丢弃
        TjdBaseXiaodaixingProject p = saved.get(0);
        assertThat(p.getIsOverdue()).isEqualTo(overdueDirty);        // 逐字一致
        assertThat(p.getOverdueStartDate()).isEqualTo(serialNumber); // 未转换成日期
        assertThat(p.getProvisionRatio()).isEqualTo(ratio);          // 未换算成百分数
        assertThat(p.getContractAmount()).isEqualByComparingTo("1234567.891234"); // 保留精度
    }

    // ============ TC-F-007 ============
    @Test
    @DisplayName("TC-F-007 导入记录的创建人为当前操作人")
    @WithMockOperator(userId = "op-8848")   // 见 §3.1 说明
    void createUser_isCurrentOperator() throws Exception {
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList("20260531")));

        assertThat(service.listByDataDate("20260531"))
                .isNotEmpty()
                .allSatisfy(r -> assertThat(r.getCreateUser()).isEqualTo("op-8848"));
    }

    // ============ TC-E-001 ============
    @Test
    @DisplayName("TC-E-001 重复导入同一份清单：按组合键覆盖，不产生重复行")
    void reimportSameList_overwritesInPlace() throws Exception {
        String dataDate = "20260531";
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)));
        List<TjdBaseXiaodaixingProject> first = service.listByDataDate(dataDate);
        String firstBatch = first.get(0).getBatchNo();
        Integer firstVersion = first.get(0).getVersion();

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));

        List<TjdBaseXiaodaixingProject> second = service.listByDataDate(dataDate);
        // THEN 条数不变，同一项目号不产生重复行
        assertThat(second).hasSize(66);
        assertThat(second).extracting(TjdBaseXiaodaixingProject::getProjectNo).doesNotHaveDuplicates();
        // THEN 批次号与导入时间被刷新
        assertThat(second).allSatisfy(r -> assertThat(r.getBatchNo()).isNotEqualTo(firstBatch));
        assertThat(second.get(0).getImportTime()).isAfter(first.get(0).getImportTime());
        // THEN 版本号递增一次
        // ⚠️ 见交付文档 §0.4(a)：若覆盖走自定义 XML SQL，乐观锁插件可能不生效，
        //    此断言红了请先复核规范预期而非直接改实现。
        assertThat(second.get(0).getVersion()).isEqualTo(firstVersion + 1);
    }

    // ============ TC-E-002 ============
    @Test
    @DisplayName("TC-E-002 文件内同「数据日期+项目号」两行：取靠后一行")
    void intraFileDuplicate_lastOneWins() throws Exception {
        List<Object> early = XdxFixtures.row("20260531", "旧客户名", "PRJ-DUP");
        early.set(XdxFixtures.IDX_ORG, "机构甲");
        List<Object> late  = XdxFixtures.row("", "新客户名", "PRJ-DUP");
        late.set(XdxFixtures.IDX_ORG, "机构乙");

        mvc.perform(multipart(IMPORT_URL).file(XlsxFixture.create().standard36Headers()
                .row(XdxFixtures.row("20260531", "客户A", "PRJ-A"))
                .row(early)
                .row(XdxFixtures.row("", "客户B", "PRJ-B"))
                .row(late)
                .row(XdxFixtures.row("", "客户C", "PRJ-C"))
                .toMultipart()));

        List<TjdBaseXiaodaixingProject> dup = service.listByProjectNo("PRJ-DUP");
        // THEN 只入库一条，内容取靠后那一行
        assertThat(dup).hasSize(1);
        assertThat(dup.get(0).getCustomerName()).isEqualTo("新客户名");
        assertThat(dup.get(0).getOrgName()).isEqualTo("机构乙");

        // THEN 其余项目号保持文件中的原有先后顺序
        assertThat(service.listByDataDate("20260531"))
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsSubsequence("PRJ-A", "PRJ-B", "PRJ-C");
    }

    // ============ TC-E-003 ============
    @Test
    @Tag("impl-derived")   // 歧-1
    @DisplayName("TC-E-003 数据日期整列为空 → 用上传当日兜底（歧-1，取自实现）")
    void blankDataDateColumn_fallsBackToUploadDate() throws Exception {
        String today = java.time.LocalDate.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));

        mvc.perform(multipart(IMPORT_URL).file(XlsxFixture.create().standard36Headers()
                .row(XdxFixtures.row("", "客户A", "PRJ-NA-1"))
                .row(XdxFixtures.row("", "客户B", "PRJ-NA-2"))
                .toMultipart()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));   // THEN 导入不失败

        assertThat(service.listByProjectNo("PRJ-NA-1"))
                .singleElement()
                .satisfies(r -> assertThat(r.getDataDate()).isEqualTo(today));
    }

    // ============ TC-E-004 ============
    @Test
    @Tag("impl-derived")   // 歧-2
    @DisplayName("TC-E-004 只有表头、无数据行 → 成功、0 条、不写库（歧-2，取自实现）")
    void headerOnlyFile_succeedsWithZeroRows() throws Exception {
        long before = service.countAll();

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.headerOnly()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE))
           .andExpect(jsonPath(JP_MSG).value(org.hamcrest.Matchers.containsString("0")));

        assertThat(service.countAll()).isEqualTo(before);
    }

    // ============ TC-E-005 ============
    @Test
    @DisplayName("TC-E-005 客户与项目号均为空的空壳行被跳过")
    void shellRows_skipped() throws Exception {
        List<Object> shell = XdxFixtures.blankRow();
        shell.set(XdxFixtures.IDX_ORG, "残留机构值");        // 其余列有零星残留
        shell.set(XdxFixtures.IDX_CONTRACT_AMT, "999.000000");

        mvc.perform(multipart(IMPORT_URL).file(XlsxFixture.create().standard36Headers()
                .row(XdxFixtures.row("20260531", "客户A", "PRJ-A"))
                .row(shell)
                .row(XdxFixtures.row("", "客户B", "PRJ-B"))
                .toMultipart()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE))                       // THEN 不报错
           .andExpect(jsonPath(JP_MSG).value(org.hamcrest.Matchers.containsString("2"))); // 条数不计跳过行

        List<TjdBaseXiaodaixingProject> all = service.listByDataDate("20260531");
        assertThat(all).hasSize(2);                                            // THEN 空壳行不入库
        assertThat(all).noneMatch(r -> "残留机构值".equals(r.getOrgName()));    // THEN 残留值一并丢弃
        assertThat(all).extracting(TjdBaseXiaodaixingProject::getProjectNo)
                       .containsExactlyInAnyOrder("PRJ-A", "PRJ-B");           // THEN 其余正常入库
    }

    // ============ TC-E-006 ============
    @ParameterizedTest(name = "TC-E-006 金额为[{0}] → 置空，整行仍入库")
    @Tag("impl-derived")   // 歧-3
    @ValueSource(strings = {"", "   ", "待确认", "N/A", "见附件"})
    @DisplayName("TC-E-006 金额列空白或不可解析（歧-3，取自实现；与 R2「零丢失」有张力）")
    void unparsableAmount_nulledButRowKept(String raw) throws Exception {
        List<Object> r = XdxFixtures.row("20260531", "甲公司", "PRJ-AMT");
        r.set(XdxFixtures.IDX_CONTRACT_AMT, raw);
        r.set(XdxFixtures.IDX_LOAN_AMT, raw);

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().standard36Headers().row(r).toMultipart()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));    // THEN 导入不中断

        TjdBaseXiaodaixingProject p = service.listByProjectNo("PRJ-AMT").get(0);  // THEN 整行仍入库
        assertThat(p.getContractAmount()).isNull();          // THEN 字段为空值
        assertThat(p.getLoanAmount()).isNull();
        // 注：规范明确指出"不保留原始文本"与 R2「零丢失」存在语义张力，见歧-3。
    }

    // ============ TC-E-007 ============
    @ParameterizedTest(name = "TC-E-007 金额书写形态[{0}] → 解析为 1234567.89")
    @Tag("impl-derived")   // 歧-4
    @ValueSource(strings = {"1,234,567.89", "1，234，567.89", "  1234567.89  ", "1234567.89 "})
    @DisplayName("TC-E-007 金额列带千分位或空白字符（歧-4，取自实现）")
    void amountWithSeparators_parsed(String raw) throws Exception {
        List<Object> r = XdxFixtures.row("20260531", "甲公司", "PRJ-SEP");
        r.set(XdxFixtures.IDX_CONTRACT_AMT, raw);

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().standard36Headers().row(r).toMultipart()));

        assertThat(service.listByProjectNo("PRJ-SEP").get(0).getContractAmount())
                .isNotNull()
                .isEqualByComparingTo("1234567.89");
    }

    // ============ TC-E-008 ============
    @Test
    @Tag("impl-derived")   // 歧-5
    @DisplayName("TC-E-008 文本列首尾空白被 trim、纯空白转空（歧-5；与 R2「不清洗」有张力）")
    void textColumns_trimmed() throws Exception {
        List<Object> r = XdxFixtures.row("20260531", "  甲公司  ", "PRJ-TRIM");
        r.set(XdxFixtures.IDX_ORG, "   ");            // 纯空白

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().standard36Headers().row(r).toMultipart()));

        TjdBaseXiaodaixingProject p = service.listByProjectNo("PRJ-TRIM").get(0);
        assertThat(p.getCustomerName()).isEqualTo("甲公司");
        assertThat(p.getOrgName()).isNull();
    }

    // ============ TC-E-009 ============
    @Test
    @Tag("impl-derived")   // 歧-6
    @DisplayName("TC-E-009 清单列数少于 36（末尾整列缺失）→ 容错，缺列为空（歧-6，取自实现）")
    void fewerThan36Columns_tolerated() throws Exception {
        List<String> shortHeaders = new java.util.ArrayList<>();
        for (int i = 0; i < 20; i++) shortHeaders.add("列" + i);
        shortHeaders.set(17, "核销金额");

        List<Object> r = new java.util.ArrayList<>(
                XdxFixtures.row("20260531", "甲公司", "PRJ-SHORT").subList(0, 20));

        mvc.perform(multipart(IMPORT_URL).file(
                XlsxFixture.create().headers(shortHeaders).row(r).toMultipart()))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));   // THEN 导入不失败

        TjdBaseXiaodaixingProject p = service.listByProjectNo("PRJ-SHORT").get(0);
        assertThat(p.getCustomerName()).isEqualTo("甲公司");     // 已有列正常落位
        assertThat(p.getWriteOffAmount2()).isNull();             // idx31 缺失 → 空
        assertThat(p.getGuaranteeMethodDetail()).isNull();       // idx35 缺失 → 空
    }

    // ============ TC-E-016 ============
    @Test
    @DisplayName("TC-E-016 导入成功后立即查询可见")
    void importThenSearch_immediatelyVisible() throws Exception {
        String dataDate = "20260731";
        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(dataDate)))
           .andExpect(jsonPath(JP_CODE).value(OK_CODE));

        // 无等待、无重试，紧接着查
        mvc.perform(post(SEARCH_URL).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"dataDate\":\"" + dataDate + "\",\""
                             + REQ_PAGE_NUM + "\":1,\"" + REQ_PAGE_SIZE + "\":100}"))
           .andExpect(jsonPath(JP_TOTAL).value(66));
    }

    // ============ TC-ERR-001 ============
    @Test
    @DisplayName("TC-ERR-001 上传空文件 → 失败「文件不能为空！」，无数据入库")
    void emptyFile_rejected() throws Exception {
        long before = service.countAll();

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.emptyFile()))
           .andExpect(status().isOk())
           .andExpect(jsonPath(JP_CODE).value(org.hamcrest.Matchers.not(OK_CODE)))
           .andExpect(jsonPath(JP_MSG).value(MSG_EMPTY_FILE));

        assertThat(service.countAll()).isEqualTo(before);
    }

    // ============ TC-ERR-003 ============
    @Test
    @Tag("impl-derived")   // 歧-10
    @DisplayName("TC-ERR-003 非 Excel 内容直达端点 → 失败「导入失败：…」（歧-10，与源要求的「格式不支持」不一致）")
    void nonWorkbookContent_rejected() throws Exception {
        long before = service.countAll();

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.notAWorkbook()))
           .andExpect(jsonPath(JP_CODE).value(org.hamcrest.Matchers.not(OK_CODE)))
           .andExpect(jsonPath(JP_MSG).value(
                   org.hamcrest.Matchers.containsString(MSG_IMPORT_FAIL_PREFIX)));

        assertThat(service.countAll()).isEqualTo(before);
    }
}
```

### 3.1 关于 TC-F-007 的 `@WithMockOperator`

规范 R7 说 `create_user` 取自 `AppContext.getUserId()`。`AppContext` 大概率是 ThreadLocal 静态门面，MockMvc 请求走的是同一线程，所以可以用一个自定义 JUnit 扩展在测试前后灌入/清理上下文：

```java
package com.qfc.base.xiaodaixing.support;

import org.junit.jupiter.api.extension.*;
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@ExtendWith(WithMockOperator.Ext.class)
public @interface WithMockOperator {

    String userId() default "test-operator";

    class Ext implements BeforeEachCallback, AfterEachCallback {
        @Override public void beforeEach(ExtensionContext ctx) {
            String uid = ctx.getRequiredTestMethod()
                            .getAnnotation(WithMockOperator.class).userId();
            // TODO 按 AppContext 的实际 API 校正。若 AppContext 从请求头解析而非可写，
            //      则改为在 MockMvc 请求上附加对应鉴权头（此时请上游补充 D2 相关事实，见澄-3）。
            AppContext.setUserId(uid);
        }
        @Override public void afterEach(ExtensionContext ctx) { AppContext.clear(); }
    }
}
```

**这是本次交付里我最没把握的一处。** 如果 `AppContext` 只读（从网关注入的请求头解析），这条测试就必须改成构造鉴权头 —— 而鉴权契约恰恰是规范的澄-3 明确说"无依据、未生成用例"的部分。**TC-F-007 事实上依赖 D2 维度的事实**，规范里这两处没有互相引用，建议上游补一句。

---

## 4. 集成测试 —— 查询链路

```java
package com.qfc.base.xiaodaixing.integration;

import com.qfc.base.xiaodaixing.support.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static com.qfc.base.xiaodaixing.support.XdxTestContract.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("小贷星 · 查询链路")
class XdxSearchApiTest {

    @Autowired MockMvc mvc;
    @Autowired TjdBaseXiaodaixingProjectService service;
    @Autowired TjdBaseXiaodaixingProjectMapper mapper;

    /** 直接经 mapper 播种，绕开导入链路 —— 查询用例不应依赖导入是否正确。 */
    private TjdBaseXiaodaixingProject seed(String dataDate, String customer,
                                           String projectNo, String org,
                                           String overdue, String rating) {
        TjdBaseXiaodaixingProject p = new TjdBaseXiaodaixingProject();
        p.setDataDate(dataDate);
        p.setCustomerName(customer);
        p.setProjectNo(projectNo);
        p.setOrgName(org);
        p.setIsOverdue(overdue);
        p.setProjectRating(rating);
        p.setBatchNo(java.util.UUID.randomUUID().toString());
        p.setImportTime(java.time.LocalDateTime.now());
        p.setIsDeleted(0);
        mapper.insert(p);
        return p;
    }

    private String body(String json) { return json; }

    private org.springframework.test.web.servlet.ResultActions search(String json) throws Exception {
        return mvc.perform(post(SEARCH_URL).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    // ============ TC-F-008 ============
    @Test
    @DisplayName("TC-F-008 分页查询返回列表与成功信封")
    void search_returnsEnvelopeWithRecordsAndTotal() throws Exception {
        seed("20260531", "甲公司", "PRJ-1", "机构A", "否", "A");
        seed("20260630", "乙公司", "PRJ-2", "机构B", "是", "B");

        search("{\"" + REQ_PAGE_NUM + "\":1,\"" + REQ_PAGE_SIZE + "\":10}")
           .andExpect(jsonPath(JP_CODE).value(OK_CODE))
           .andExpect(jsonPath(JP_RECORDS).isArray())
           .andExpect(jsonPath(JP_TOTAL).value(greaterThanOrEqualTo(2)))
           // THEN 每条记录携带 36 个业务字段及批次号、导入时间
           .andExpect(jsonPath(JP_RECORDS + "[0].batchNo").isNotEmpty())
           .andExpect(jsonPath(JP_RECORDS + "[0].importTime").isNotEmpty())
           .andExpect(jsonPath(JP_RECORDS + "[0].writeOffAmount").exists())
           .andExpect(jsonPath(JP_RECORDS + "[0].writeOffAmount2").exists())
           .andExpect(jsonPath(JP_RECORDS + "[0].guaranteeMethodDetail").exists());
        // 注：严格的"36 个业务字段齐全"断言待 COLUMN_MAP 补全后改为遍历校验，见 §0.3。
    }

    // ============ TC-F-009 ============
    @Test
    @DisplayName("TC-F-009 各常用筛选项单条件命中")
    void eachFilter_matchesOnlyQualifyingRecords() throws Exception {
        seed("20260531", "甲商贸有限公司", "PRJ-AAA", "北京分行", "否", "A");
        seed("20260531", "乙实业有限公司", "PRJ-BBB", "上海分行", "是", "B");
        seed("20260531", "丙科技有限公司", "PRJ-CCC", "广州分行", "否", "C");

        search("{\"customerName\":\"甲商贸有限公司\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].customerName", everyItem(containsString("甲商贸"))))
           .andExpect(jsonPath(JP_RECORDS + "[*].customerName", not(hasItem(containsString("乙实业")))));

        search("{\"projectNo\":\"PRJ-BBB\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", everyItem(containsString("PRJ-BBB"))));

        search("{\"orgName\":\"广州分行\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].orgName", everyItem(containsString("广州分行"))));

        search("{\"isOverdue\":\"是\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].isOverdue", everyItem(is("是"))));

        search("{\"projectRating\":\"C\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].projectRating", everyItem(is("C"))));
    }

    // ============ TC-F-010 ============
    @Test
    @DisplayName("TC-F-010 按数据日期（批次）筛选只返回该批次")
    void filterByDataDate_returnsOnlyThatBatch() throws Exception {
        seed("20260531", "甲", "P1", "机构A", "否", "A");
        seed("20260531", "乙", "P2", "机构A", "否", "A");
        seed("20260630", "丙", "P3", "机构A", "否", "A");

        search("{\"dataDate\":\"20260531\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].dataDate", everyItem(is("20260531"))))
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", not(hasItem("P3"))));
    }

    // ============ TC-E-011 ============
    @Test
    @DisplayName("TC-E-011 无筛选条件的分页查询返回全部未删除记录")
    void emptyCriteria_returnsAllUndeleted() throws Exception {
        seed("20260531", "甲", "P1", "机构A", "否", "A");
        seed("20260630", "乙", "P2", "机构B", "是", "B");

        search("{}")
           .andExpect(jsonPath(JP_CODE).value(OK_CODE))              // THEN 不报错
           .andExpect(jsonPath(JP_TOTAL).value(greaterThanOrEqualTo(2)))
           .andExpect(jsonPath(JP_RECORDS, not(empty())));           // THEN 不返回空集
    }

    // ============ TC-E-012 ============
    @Test
    @Tag("impl-derived")   // 歧-7
    @DisplayName("TC-E-012 多筛选条件取交集（歧-7，取自实现：AND 平铺）")
    void multipleCriteria_intersect() throws Exception {
        seed("20260531", "甲商贸", "P1", "北京分行", "否", "A");   // 只中客户名
        seed("20260531", "乙实业", "P2", "上海分行", "否", "A");   // 只中机构
        seed("20260531", "甲商贸", "P3", "上海分行", "否", "A");   // 两者皆中

        search("{\"customerName\":\"甲商贸\",\"orgName\":\"上海分行\"}")
           .andExpect(jsonPath(JP_TOTAL).value(1))
           .andExpect(jsonPath(JP_RECORDS + "[0].projectNo").value("P3"));
    }

    // ============ TC-E-013 ============
    @Test
    @Tag("impl-derived")   // 歧-8
    @DisplayName("TC-E-013 前三项 LIKE、后三项等值（歧-8，取自实现）")
    void matchingSemantics_likeVsExact() throws Exception {
        seed("20260531", "某某商贸有限公司", "PRJ-2026-0001", "北京市朝阳支行", "否", "AAA");

        // THEN 客户名 / 项目号 / 所属机构 以包含关系命中
        search("{\"customerName\":\"商贸\"}").andExpect(jsonPath(JP_TOTAL).value(greaterThanOrEqualTo(1)));
        search("{\"projectNo\":\"2026-0001\"}").andExpect(jsonPath(JP_TOTAL).value(greaterThanOrEqualTo(1)));
        search("{\"orgName\":\"朝阳\"}").andExpect(jsonPath(JP_TOTAL).value(greaterThanOrEqualTo(1)));

        // THEN 是否逾期 / 项目评级 / 数据日期 须完全相等
        search("{\"projectRating\":\"AA\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", not(hasItem("PRJ-2026-0001"))));
        search("{\"projectRating\":\"AAA\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", hasItem("PRJ-2026-0001")));
        search("{\"dataDate\":\"202605\"}")
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", not(hasItem("PRJ-2026-0001"))));
    }

    // ============ TC-E-014（第一条 THEN） ============
    @Test
    @DisplayName("TC-E-014 分页参数边界：首页与末页返回相应区间，总数恒定")
    void paging_firstAndLastPage() throws Exception {
        // N=25, P=10, M=3
        for (int i = 0; i < 25; i++) {
            seed("20260531", "客户" + i, String.format("PG-%02d", i), "机构A", "否", "A");
        }
        String q = "{\"dataDate\":\"20260531\",\"" + REQ_PAGE_NUM + "\":%d,\""
                   + REQ_PAGE_SIZE + "\":10}";

        search(String.format(q, 1))
           .andExpect(jsonPath(JP_TOTAL).value(25))
           .andExpect(jsonPath(JP_RECORDS, hasSize(10)));

        search(String.format(q, 3))
           .andExpect(jsonPath(JP_TOTAL).value(25))
           .andExpect(jsonPath(JP_RECORDS, hasSize(5)));   // 末页 25-20=5 条

        // 第 M+1 页的响应契约「预期待定」，见 XdxPendingSpecTest（澄-2）。
        // 此处只断言总数在三次请求中一致为 N —— 这一半是有据的。
        search(String.format(q, 4)).andExpect(jsonPath(JP_TOTAL).value(25));
    }

    // ============ TC-E-015 ============
    @Test
    @Tag("impl-derived")   // 歧-9
    @DisplayName("TC-E-015 默认按导入时间降序（歧-9，取自实现）")
    void defaultOrder_importTimeDesc() throws Exception {
        TjdBaseXiaodaixingProject older = seed("20260430", "老批次", "OLD-1", "机构A", "否", "A");
        older.setImportTime(java.time.LocalDateTime.now().minusDays(2));
        mapper.updateById(older);
        TjdBaseXiaodaixingProject newer = seed("20260531", "新批次", "NEW-1", "机构A", "否", "A");
        newer.setImportTime(java.time.LocalDateTime.now());
        mapper.updateById(newer);

        search("{\"" + REQ_PAGE_NUM + "\":1,\"" + REQ_PAGE_SIZE + "\":10}")
           .andExpect(jsonPath(JP_RECORDS + "[0].projectNo").value("NEW-1"));
    }

    // ============ TC-ST-001 ============
    @Test
    @DisplayName("TC-ST-001 记录被逻辑删除后从列表消失")
    void logicallyDeleted_disappearsFromList() throws Exception {
        TjdBaseXiaodaixingProject target = seed("20260531", "待删客户", "DEL-1", "机构A", "否", "A");
        seed("20260531", "存留客户", "KEEP-1", "机构A", "否", "A");
        seed("20260531", "存留客户2", "KEEP-2", "机构A", "否", "A");

        search("{\"dataDate\":\"20260531\"}")
           .andExpect(jsonPath(JP_TOTAL).value(3))
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", hasItem("DEL-1")));

        // WHEN 逻辑删除标记迁移为「已删除」
        target.setIsDeleted(1);
        mapper.updateById(target);

        search("{\"dataDate\":\"20260531\"}")
           .andExpect(jsonPath(JP_TOTAL).value(2))                                   // THEN 总数减少
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo", not(hasItem("DEL-1")))) // THEN 不再出现
           .andExpect(jsonPath(JP_RECORDS + "[*].projectNo",
                               hasItems("KEEP-1", "KEEP-2")));                       // THEN 其余仍可见
    }
}
```

---

## 5. 事务边界（TC-ERR-004）

单独成类，因为它需要打桩 mapper，不能与其他集成用例共用上下文。

```java
package com.qfc.base.xiaodaixing.integration;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static com.qfc.base.xiaodaixing.support.XdxTestContract.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * TC-ERR-004 · 导入中途写库失败时的事务边界（歧-11，取自实现）。
 *
 * ⚠️ 本类刻意不加 @Transactional —— 被测的正是导入方法自身的事务边界，
 *    测试若自带外层事务会掩盖回滚行为。因此需要在 @AfterEach 手工清理。
 *
 * ⚠️ 交付文档 §0.4(b)：规范 GIVEN 说"靠后的某一行在写库阶段触发失败"，
 *    但表上没有可依赖的约束来自然构造该失败，只能打桩。这引入了对实现结构的耦合。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("impl-derived")
@DisplayName("小贷星 · 导入事务边界")
class XdxImportTransactionTest {

    @Autowired MockMvc mvc;
    @Autowired TjdBaseXiaodaixingProjectService service;
    @SpyBean TjdBaseXiaodaixingProjectMapper mapper;

    private static final String DATA_DATE = "20260531";

    @AfterEach
    void cleanUp() {
        reset(mapper);
        service.physicalDeleteByDataDate(DATA_DATE);   // TODO 若无此方法，改用 JdbcTemplate 直删
    }

    @Test
    @DisplayName("TC-ERR-004 靠后一行写库失败 → 整批回滚，无部分残留")
    void writeFailureMidway_rollsBackWholeBatch() throws Exception {
        long before = service.countAll();

        // 让批量写入的第二次调用抛错，模拟"靠后某一行"失败
        doCallRealMethod()
                .doThrow(new org.springframework.dao.DataIntegrityViolationException("模拟写库失败"))
                .when(mapper).batchUpsert(any());   // TODO 方法名按 Mapper 实际签名校正

        mvc.perform(multipart(IMPORT_URL).file(XdxFixtures.standardList(DATA_DATE)))
           // THEN 调用方收到失败结果而非成功结果
           .andExpect(jsonPath(JP_CODE).value(org.hamcrest.Matchers.not(OK_CODE)));

        // THEN 整批回滚，不残留任何部分记录
        assertThat(service.countByDataDate(DATA_DATE)).isZero();
        assertThat(service.countAll()).isEqualTo(before);
    }
}
```

---

## 6. 预期待定 / 不由 JUnit 承担的用例

### 6.1 `@Disabled` 骨架（等澄清后填断言）

```java
package com.qfc.base.xiaodaixing.integration;

import org.junit.jupiter.api.*;

/**
 * 规范中标记 ⟨预期待定⟩ 的用例。场景有据、预期无据。
 *
 * 这里刻意保留为 @Disabled 骨架而不是"先按现状写死"：规范已明确
 * "不得据此写死断言"。写死会把一个未定的产品问题伪装成已定，
 * 且日后真正定下来时无人知道该改哪条。
 */
@DisplayName("小贷星 · 待澄清用例（不参与 CI 判定）")
class XdxPendingSpecTest {

    @Test
    @Disabled("澄-1 未决：超长文本应截断 / 拒绝该行 / 整批失败？"
            + " 导入链路无长度校验，实际行为取决于 DB 严格模式，不在本仓内。"
            + " 澄清后在此补断言。")
    @DisplayName("TC-E-010 单元格内容超出目标列长度上限")
    void oversizedCellValue() {
        // GIVEN 某文本列的值超过表结构定义的字符上限（如所属机构 > 128 字符）
        // WHEN  导入该清单
        // THEN  ⟨预期待定 · 见澄-1⟩
        //
        // 落地提示：澄清时请一并明确 DB 的 sql_mode。宽松模式下 MySQL 静默截断，
        // 严格模式下抛错整批回滚 —— 同一份代码在两种环境下行为相反，
        // 这本身可能是个需要治理的问题，而不只是一条测试的预期缺口。
    }

    @Test
    @Disabled("澄-2 未决：页码超出总页数应返回空集 / 回落末页 / 报错？"
            + " 分页由仓外 BaseTableServiceImpl / QmPage 实现，本仓查不到现状。"
            + " 澄清后在此补断言。注：TC-E-014 中'总数恒定为 N'的那一半已在"
            + " XdxSearchApiTest#paging_firstAndLastPage 中覆盖。")
    @DisplayName("TC-E-014（第二条 THEN） 请求第 M+1 页")
    void pageBeyondLastPage() {
        // GIVEN N=25 条、每页 P=10、共 M=3 页
        // WHEN  请求第 4 页
        // THEN  ⟨预期待定 · 见澄-2⟩
    }
}
```

### 6.2 不由 JUnit 承担的三条

| 用例 | 为什么 JUnit 承担不了 | 建议载体 |
|---|---|---|
| **TC-F-011** dev 菜单可见 + 进入查询页 | 断言对象是 biz_web 的菜单树渲染与路由，后端测试进程里不存在 | Playwright/Cypress E2E，或前端 Vitest + Vue Test Utils 断言路由表含 `/slp/xiaodaixing` 且 mock 菜单含「小贷星管理」挂在「业务办理」下 |
| **TC-ERR-002** 前端拦截非 Excel 扩展名 | 断言的是"文件不被送达后端"——后端测试天然看不到没发生的请求 | 前端组件测试：对 QmUploadFile 的 `beforeUpload` 断言返回 false 且弹出提示；E2E 层可加网络断言"无请求发往 importExcel" |
| **TC-F-013** 离线构建 + 无新增依赖 | 构建行为本身，且本次明令禁止跑构建 | CI 流水线：`mvn -o -pl base-service clean verify` + `maven-enforcer-plugin` 的 `banDuplicatePomDependencyVersions` / 依赖快照 diff。建议在 CI 里加一步 `mvn dependency:list` 与基线文件比对 |

我给 TC-F-013 的依赖基线比对写了一段可直接用的 CI 片段：

```bash
# .ci/check-no-new-deps.sh  —— TC-F-013 第二条 THEN
set -euo pipefail
mvn -o -q -pl base-service dependency:list -DoutputFile=/tmp/deps.txt -DincludeScope=runtime
sort /tmp/deps.txt -o /tmp/deps.txt
if ! diff -u .ci/deps-baseline.txt /tmp/deps.txt; then
  echo "检测到依赖清单变化（TC-F-013）。若为有意引入，请更新 .ci/deps-baseline.txt 并在 PR 中说明。"
  exit 1
fi
```

### 6.3 TC-F-012（prod 菜单接入文档）

这不是测试，是交付物验收。可以做成一条最轻量的存在性 + 要素断言，防止文档漏交：

```java
@Test
@DisplayName("TC-F-012 prod 菜单接入说明文档交付要素齐全")
void menuOnboardingDocIsComplete() throws Exception {
    java.nio.file.Path doc = java.nio.file.Paths.get("../docs/ops/xiaodaixing-prod-menu.md");
    // TODO 路径按实际交付位置校正 —— 规范未给出文档路径
    assertThat(doc).exists();

    String text = new String(java.nio.file.Files.readAllBytes(doc),
                             java.nio.charset.StandardCharsets.UTF_8);
    assertThat(text)
        .contains("业务办理")            // 父节点
        .contains("/slp/xiaodaixing")   // 路由
        .containsIgnoringCase("菜单编码");
}
```

**但我倾向于不把它放进 CI**：它只能验证"字符串出现过"，验证不了"运维照着能配出来"。真正的把关是人工评审。我把它写出来供选择，默认建议标 `@Tag("deliverable")` 单独跑，或干脆走 PR checklist。规范里也没给文档路径，这条上线前必须补。

---

## 7. 交付前必须解决的事项（按阻塞程度排序）

1. **补 36 列对照表**（§0.3-1）—— 阻塞 TC-F-005 第三条 THEN，且 `XdxFixtures` 里近十个列序常量目前是猜的，猜错会连带 TC-F-006 / TC-E-005 / TC-E-006 / TC-E-007 一起失真。**这是唯一一处会让测试"绿了但没测到"的风险。**
2. **校正 `XdxTestContract`**（§0.2）—— 阻塞全部 MockMvc 断言。
3. **裁定 `AppContext` 是否可写**（§3.1）—— 阻塞 TC-F-007，并牵出澄-3。
4. **复核 TC-E-001 的版本号递增预期**（§0.4a）—— 可能是规范的推断而非事实。
5. **确认 TC-ERR-004 的失败注入手段**（§0.4b）—— 当前打桩方案有实现耦合。
6. 澄-1 / 澄-2 落定后填 `XdxPendingSpecTest` 的两条骨架。
7. 与 QA 约定 `impl-derived` tag 的 CI 分组策略（§0.3-3）。共 13 个测试方法带此标签。

---

## 8. 一处我不打算照做的地方，及理由

规范的「门 B · 执行泄漏门」把用例契约写得完全与执行方式无关，这在设计层是对的。但落地时有两条用例，我认为**规范的抽象反而让实现方向变得不确定**，我按自己的判断选了一边，请复核：

- **TC-F-001 / TC-E-004 的「成功信息中告知处理条数」**。我断言的是"msg 里含该数字"（`containsString("66")`）。这个断言很弱——`msg` 里任何位置出现 "66" 都会绿。更强的做法是断言 `data` 里有结构化的 `successCount` 字段。**建议后端把条数放进 `data` 而非 `msg`**，这样测试和前端都不用解析文案。若已定为 msg 文案，请给出格式，我改成正则。
- **TC-E-002 的「其余项目号的记录保持文件中的原有先后顺序」**。数据库表本身无序，"保持顺序"只有在按某个列排序查询时才可观察。我用 `containsSubsequence` 配合默认排序（导入时间降序，同批次内时间相同）来断言——**这在同批次内其实是不可靠的**，因为同批 import_time 相同，排序退化为不确定。这条 THEN 严格说不可测，除非表里有自增 id 且约定按 id 观察。**建议上游要么删掉这条 THEN，要么改写为「按主键 id 升序观察时保持文件顺序」**，我再据此改断言。
