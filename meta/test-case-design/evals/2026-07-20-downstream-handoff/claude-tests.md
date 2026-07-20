# 小贷星管理（xiaodaixing-mgmt）测试代码落地

> 依据：`meta/test-case-design/evals/2026-06-26-xiaodaixing-mgmt/claude-skill-on-v014.md`
> 技术栈：Java 17 + Spring Boot + JUnit 5 + MyBatis-Plus + EasyExcel 4.0.3（零新增依赖，沿用规范 R5）
> 落地范围：规范中标 ✓ / ◐ 的后端接口用例（TC-F-001~006、TC-E-001~011、TC-ERR-001~002、TC-ST-001）。
> 覆盖矩阵中标 ⊘ 的条目（AC2/AC5/AC6、R1/R5、IC3）为前端 / 文档 / 构建约束，不产出测试代码。

---

## 0. 落地前提与显式假设

写测试必须把规范里没钉死的东西钉下来。以下假设**均已在代码中集中成常量 / 显式注释**，便于拿到真实工程后一处改全：

| # | 假设项 | 取值 | 说明 |
|---|---|---|---|
| A1 | 包名 | `com.qfc.zjq.xiaodaixing` | 由端点前缀 `/api-zjq/xiaodaixing` 推得 |
| A2 | 实体 / 服务 / Mapper | `TjdBaseXiaodaixingProject` / `TjdBaseXiaodaixingProjectService` / `...Mapper` | 由表名 `tjd_base_xiaodaixing_project` 推得 |
| A3 | 「数据日期」列下标 | `IDX_DATA_DATE = 35` | **规范未钉此下标**，仅钉了 16/18/19/20/24/30/34。落地时须核对 IC6 映射表 |
| A4 | 合同金额 / 放款金额列下标 | `IDX_CONTRACT_AMOUNT = 8` / `IDX_LOAN_AMOUNT = 9` | 同上，规范只说「金额清晰列 decimal(24,6)」，未给下标 |
| A5 | 落库校验通道 | `JdbcTemplate` 直查表 | 规范 THEN 全部写成「落库后的可观察结果」，用 SQL 直查最贴近，且不被 Service 实现细节污染 |
| A6 | 成功信封断言通道 | 走 Service 层 `IPage` | 见 §5 说明：HTTP 响应体字段名属待澄清 #1，但 `IPage.getRecords()/getTotal()` 是框架既有契约，可安全断言 |

**待澄清 #1~#5 的处理约定**：规范里写 `⟨预期待定⟩` 的 THEN，一律落成 `@Disabled` + `@Tag("pending-clarification")` 的**骨架方法**——场景、GIVEN、WHEN 全部写实，只有断言留 TODO 并回指待澄清编号。不臆造预期，也不留白。

---

## 1. 目录结构

```
src/test/java/com/qfc/zjq/xiaodaixing/
├── support/
│   ├── AbstractXiaodaixingIntegrationTest.java   # 测试基座：容器 / 清库 / 登录上下文 / 落库查询助手
│   ├── XiaodaixingExcelFixture.java              # 用 EasyExcel 在内存里造清单 xlsx
│   └── XiaodaixingColumns.java                   # IC6 列下标常量
├── XiaodaixingImportFunctionalTest.java          # TC-F-001 ~ TC-F-003, TC-F-006
├── XiaodaixingQueryFunctionalTest.java           # TC-F-004, TC-F-005
├── XiaodaixingImportBoundaryTest.java            # TC-E-001 ~ TC-E-008, TC-E-011
├── XiaodaixingQueryBoundaryTest.java             # TC-E-009, TC-E-010
├── XiaodaixingImportErrorTest.java               # TC-ERR-001, TC-ERR-002
└── XiaodaixingLogicalDeleteTest.java             # TC-ST-001
```

---

## 2. 测试基座

### 2.1 `XiaodaixingColumns.java`

```java
package com.qfc.zjq.xiaodaixing.support;

/**
 * 小贷星清单 Excel 的列下标常量（对应契约 IC6 的 36 列 index→列名→类型映射表）。
 *
 * <p>规范明确钉死的下标只有 16 / 18 / 19 / 20 / 24 / 30 / 34；
 * 其余带 {@code 假设} 标记的常量为落地时的推断值，接入真实工程后必须以 IC6 映射表为准复核。
 */
public final class XiaodaixingColumns {

    /** 清单总列数：36 业务列（idx 0..35）。 */
    public static final int COLUMN_COUNT = 36;

    // ---- IC6 明确钉死的下标 ----

    /** idx16 → write_off_amount（重复列名「核销金额」之一，varchar 保真）。 */
    public static final int IDX_WRITE_OFF_AMOUNT = 16;

    /** idx30 → write_off_amount_2（重复列名「核销金额」之二，加后缀区分）。 */
    public static final int IDX_WRITE_OFF_AMOUNT_2 = 30;

    /** idx18 → is_overdue（「是否逾期」脏值列，varchar 原样保真）。 */
    public static final int IDX_IS_OVERDUE = 18;

    /** idx19 → principal_overdue_start_date（Excel 日期序列号，varchar 保真）。 */
    public static final int IDX_PRINCIPAL_OVERDUE_START = 19;

    /** idx20 → interest_overdue_start_date（Excel 日期序列号，varchar 保真）。 */
    public static final int IDX_INTEREST_OVERDUE_START = 20;

    /** idx24 → reserve_ratio（「准备金计提比例」，varchar 保真、不折算百分数）。 */
    public static final int IDX_RESERVE_RATIO = 24;

    /** idx34 → guarantee_way_detail（空表头占位列）。 */
    public static final int IDX_GUARANTEE_WAY_DETAIL = 34;

    // ---- 假设：规范未钉下标，落地时须核对 IC6 ----

    /** 假设 A3：「数据日期」列——仅首行有值，fill-down 到整批（规则 R3）。 */
    public static final int IDX_DATA_DATE = 35;

    /** 假设：项目号列，用于 TC-E-011 校验同一项目号并存多行。 */
    public static final int IDX_PROJECT_NO = 0;

    /** 假设：客户名列，用于 TC-F-005 单条件筛选。 */
    public static final int IDX_CUSTOMER_NAME = 1;

    /** 假设：所属机构列。 */
    public static final int IDX_ORG_NAME = 2;

    /** 假设：项目评级列。 */
    public static final int IDX_PROJECT_RATING = 3;

    /** 假设 A4：合同金额列（decimal(24,6) 清晰金额列）。 */
    public static final int IDX_CONTRACT_AMOUNT = 8;

    /** 假设 A4：放款金额列（decimal(24,6) 清晰金额列）。 */
    public static final int IDX_LOAN_AMOUNT = 9;

    private XiaodaixingColumns() {
    }
}
```

### 2.2 `XiaodaixingExcelFixture.java`

```java
package com.qfc.zjq.xiaodaixing.support;

import com.alibaba.excel.EasyExcel;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.BiConsumer;

import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.COLUMN_COUNT;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_DATA_DATE;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_GUARANTEE_WAY_DETAIL;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_PROJECT_NO;

/**
 * 在内存里构造小贷星清单 xlsx。
 *
 * <p>刻意做成「全 String 写入 + 逐格覆盖」的形态，与契约 IC4「EasyExcel 全 String 读入」对齐：
 * 测试要能把任意脏值（日期拼接、非数字、Excel 日期序列号）原样塞进任意单元格，
 * 才谈得上验证规则 R2 的 1:1 保真。
 */
public final class XiaodaixingExcelFixture {

    /** 导入端点的 multipart 参数名。 */
    public static final String FILE_PART_NAME = "file";

    private static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final List<List<String>> rows = new ArrayList<>();
    private String fileName = "小贷星项目清单（20260531）.xlsx";

    public static XiaodaixingExcelFixture aSheet() {
        return new XiaodaixingExcelFixture();
    }

    /**
     * 造一份标准月度清单：{@code rowCount} 行数据，「数据日期」仅首行有值。
     *
     * @param rowCount 数据行数
     * @param dataDate 首行的数据日期，如 {@code 20260531}
     */
    public static XiaodaixingExcelFixture standardMonthlySheet(int rowCount, String dataDate) {
        XiaodaixingExcelFixture fixture = aSheet();
        for (int i = 0; i < rowCount; i++) {
            final int index = i;
            fixture.addRow((row, rowIndex) -> {
                row.set(IDX_PROJECT_NO, "XDX-2026-" + String.format("%04d", index + 1));
                row.set(XiaodaixingColumns.IDX_CUSTOMER_NAME, "客户" + (index + 1));
                row.set(XiaodaixingColumns.IDX_ORG_NAME, index % 2 == 0 ? "杭州分公司" : "宁波分公司");
                row.set(XiaodaixingColumns.IDX_PROJECT_RATING, index % 3 == 0 ? "A" : "B");
                row.set(XiaodaixingColumns.IDX_CONTRACT_AMOUNT, "1234567.123456");
                row.set(XiaodaixingColumns.IDX_LOAN_AMOUNT, "1000000.500000");
                // 规则 R3：数据日期仅首行有值，其余行留空，由导入侧 fill-down
                row.set(IDX_DATA_DATE, rowIndex == 0 ? dataDate : "");
            });
        }
        return fixture;
    }

    /** 追加一行，回调里拿到「已按 36 列填好空串」的可变行，按下标覆盖需要的格子。 */
    public XiaodaixingExcelFixture addRow(BiConsumer<List<String>, Integer> mutator) {
        List<String> row = new ArrayList<>(COLUMN_COUNT);
        for (int i = 0; i < COLUMN_COUNT; i++) {
            row.add("");
        }
        mutator.accept(row, rows.size());
        rows.add(row);
        return this;
    }

    /** 覆盖最后一行的某个单元格——给「某列塞脏值」这类边界用例用。 */
    public XiaodaixingExcelFixture withCell(int columnIndex, String rawValue) {
        if (rows.isEmpty()) {
            throw new IllegalStateException("先 addRow 再 withCell");
        }
        rows.get(rows.size() - 1).set(columnIndex, rawValue);
        return this;
    }

    /** 覆盖指定行的某个单元格。 */
    public XiaodaixingExcelFixture withCell(int rowIndex, int columnIndex, String rawValue) {
        rows.get(rowIndex).set(columnIndex, rawValue);
        return this;
    }

    public XiaodaixingExcelFixture named(String name) {
        this.fileName = name;
        return this;
    }

    public int rowCount() {
        return rows.size();
    }

    /**
     * 表头：idx34 刻意留空表头（契约 IC6：空表头列 → guarantee_way_detail 占位名）。
     */
    private List<List<String>> buildHead() {
        String[] titles = new String[COLUMN_COUNT];
        Arrays.fill(titles, "");
        titles[IDX_PROJECT_NO] = "项目号";
        titles[XiaodaixingColumns.IDX_CUSTOMER_NAME] = "客户名称";
        titles[XiaodaixingColumns.IDX_ORG_NAME] = "所属机构";
        titles[XiaodaixingColumns.IDX_PROJECT_RATING] = "项目评级";
        titles[XiaodaixingColumns.IDX_CONTRACT_AMOUNT] = "合同金额";
        titles[XiaodaixingColumns.IDX_LOAN_AMOUNT] = "放款金额";
        titles[XiaodaixingColumns.IDX_WRITE_OFF_AMOUNT] = "核销金额";
        titles[XiaodaixingColumns.IDX_IS_OVERDUE] = "是否逾期";
        titles[XiaodaixingColumns.IDX_PRINCIPAL_OVERDUE_START] = "本金逾期起始日";
        titles[XiaodaixingColumns.IDX_INTEREST_OVERDUE_START] = "利息逾期起始日";
        titles[XiaodaixingColumns.IDX_RESERVE_RATIO] = "准备金计提比例";
        // 规则 R2：重复列名「核销金额」原样出现两次，由导入侧加后缀区分
        titles[XiaodaixingColumns.IDX_WRITE_OFF_AMOUNT_2] = "核销金额";
        // 契约 IC6：idx34 表头为空
        titles[IDX_GUARANTEE_WAY_DETAIL] = "";
        titles[IDX_DATA_DATE] = "数据日期";

        List<List<String>> head = new ArrayList<>(COLUMN_COUNT);
        for (String title : titles) {
            head.add(List.of(title));
        }
        return head;
    }

    public byte[] toBytes() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        EasyExcel.write(out)
                .head(buildHead())
                .sheet("小贷星项目清单")
                .doWrite(rows);
        return out.toByteArray();
    }

    /** 产出可直接喂给 MockMvc multipart 的文件。 */
    public MockMultipartFile toMultipartFile() {
        return new MockMultipartFile(FILE_PART_NAME, fileName, XLSX_CONTENT_TYPE, toBytes());
    }
}
```

### 2.3 `AbstractXiaodaixingIntegrationTest.java`

```java
package com.qfc.zjq.xiaodaixing.support;

import com.qfc.common.context.AppContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

/**
 * 小贷星接口测试基座。
 *
 * <p>约定：
 * <ul>
 *   <li>断言一律落在「导入之后表里能观察到什么」，不断言内部方法调用——与规范门 B 一致；</li>
 *   <li>每个用例前清空台账，保证 GIVEN 里的「台账中已存在 …」是被本用例显式建立的；</li>
 *   <li>契约 IC4 要求 {@code create_user=AppContext.getUserId()}，故基座在每个用例前装一个登录上下文。</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractXiaodaixingIntegrationTest {

    protected static final String TABLE = "tjd_base_xiaodaixing_project";
    protected static final String IMPORT_URL =
            "/api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/importExcel";
    protected static final String PAGE_URL =
            "/api-zjq/xiaodaixing/tjdBaseXiaodaixingProject/page";

    /** 当次「已登录运营人员」的用户标识（契约 IC4）。 */
    protected static final String CURRENT_USER_ID = "op-10086";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @BeforeEach
    void resetLedgerAndLogin() {
        jdbcTemplate.execute("TRUNCATE TABLE " + TABLE);
        AppContext.setUserId(CURRENT_USER_ID);
    }

    @AfterEach
    void clearLogin() {
        AppContext.clear();
    }

    // ---------- 落库观察助手 ----------

    /** 台账全量行（含逻辑删除行），按主键升序，用于「入库了什么」的直观断言。 */
    protected List<Map<String, Object>> allLedgerRows() {
        return jdbcTemplate.queryForList("SELECT * FROM " + TABLE + " ORDER BY id");
    }

    /** 未逻辑删除的行数。 */
    protected int liveRowCount() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + TABLE + " WHERE is_deleted = 0", Integer.class);
        return count == null ? 0 : count;
    }

    protected int totalRowCount() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + TABLE, Integer.class);
        return count == null ? 0 : count;
    }

    /** 该表里出现过的全部 batch_no（去重）。 */
    protected List<String> distinctBatchNos() {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT batch_no FROM " + TABLE + " ORDER BY batch_no", String.class);
    }

    /** 该表里出现过的全部 data_date（去重）——用于验证 fill-down 后的批内一致性。 */
    protected List<String> distinctDataDates() {
        return jdbcTemplate.queryForList(
                "SELECT DISTINCT data_date FROM " + TABLE, String.class);
    }

    /** 直接插一行台账数据，供查询侧用例铺 GIVEN。 */
    protected void insertLedgerRow(String projectNo, String customerName, String orgName,
                                   String dataDate, String batchNo, int isDeleted) {
        jdbcTemplate.update(
                "INSERT INTO " + TABLE
                        + " (project_no, customer_name, org_name, data_date, batch_no, "
                        + "  import_time, create_user, create_time, is_deleted, version, tenant_id) "
                        + " VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?, 0, 'default')",
                projectNo, customerName, orgName, dataDate, batchNo, CURRENT_USER_ID, isDeleted);
    }
}
```

---

## 3. 功能测试（TC-F）

```java
package com.qfc.zjq.xiaodaixing;

import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import com.qfc.zjq.xiaodaixing.support.XiaodaixingExcelFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_CONTRACT_AMOUNT;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_DATA_DATE;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_LOAN_AMOUNT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * 导入主流程：TC-F-001 / TC-F-002 / TC-F-003 / TC-F-006。
 */
@DisplayName("小贷星导入 · 功能主流程")
class XiaodaixingImportFunctionalTest extends AbstractXiaodaixingIntegrationTest {

    private static final String DATA_DATE = "20260531";

    @Test
    @DisplayName("TC-F-001 标准月度清单导入落库：66 行零丢失，同批次同数据日期")
    void standardMonthlySheetLandsAllRowsInOneBatch() throws Exception {
        // GIVEN 一份符合清单结构的月度 Excel（66 行数据、首行「数据日期」为 20260531）
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(66, DATA_DATE);

        // WHEN 通过导入端点提交该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 66 行全部落入台账，无丢行
        assertThat(totalRowCount())
                .as("验收 AC3：66 行应全部入库，零丢失")
                .isEqualTo(66);

        List<Map<String, Object>> rows = allLedgerRows();

        // THEN 该批全部行 data_date 一致为 20260531
        assertThat(distinctDataDates())
                .as("规则 R3：整批数据日期应对齐为同一个业务批次日期")
                .containsExactly(DATA_DATE);

        // THEN 共享同一 batch_no
        assertThat(distinctBatchNos())
                .as("规则 R3：一次导入应只产生一个 batch_no")
                .hasSize(1);
        assertThat(distinctBatchNos().get(0)).isNotBlank();

        // THEN 均带 import_time
        assertThat(rows)
                .as("契约 IC4：每行都应带导入时间兜底字段")
                .allSatisfy(row -> assertThat(row.get("import_time")).isNotNull());
    }

    @Test
    @DisplayName("TC-F-002 导入行携带操作人身份：create_user 为当次操作人")
    void importedRowsCarryOperatorIdentity() throws Exception {
        // GIVEN 一次由已登录运营人员发起的导入（登录上下文由基座装载为 CURRENT_USER_ID）
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(3, DATA_DATE);

        // WHEN 该批数据落库
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 落库行的创建人字段为当次操作人的用户标识（非空、非框架缺省的空值）
        Set<Object> createUsers = allLedgerRows().stream()
                .map(row -> row.get("create_user"))
                .collect(Collectors.toSet());

        assertThat(createUsers)
                .as("契约 IC4：create_user 应取 AppContext.getUserId()，而非 null / 空串 / 框架缺省值")
                .containsExactly(CURRENT_USER_ID);
    }

    @Test
    @DisplayName("TC-F-003 数据日期 fill-down：仅首行有值时整批对齐，无批内不一致")
    void dataDateFillsDownAcrossTheWholeBatch() throws Exception {
        // GIVEN 一份 Excel，其「数据日期」仅首行有值、其余数据行该列为空
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(10, DATA_DATE);
        for (int rowIndex = 1; rowIndex < sheet.rowCount(); rowIndex++) {
            sheet.withCell(rowIndex, IDX_DATA_DATE, "");
        }

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该批所有行的 data_date 统一取首个非空值
        assertThat(totalRowCount()).isEqualTo(10);
        assertThat(distinctDataDates())
                .as("规则 R3 / 契约 IC4：fill-down 后整批只应出现一个 data_date")
                .containsExactly(DATA_DATE);

        // THEN 不出现「首行有值、后续行为空」的批内不一致
        assertThat(allLedgerRows())
                .as("批内不得残留空数据日期的行")
                .noneSatisfy(row -> assertThat(row.get("data_date")).isIn(null, ""));
    }

    @Test
    @DisplayName("TC-F-006 金额清晰列以数值形态落库，decimal(24,6) 精度不被截断")
    void clearAmountColumnsKeepDecimalPrecision() throws Exception {
        // GIVEN 一份 Excel，其合同金额 / 放款金额等清晰金额列为合法数值
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_CONTRACT_AMOUNT, "1234567.123456")
                .withCell(IDX_LOAN_AMOUNT, "0.000001");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 对应 decimal(24,6) 列以数值形态落库，精度不被截断为整数或丢失小数位
        Map<String, Object> row = allLedgerRows().get(0);

        assertThat(row.get("contract_amount"))
                .as("契约 IC6：金额列应是数值类型，不应退化为字符串")
                .isInstanceOf(BigDecimal.class);
        assertThat((BigDecimal) row.get("contract_amount"))
                .as("小数位不得被截断")
                .isEqualByComparingTo(new BigDecimal("1234567.123456"));
        assertThat((BigDecimal) row.get("loan_amount"))
                .as("decimal(24,6) 的最小刻度应能保留")
                .isEqualByComparingTo(new BigDecimal("0.000001"));
    }
}
```

```java
package com.qfc.zjq.xiaodaixing;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.qfc.zjq.xiaodaixing.entity.TjdBaseXiaodaixingProject;
import com.qfc.zjq.xiaodaixing.service.TjdBaseXiaodaixingProjectService;
import com.qfc.zjq.xiaodaixing.vo.TjdBaseXiaodaixingProjectSearchVO;
import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 查询主流程：TC-F-004 / TC-F-005。
 *
 * <p>断言通道说明：HTTP 成功信封的字段名属**待澄清 #1**，不可臆造，
 * 因此可断言的部分走 Service 层的 {@link IPage}（MyBatis-Plus 既有契约，非本项目自定义），
 * 信封结构本身另留一条 {@code @Disabled} 骨架用例，待澄清后补断言。
 */
@DisplayName("小贷星查询 · 功能主流程")
class XiaodaixingQueryFunctionalTest extends AbstractXiaodaixingIntegrationTest {

    @Autowired
    private TjdBaseXiaodaixingProjectService projectService;

    @BeforeEach
    void seedLedger() {
        // GIVEN 台账中已存在若干未逻辑删除的项目行
        insertLedgerRow("XDX-0001", "杭州甲科技", "杭州分公司", "20260531", "batch-A", 0);
        insertLedgerRow("XDX-0002", "宁波乙贸易", "宁波分公司", "20260531", "batch-A", 0);
        insertLedgerRow("XDX-0003", "杭州丙实业", "杭州分公司", "20260430", "batch-B", 0);
    }

    @Test
    @DisplayName("TC-F-004 默认分页查询台账：仅返回 is_deleted=0 的行")
    void defaultPageQueryReturnsOnlyLiveRows() {
        // GIVEN 台账中另有一条已逻辑删除的行
        insertLedgerRow("XDX-9999", "已删除客户", "杭州分公司", "20260531", "batch-A", 1);

        // WHEN 不带筛选条件发起分页查询
        IPage<TjdBaseXiaodaixingProject> page =
                projectService.page(new TjdBaseXiaodaixingProjectSearchVO());

        // THEN 返回分页后的台账列表，仅含 is_deleted=0 的行
        assertThat(page.getRecords())
                .as("契约 IC5：查询须手写 is_deleted=0 条件（无 @TableLogic 自动过滤）")
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsExactlyInAnyOrder("XDX-0001", "XDX-0002", "XDX-0003")
                .doesNotContain("XDX-9999");

        assertThat(page.getTotal())
                .as("总数亦不应把逻辑删除行算进去")
                .isEqualTo(3);
    }

    @Test
    @Disabled("预期待定 · 待澄清 #1：源未定义成功信封结构（分页字段名、总数/页码/页大小字段、缺省页大小）")
    @Tag("pending-clarification")
    @DisplayName("TC-F-004（信封部分）默认分页查询的 HTTP 成功信封结构")
    void defaultPageQueryResponseEnvelope() throws Exception {
        // GIVEN 台账中已存在若干未逻辑删除的项目行（见 seedLedger）
        // WHEN 不带筛选条件发起分页查询
        // mockMvc.perform(post(PAGE_URL).contentType(APPLICATION_JSON).content("{}"))

        // THEN ⟨预期待定⟩ 待澄清 #1 补齐后，此处断言：
        //   - HTTP 状态码
        //   - 成功信封外层字段（如 code / success / data）
        //   - 分页字段命名（总数 / 当前页码 / 页大小 / 记录列表）
        //   - 未显式传参时的缺省页大小
        throw new UnsupportedOperationException("待澄清 #1 补进事实集后再落断言");
    }

    @Test
    @DisplayName("TC-F-005 单一常用条件筛选命中：结果仅含匹配行")
    void singleFilterConditionMatchesOnlyExpectedRows() {
        // GIVEN 台账中存在可被「所属机构」命中的行（见 seedLedger）
        TjdBaseXiaodaixingProjectSearchVO query = new TjdBaseXiaodaixingProjectSearchVO();
        query.setOrgName("宁波分公司");

        // WHEN 指定该单一筛选条件发起查询
        IPage<TjdBaseXiaodaixingProject> page = projectService.page(query);

        // THEN 结果仅含匹配该条件的行
        List<TjdBaseXiaodaixingProject> records = page.getRecords();
        assertThat(records)
                .as("规则 R4：单条件筛选不得放行不匹配的行")
                .isNotEmpty()
                .allSatisfy(row -> assertThat(row.getOrgName()).isEqualTo("宁波分公司"));
        assertThat(records)
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsExactly("XDX-0002");
    }

    @Test
    @DisplayName("TC-F-005 变体：按数据日期（批次）筛选")
    void filterByDataDateBatch() {
        // GIVEN 台账中同时存在两个数据日期批次
        TjdBaseXiaodaixingProjectSearchVO query = new TjdBaseXiaodaixingProjectSearchVO();
        query.setDataDate("20260430");

        // WHEN 指定该单一筛选条件发起查询
        IPage<TjdBaseXiaodaixingProject> page = projectService.page(query);

        // THEN 结果仅含该批次的行
        assertThat(page.getRecords())
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsExactly("XDX-0003");
    }
}
```

---

## 4. 边界测试（TC-E）

```java
package com.qfc.zjq.xiaodaixing;

import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import com.qfc.zjq.xiaodaixing.support.XiaodaixingExcelFixture;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_CONTRACT_AMOUNT;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_CUSTOMER_NAME;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_DATA_DATE;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_GUARANTEE_WAY_DETAIL;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_INTEREST_OVERDUE_START;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_IS_OVERDUE;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_PRINCIPAL_OVERDUE_START;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_PROJECT_NO;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_RESERVE_RATIO;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_WRITE_OFF_AMOUNT;
import static com.qfc.zjq.xiaodaixing.support.XiaodaixingColumns.IDX_WRITE_OFF_AMOUNT_2;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * 导入侧边界：TC-E-001 ~ TC-E-008、TC-E-011。
 *
 * <p>本类的核心命题是规则 R2「1:1 保真、不清洗、零丢失」——
 * 每条用例都只问一件事：这个脏值进了库以后，还是不是它自己。
 */
@DisplayName("小贷星导入 · 边界与保真")
class XiaodaixingImportBoundaryTest extends AbstractXiaodaixingIntegrationTest {

    private static final String DATA_DATE = "20260531";

    @Test
    @Disabled("预期待定 · 待澄清 #4：源未定义零行导入语义（建空批次并成功 / 判无有效数据而拒绝）")
    @Tag("pending-clarification")
    @DisplayName("TC-E-001 仅表头、零数据行的 Excel")
    void headerOnlySheetImport() throws Exception {
        // GIVEN 一份格式合法但不含任何数据行的 Excel
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.aSheet()
                .named("小贷星项目清单（空）.xlsx");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN ⟨预期待定⟩ 待澄清 #4 定下语义后，二选一落断言：
        //   分支 a「建空批次并成功」：响应成功，且 totalRowCount() == 0，可能产生一条批次元记录；
        //   分支 b「判无有效数据而拒绝」：返回业务错误，且 totalRowCount() == 0。
        // 两分支共同点（可先行确认的不变量）：不得凭空造出数据行。
        assertThat(totalRowCount()).isZero();
        throw new UnsupportedOperationException("待澄清 #4 补进事实集后再落成败断言");
    }

    @Test
    @DisplayName("TC-E-002 数据日期首行即为空：以上传时间兜底，导入不失败、行不丢")
    void missingDataDateFallsBackToUploadTime() throws Exception {
        // GIVEN 一份 Excel，其「数据日期」列首行即为空（整列无可 fill-down 的值）
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(5, DATA_DATE);
        for (int rowIndex = 0; rowIndex < sheet.rowCount(); rowIndex++) {
            sheet.withCell(rowIndex, IDX_DATA_DATE, "");
        }
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 导入不因业务日期缺失而失败，行不丢失
        assertThat(totalRowCount())
                .as("异常 EX4：业务日期缺失不得导致整批失败或丢行")
                .isEqualTo(5);

        // THEN 该批 data_date 以上传时间兜底填充
        List<String> dataDates = distinctDataDates();
        assertThat(dataDates)
                .as("整批仍应共享同一个兜底数据日期")
                .hasSize(1);
        assertThat(dataDates.get(0))
                .as("兜底值应取自上传时间")
                .isNotBlank()
                .startsWith(today);
    }

    @Test
    @DisplayName("TC-E-003 金额列含非数字脏值：转空值落库，不报错、同行其余列不丢")
    void dirtyValueInDecimalColumnBecomesNullWithoutLosingTheRow() throws Exception {
        // GIVEN 一份 Excel，其某个 decimal 金额列的值为非数字脏字符
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_CONTRACT_AMOUNT, "见附件/待确认")
                .withCell(IDX_CUSTOMER_NAME, "杭州甲科技");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该单元格转为空值落库
        Map<String, Object> row = allLedgerRows().get(0);
        assertThat(row.get("contract_amount"))
                .as("契约 IC4：类型转换须 null 安全，脏值转 null 而非抛异常")
                .isNull();

        // THEN 导入不报错、该行其余列不丢失
        assertThat(totalRowCount()).isEqualTo(1);
        assertThat(row.get("customer_name")).isEqualTo("杭州甲科技");
        assertThat(row.get("data_date")).isEqualTo(DATA_DATE);
        assertThat(row.get("batch_no")).isNotNull();
    }

    @Test
    @DisplayName("TC-E-004 重复列名「核销金额」双列保真：互不覆盖")
    void duplicateWriteOffColumnsLandInSeparateColumns() throws Exception {
        // GIVEN 一份 Excel，含两个同名「核销金额」列（含非数字值）
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_WRITE_OFF_AMOUNT, "120000.00")
                .withCell(IDX_WRITE_OFF_AMOUNT_2, "核销中-暂无金额");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 两列分别原样落入两个后缀区分的列，互不覆盖、值保真
        Map<String, Object> row = allLedgerRows().get(0);
        assertThat(row.get("write_off_amount"))
                .as("契约 IC6：idx16 → write_off_amount")
                .isEqualTo("120000.00");
        assertThat(row.get("write_off_amount_2"))
                .as("契约 IC6：idx30 → write_off_amount_2，后缀区分不得被前一列覆盖")
                .isEqualTo("核销中-暂无金额");
    }

    @Test
    @DisplayName("TC-E-005 空表头占位列保真：不因表头缺失而丢列丢值")
    void blankHeaderColumnStillPersistsItsValue() throws Exception {
        // GIVEN 一份 Excel，其第 35 列（idx34）表头为空、单元格有值
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_GUARANTEE_WAY_DETAIL, "信用贷款");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该列值原样落入占位列
        Map<String, Object> row = allLedgerRows().get(0);
        assertThat(row.get("guarantee_way_detail"))
                .as("契约 IC6：idx34 空表头 → guarantee_way_detail 占位名，按 index 读取而非按表头名")
                .isEqualTo("信用贷款");
    }

    @Test
    @DisplayName("TC-E-006 是否逾期脏值（日期拼接）原样入库，不被解析")
    void overdueFlagKeepsItsDirtyRawValue() throws Exception {
        // GIVEN 一份 Excel，其「是否逾期」列为日期拼接类脏值
        String dirty = "是2026-03-15";
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_IS_OVERDUE, dirty);

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该值原样落入 varchar 列，不被解析/转换、不报错
        Map<String, Object> row = allLedgerRows().get(0);
        assertThat(row.get("is_overdue"))
                .as("规则 R2 / 异常 EX2：脏值不清洗、不归一成布尔，原样保真")
                .isEqualTo(dirty);
        assertThat(totalRowCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("TC-E-007 逾期起始日为 Excel 日期序列号：原样入库，不还原为日期")
    void overdueStartDateKeepsExcelSerialNumberAsText() throws Exception {
        // GIVEN 一份 Excel，其逾期起始日列为 Excel 日期序列号
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_PRINCIPAL_OVERDUE_START, "45352")
                .withCell(IDX_INTEREST_OVERDUE_START, "45383");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该值原样落入 varchar 列，不被还原为日期、不报错
        Map<String, Object> row = allLedgerRows().get(0);
        assertThat(row.get("principal_overdue_start_date"))
                .as("契约 IC6：idx19 varchar 保真，不得被格式化成 2024-03-01 之类")
                .isEqualTo("45352");
        assertThat(row.get("interest_overdue_start_date")).isEqualTo("45383");
    }

    @Test
    @DisplayName("TC-E-008 准备金计提比例保真：不折算百分数、不转数值")
    void reserveRatioKeepsRawRatioText() throws Exception {
        // GIVEN 一份 Excel，其「准备金计提比例」列为比例值（如 0.6）
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(1, DATA_DATE)
                .withCell(IDX_RESERVE_RATIO, "0.6");

        // WHEN 导入该文件
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));

        // THEN 该值原样落入 varchar 列，不被折算为百分数或数值
        Object reserveRatio = allLedgerRows().get(0).get("reserve_ratio");
        assertThat(reserveRatio)
                .as("契约 IC6：idx24 varchar 保真——既不能变成 60%，也不能变成 0.600000")
                .isInstanceOf(String.class)
                .isEqualTo("0.6");
    }

    @Test
    @DisplayName("TC-E-011 重复导入同一份清单：追加不去重，两批以 batch_no 区分")
    void reimportingTheSameSheetAppendsASecondBatch() throws Exception {
        // GIVEN 某份月度清单已被完整导入过一次
        XiaodaixingExcelFixture sheet = XiaodaixingExcelFixture.standardMonthlySheet(66, DATA_DATE);
        byte[] payload = sheet.toBytes();
        mockMvc.perform(multipart(IMPORT_URL).file(sheet.toMultipartFile()));
        assertThat(totalRowCount()).isEqualTo(66);
        String firstBatchNo = distinctBatchNos().get(0);

        // WHEN 再次导入同一份清单
        mockMvc.perform(multipart(IMPORT_URL).file(
                XiaodaixingExcelFixture.standardMonthlySheet(66, DATA_DATE).toMultipartFile()));

        // THEN 第二次以追加方式再落一整批相同业务数据，不去重、不覆盖
        assertThat(totalRowCount())
                .as("规则 R3 / 异常 EX3：只追加不去重，是已定义的预期代价而非缺陷")
                .isEqualTo(132);

        // THEN 两批数据以不同 batch_no 区分
        List<String> batchNos = distinctBatchNos();
        assertThat(batchNos)
                .as("每次导入一个新 UUID 批次号")
                .hasSize(2)
                .contains(firstBatchNo)
                .doesNotHaveDuplicates();

        // THEN 同一项目号在库中并存多行
        Integer duplicateProjectRows = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + TABLE + " WHERE project_no = ?",
                Integer.class, "XDX-2026-0001");
        assertThat(duplicateProjectRows)
                .as("同一项目号应并存两行，分属两个批次")
                .isEqualTo(2);

        List<String> batchNosOfSameProject = jdbcTemplate.queryForList(
                "SELECT batch_no FROM " + TABLE + " WHERE project_no = ?",
                String.class, "XDX-2026-0001");
        assertThat(batchNosOfSameProject)
                .as("并存的两行须可凭 batch_no 区分是哪一次导入的")
                .doesNotHaveDuplicates();

        assertThat(payload).isNotEmpty(); // 同一份字节流被提交两次
    }
}
```

```java
package com.qfc.zjq.xiaodaixing;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.qfc.zjq.xiaodaixing.entity.TjdBaseXiaodaixingProject;
import com.qfc.zjq.xiaodaixing.service.TjdBaseXiaodaixingProjectService;
import com.qfc.zjq.xiaodaixing.vo.TjdBaseXiaodaixingProjectSearchVO;
import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 查询侧边界：TC-E-009、TC-E-010。
 */
@DisplayName("小贷星查询 · 边界")
class XiaodaixingQueryBoundaryTest extends AbstractXiaodaixingIntegrationTest {

    @Autowired
    private TjdBaseXiaodaixingProjectService projectService;

    @ParameterizedTest(name = "TC-E-009 页码={0} 页大小={1}")
    @CsvSource({
            "0,    10",     // 页码下界
            "9999, 10",     // 超末页
            "1,    0",      // 页大小为 0
            "1,    -1",     // 页大小为负
            "1,    100000"  // 页大小极大值
    })
    @Disabled("预期待定 · 待澄清 #5：源未定义分页参数取值域、缺省值与越界行为（钳制 / 报错 / 返回空页）")
    @Tag("pending-clarification")
    @DisplayName("TC-E-009 分页参数边界取值")
    void pagingParameterBoundaries(int pageNo, int pageSize) {
        // GIVEN 台账中存在多页数据
        for (int i = 1; i <= 25; i++) {
            insertLedgerRow("XDX-" + String.format("%04d", i), "客户" + i,
                    "杭州分公司", "20260531", "batch-A", 0);
        }

        TjdBaseXiaodaixingProjectSearchVO query = new TjdBaseXiaodaixingProjectSearchVO();
        query.setPageNo(pageNo);
        query.setPageSize(pageSize);

        // WHEN 以边界页码 / 页大小发起查询
        // IPage<TjdBaseXiaodaixingProject> page = projectService.page(query);

        // THEN ⟨预期待定⟩ 待澄清 #5 定下取值域后，按所选策略落断言：
        //   钳制策略  → 页码/页大小被钳到合法区间，返回对应页数据；
        //   报错策略  → 返回参数校验错误，不返回数据；
        //   空页策略  → 返回记录为空但 total 仍为 25 的分页对象。
        throw new UnsupportedOperationException("待澄清 #5 补进事实集后再落断言");
    }

    @Test
    @DisplayName("TC-E-010 筛选无命中：返回空分页结果，不报错")
    void filterWithNoMatchReturnsEmptyPage() {
        // GIVEN 台账中不存在满足某筛选条件的行
        insertLedgerRow("XDX-0001", "杭州甲科技", "杭州分公司", "20260531", "batch-A", 0);

        TjdBaseXiaodaixingProjectSearchVO query = new TjdBaseXiaodaixingProjectSearchVO();
        query.setCustomerName("这个客户名在台账里不存在");

        // WHEN 指定该筛选条件发起查询
        IPage<TjdBaseXiaodaixingProject> page = projectService.page(query);

        // THEN 返回空的分页结果，不报错
        assertThat(page).as("空结果是正常返回，不是异常").isNotNull();
        assertThat(page.getRecords()).isEmpty();
        assertThat(page.getTotal()).isZero();
    }
}
```

---

## 5. 错误处理（TC-ERR）

> 两条用例的「场景 + 不入库」这一半是事实集已定义的（异常 EX1），可以现在就断言；
> 「错误响应结构」那一半属待澄清 #1，拆成独立的 `@Disabled` 骨架。
> 这样做的好处是：待澄清没堵死已确定的那半边验证。

```java
package com.qfc.zjq.xiaodaixing;

import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import com.qfc.zjq.xiaodaixing.support.XiaodaixingExcelFixture;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * 导入错误处理：TC-ERR-001、TC-ERR-002（异常 EX1）。
 */
@DisplayName("小贷星导入 · 错误处理")
class XiaodaixingImportErrorTest extends AbstractXiaodaixingIntegrationTest {

    @Test
    @DisplayName("TC-ERR-001 上传空文件：拒绝入库，提示「文件不能为空」")
    void emptyFileIsRejectedAndNothingIsPersisted() throws Exception {
        // GIVEN 一次导入操作，其文件为空
        MockMultipartFile emptyFile = new MockMultipartFile(
                XiaodaixingExcelFixture.FILE_PART_NAME,
                "空文件.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]);

        // WHEN 提交该文件
        MvcResult result = mockMvc.perform(multipart(IMPORT_URL).file(emptyFile)).andReturn();

        // THEN 拒绝入库
        assertThat(totalRowCount())
                .as("异常 EX1：空文件不得产生任何落库行")
                .isZero();

        // THEN 返回「文件不能为空」性质的错误提示
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body)
                .as("提示文案须让操作人看懂是「文件为空」，而非裸栈信息")
                .contains("文件不能为空");
    }

    @Test
    @DisplayName("TC-ERR-002 上传非 Excel 格式文件：拒绝入库，提示「格式不支持」")
    void nonExcelFileIsRejectedAndNothingIsPersisted() throws Exception {
        // GIVEN 一次导入操作，其文件非 .xls/.xlsx
        MockMultipartFile txtFile = new MockMultipartFile(
                XiaodaixingExcelFixture.FILE_PART_NAME,
                "小贷星项目清单.txt",
                "text/plain",
                "项目号,客户名称\nXDX-0001,杭州甲科技\n".getBytes(StandardCharsets.UTF_8));

        // WHEN 提交该文件
        MvcResult result = mockMvc.perform(multipart(IMPORT_URL).file(txtFile)).andReturn();

        // THEN 拒绝入库
        assertThat(totalRowCount())
                .as("异常 EX1：非 Excel 文件不得产生任何落库行")
                .isZero();

        // THEN 返回「格式不支持」性质的错误提示
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body)
                .as("须明确指向文件格式问题")
                .contains("格式不支持");
    }

    @Test
    @DisplayName("TC-ERR-002 变体：.csv 同样被判为格式不支持")
    void csvFileIsAlsoRejected() throws Exception {
        MockMultipartFile csvFile = new MockMultipartFile(
                XiaodaixingExcelFixture.FILE_PART_NAME,
                "小贷星项目清单.csv",
                "text/csv",
                "项目号,客户名称\n".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart(IMPORT_URL).file(csvFile));

        assertThat(totalRowCount()).isZero();
    }

    @Test
    @Disabled("预期待定 · 待澄清 #1：源未定义错误响应结构（HTTP 状态码 / 业务错误码 / 错误体字段）")
    @Tag("pending-clarification")
    @DisplayName("TC-ERR-001/002（结构部分）导入错误的响应结构契约")
    void importErrorResponseContract() {
        // GIVEN 空文件 / 非 Excel 文件（同上两条用例的 GIVEN）
        // WHEN 提交该文件
        // THEN ⟨预期待定⟩ 待澄清 #1 补齐后，此处断言：
        //   - HTTP 状态码（200 带业务错误码，还是 4xx）
        //   - 业务错误码取值
        //   - 错误体字段结构（code / message / data 的字段名与嵌套）
        throw new UnsupportedOperationException("待澄清 #1 补进事实集后再落断言");
    }
}
```

---

## 6. 状态迁移（TC-ST）

```java
package com.qfc.zjq.xiaodaixing;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.qfc.zjq.xiaodaixing.entity.TjdBaseXiaodaixingProject;
import com.qfc.zjq.xiaodaixing.service.TjdBaseXiaodaixingProjectService;
import com.qfc.zjq.xiaodaixing.vo.TjdBaseXiaodaixingProjectSearchVO;
import com.qfc.zjq.xiaodaixing.support.AbstractXiaodaixingIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TC-ST-001：逻辑删除位对查询可见性的影响。
 *
 * <p>契约 IC5 明确「手写 is_deleted=0，无 @TableLogic 自动过滤」——
 * 这正是最容易在后续重构中被漏掉的一条，值得一条独立用例守着。
 */
@DisplayName("小贷星查询 · 逻辑删除可见性")
class XiaodaixingLogicalDeleteTest extends AbstractXiaodaixingIntegrationTest {

    @Autowired
    private TjdBaseXiaodaixingProjectService projectService;

    @Test
    @DisplayName("TC-ST-001 逻辑删除行不进入查询结果")
    void logicallyDeletedRowsAreInvisibleToQuery() {
        // GIVEN 台账中同时存在 is_deleted=0 与 is_deleted=1 的行
        insertLedgerRow("XDX-0001", "杭州甲科技", "杭州分公司", "20260531", "batch-A", 0);
        insertLedgerRow("XDX-0002", "宁波乙贸易", "宁波分公司", "20260531", "batch-A", 0);
        insertLedgerRow("XDX-0003", "已删除客户", "杭州分公司", "20260531", "batch-A", 1);

        assertThat(totalRowCount()).as("前置：三行都在表里").isEqualTo(3);
        assertThat(liveRowCount()).as("前置：其中两行未逻辑删除").isEqualTo(2);

        // WHEN 发起分页查询
        IPage<TjdBaseXiaodaixingProject> page =
                projectService.page(new TjdBaseXiaodaixingProjectSearchVO());

        // THEN 结果仅含 is_deleted=0 的行，逻辑删除行不出现
        assertThat(page.getRecords())
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsExactlyInAnyOrder("XDX-0001", "XDX-0002");
        assertThat(page.getRecords())
                .as("契约 IC5：漏写 is_deleted=0 时此断言即失败")
                .noneSatisfy(row -> assertThat(row.getProjectNo()).isEqualTo("XDX-0003"));
        assertThat(page.getTotal()).isEqualTo(2);
    }

    @Test
    @DisplayName("TC-ST-001 变体：带筛选条件时逻辑删除过滤依然生效")
    void logicalDeleteFilterAlsoAppliesUnderSearchConditions() {
        // GIVEN 同一筛选条件下同时存在未删除与已删除的行
        insertLedgerRow("XDX-0001", "杭州甲科技", "杭州分公司", "20260531", "batch-A", 0);
        insertLedgerRow("XDX-0002", "杭州甲科技", "杭州分公司", "20260531", "batch-A", 1);

        TjdBaseXiaodaixingProjectSearchVO query = new TjdBaseXiaodaixingProjectSearchVO();
        query.setCustomerName("杭州甲科技");

        // WHEN 发起分页查询
        IPage<TjdBaseXiaodaixingProject> page = projectService.page(query);

        // THEN 只返回未逻辑删除的那一行
        assertThat(page.getRecords())
                .extracting(TjdBaseXiaodaixingProject::getProjectNo)
                .containsExactly("XDX-0001");
    }
}
```

---

## 7. 用例 → 测试方法 追溯表

| 用例 | 测试类 | 测试方法 | 状态 |
|---|---|---|---|
| TC-F-001 | `XiaodaixingImportFunctionalTest` | `standardMonthlySheetLandsAllRowsInOneBatch` | 可执行 |
| TC-F-002 | `XiaodaixingImportFunctionalTest` | `importedRowsCarryOperatorIdentity` | 可执行 |
| TC-F-003 | `XiaodaixingImportFunctionalTest` | `dataDateFillsDownAcrossTheWholeBatch` | 可执行 |
| TC-F-004 | `XiaodaixingQueryFunctionalTest` | `defaultPageQueryReturnsOnlyLiveRows` | 可执行（过滤语义部分） |
| TC-F-004 | `XiaodaixingQueryFunctionalTest` | `defaultPageQueryResponseEnvelope` | @Disabled · 待澄清 #1 |
| TC-F-005 | `XiaodaixingQueryFunctionalTest` | `singleFilterConditionMatchesOnlyExpectedRows` / `filterByDataDateBatch` | 可执行 |
| TC-F-006 | `XiaodaixingImportFunctionalTest` | `clearAmountColumnsKeepDecimalPrecision` | 可执行 |
| TC-E-001 | `XiaodaixingImportBoundaryTest` | `headerOnlySheetImport` | @Disabled · 待澄清 #4 |
| TC-E-002 | `XiaodaixingImportBoundaryTest` | `missingDataDateFallsBackToUploadTime` | 可执行 |
| TC-E-003 | `XiaodaixingImportBoundaryTest` | `dirtyValueInDecimalColumnBecomesNullWithoutLosingTheRow` | 可执行 |
| TC-E-004 | `XiaodaixingImportBoundaryTest` | `duplicateWriteOffColumnsLandInSeparateColumns` | 可执行 |
| TC-E-005 | `XiaodaixingImportBoundaryTest` | `blankHeaderColumnStillPersistsItsValue` | 可执行 |
| TC-E-006 | `XiaodaixingImportBoundaryTest` | `overdueFlagKeepsItsDirtyRawValue` | 可执行 |
| TC-E-007 | `XiaodaixingImportBoundaryTest` | `overdueStartDateKeepsExcelSerialNumberAsText` | 可执行 |
| TC-E-008 | `XiaodaixingImportBoundaryTest` | `reserveRatioKeepsRawRatioText` | 可执行 |
| TC-E-009 | `XiaodaixingQueryBoundaryTest` | `pagingParameterBoundaries` | @Disabled · 待澄清 #5 |
| TC-E-010 | `XiaodaixingQueryBoundaryTest` | `filterWithNoMatchReturnsEmptyPage` | 可执行 |
| TC-E-011 | `XiaodaixingImportBoundaryTest` | `reimportingTheSameSheetAppendsASecondBatch` | 可执行 |
| TC-ERR-001 | `XiaodaixingImportErrorTest` | `emptyFileIsRejectedAndNothingIsPersisted` | 可执行（不入库 + 文案） |
| TC-ERR-002 | `XiaodaixingImportErrorTest` | `nonExcelFileIsRejectedAndNothingIsPersisted` / `csvFileIsAlsoRejected` | 可执行 |
| TC-ERR-001/002 | `XiaodaixingImportErrorTest` | `importErrorResponseContract` | @Disabled · 待澄清 #1 |
| TC-ST-001 | `XiaodaixingLogicalDeleteTest` | `logicallyDeletedRowsAreInvisibleToQuery` + 变体 | 可执行 |

合计：**24 个测试方法**，其中 4 个为待澄清骨架（`@Tag("pending-clarification")`，可用 `-DexcludedGroups=pending-clarification` 从 CI 主流水线摘出）。

---

## 8. 落地时需要回头确认的事

写代码过程中撞到的、规范层面确实拿不到的东西，列在这里，不擅自替规范做决定：

1. **待澄清 #1（响应契约）** — 直接卡住 3 个断言块。当前用「Service 层 `IPage` + 错误文案 `contains`」绕过，属**临时通道**：文案断言脆（改文案即红），拿到错误码后应换成对错误码的断言。
2. **待澄清 #4（零行语义）** — `TC-E-001` 只能先断言「不得凭空造数据行」这个两分支共同的不变量，成败断言留空。
3. **待澄清 #5（分页取值域）** — `TC-E-009` 已把 5 组边界值参数化写好，取值域一定，去掉 `@Disabled` 补断言即可。
4. **待澄清 #2（鉴权）/ #3（事务边界）** — 规范判定为「事实集沉默、未生成用例」，本次同样不产出测试代码。特别提示 #3：`saveBatch` 部分失败的行为若定为「整批回滚」，`TC-ERR-001/002` 里那句 `totalRowCount() == 0` 的强度还得往上抬一档（要区分「压根没写」与「写了又回滚」）。
5. **列下标假设 A3/A4** — 「数据日期」「合同金额」「放款金额」三列的 index 规范未钉。全部集中在 `XiaodaixingColumns` 中并加了 `假设` 注释，接入真实工程时对着 IC6 映射表核一遍即可。
6. **测试库选型** — 基座用 `TRUNCATE` + `JdbcTemplate` 直查，假定测试跑在真实 MySQL（Testcontainers 或 dev 库的独立 schema）上。若改用 H2，`decimal(24,6)` 精度与 `NOW()` 行为需另行验证，`TC-F-006` 可能出现假绿。
