# 小贷星管理 v0.15 — JUnit 5 + MockMvc 测试交付

## 1. 测试代码

下面的测试采用 HTTP 黑盒方式：生产代码只需提供规范中的两个端点，测试不直接依赖 Controller、Service、DTO 或 Mapper 的 Java 签名。`JdbcTemplate` 仅用于准备查询夹具和核对最终持久化状态；每个测试都在事务中运行，以隔离数据。

### 文件：`src/test/java/<base-package>/xiaodaixing/TjdBaseXiaodaixingProjectApiIT.java`

> 将本文件放到 Spring Boot 启动类所在包或其子包中，并把第一行 `package` 改成项目实际基础包。代码顶部的“适配点”集中列出了规范没有给出的字段名、分页字段、响应信封和 Excel 列序假设；如果项目命名不同，只改这一处及 `assertSuccess/assertFailure` 即可。

```java
package com.example.xiaodaixing;

import com.alibaba.excel.EasyExcel;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TjdBaseXiaodaixingProjectApiIT {

    // ---------- 仅据规范无法确定的集中适配点 ----------
    private static final String IMPORT_URL =
            "/xiaodaixing/tjdBaseXiaodaixingProject/importExcel";
    private static final String SEARCH_URL =
            "/xiaodaixing/tjdBaseXiaodaixingProject/search";
    private static final String TABLE = "tjd_base_xiaodaixing_project";

    // 假设 Result = { code: 200, msg: "...", data: ... }，分页 data = { records, total }。
    private static final int SUCCESS_CODE = 200;
    private static final String PAGE_NO = "current";
    private static final String PAGE_SIZE = "size";

    // 假设 SearchVO/JSON 字段使用以下 camelCase 名称。
    private static final String F_CUSTOMER = "customerName";
    private static final String F_PROJECT_NO = "projectNo";
    private static final String F_ORG = "affiliatedInstitution";
    private static final String F_OVERDUE = "overdue";
    private static final String F_RATING = "projectRating";
    private static final String F_DATA_DATE = "dataDate";

    // 假设数据库字段采用以下 snake_case 名称。
    private static final String C_CUSTOMER = "customer_name";
    private static final String C_PROJECT_NO = "project_no";
    private static final String C_ORG = "affiliated_institution";
    private static final String C_OVERDUE = "overdue";
    private static final String C_RATING = "project_rating";
    private static final String C_DATA_DATE = "data_date";
    private static final String C_BATCH_NO = "batch_no";
    private static final String C_IMPORT_TIME = "import_time";
    private static final String C_CREATE_USER = "create_user";
    private static final String C_DELETED = "is_deleted";
    private static final String C_VERSION = "version";
    private static final String C_CONTRACT_AMOUNT = "contract_amount";
    private static final String C_OVERDUE_START_DATE = "overdue_start_date";
    private static final String C_PROVISION_RATIO = "provision_ratio";
    private static final String C_WRITE_OFF_1 = "write_off_amount";
    private static final String C_WRITE_OFF_2 = "write_off_amount_2";
    private static final String C_GUARANTEE_DETAIL = "guarantee_method_detail";

    // 规范明确 17/31/35 列；其余位置是为可执行夹具作出的假设。
    private static final int COL_DATA_DATE = 0;
    private static final int COL_CUSTOMER = 1;
    private static final int COL_PROJECT_NO = 2;
    private static final int COL_ORG = 3;
    private static final int COL_CONTRACT_AMOUNT = 5;
    private static final int COL_OVERDUE = 10;
    private static final int COL_OVERDUE_START_DATE = 11;
    private static final int COL_PROVISION_RATIO = 20;
    private static final int COL_WRITE_OFF_1 = 16; // 第 17 列
    private static final int COL_WRITE_OFF_2 = 30; // 第 31 列
    private static final int COL_GUARANTEE_DETAIL = 34; // 第 35 列
    private static final int BUSINESS_COLUMN_COUNT = 36;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test
    void tcF001_importsAll66RowsAndReportsProcessedCount() throws Exception {
        String date = "20960531";
        List<List<String>> rows = new ArrayList<>();
        for (int i = 0; i < 66; i++) {
            rows.add(row(i == 0 ? date : null, "客户" + i, "F001-" + i));
        }

        JsonNode response = importExcel(xlsx(rows), "小贷星项目清单（20960531）.xlsx");

        assertSuccess(response);
        assertTrue(response.toString().contains("66"), "成功信封应告知处理 66 条");
        assertEquals(66, countByDate(date));
    }

    @Test
    void tcF002_fillsFirstDataDateDownToWholeBatch() throws Exception {
        String date = "20960530";
        List<List<String>> rows = List.of(
                row(date, "甲", "F002-1"),
                row(null, "乙", "F002-2"),
                row(null, "丙", "F002-3"));

        assertSuccess(importExcel(xlsx(rows), "fill-down.xlsx"));

        assertEquals(3, countByDate(date));
        assertEquals(0, scalarInt("select count(*) from " + TABLE
                + " where " + C_PROJECT_NO + " like 'F002-%' and " + C_DATA_DATE + " is null"));
    }

    @Test
    void tcF003_oneImportSharesBatchNumberAndImportTime() throws Exception {
        assertSuccess(importExcel(xlsx(List.of(
                row("20960529", "甲", "F003-1"),
                row(null, "乙", "F003-2"),
                row(null, "丙", "F003-3"))), "one-batch.xlsx"));

        Map<String, Object> aggregates = jdbc.queryForMap("select count(distinct " + C_BATCH_NO
                + ") batch_count, count(distinct " + C_IMPORT_TIME + ") time_count from " + TABLE
                + " where " + C_PROJECT_NO + " like 'F003-%'");
        assertEquals(1, ((Number) aggregates.get("batch_count")).intValue());
        assertEquals(1, ((Number) aggregates.get("time_count")).intValue());
    }

    @Test
    void tcF004_separateImportsHaveDifferentBatchNumbers() throws Exception {
        assertSuccess(importExcel(xlsx(List.of(row("20960528", "甲", "F004-A"))), "a.xlsx"));
        assertSuccess(importExcel(xlsx(List.of(row("20960628", "乙", "F004-B"))), "b.xlsx"));

        assertEquals(2, scalarInt("select count(distinct " + C_BATCH_NO + ") from " + TABLE
                + " where " + C_PROJECT_NO + " in ('F004-A','F004-B')"));
    }

    @Test
    void tcF005_mapsKnownDuplicateAndBlankHeaderColumnsByPosition() throws Exception {
        List<String> r = row("20960527", "映射客户", "F005-1");
        r.set(COL_WRITE_OFF_1, "核销一");
        r.set(COL_WRITE_OFF_2, "核销二");
        r.set(COL_GUARANTEE_DETAIL, "担保明细");

        assertSuccess(importExcel(xlsx(List.of(r)), "36-columns.xlsx"));

        Map<String, Object> saved = jdbc.queryForMap("select " + C_WRITE_OFF_1 + ","
                + C_WRITE_OFF_2 + "," + C_GUARANTEE_DETAIL + " from " + TABLE
                + " where " + C_PROJECT_NO + "='F005-1'");
        assertEquals("核销一", saved.get(C_WRITE_OFF_1));
        assertEquals("核销二", saved.get(C_WRITE_OFF_2));
        assertEquals("担保明细", saved.get(C_GUARANTEE_DETAIL));
    }

    @Disabled("唯一输入未给出其余 33 列的 index→字段对照，禁止猜测字段映射")
    @Test
    void tcF005_remaining33ColumnsNeedAuthoritativeMappingTable() {
        fail("补齐 36 列对照表后，为每列写唯一 marker 并逐字段核对数据库值");
    }

    @Test
    void tcF006_preservesDirtyStringsAndPersistsAmountsNumerically() throws Exception {
        List<String> r = row("20960526", "脏值客户", "F006-1");
        r.set(COL_OVERDUE, "否2026-05-31");
        r.set(COL_OVERDUE_START_DATE, "45567");
        r.set(COL_PROVISION_RATIO, "0.6");
        r.set(COL_CONTRACT_AMOUNT, "1234567890.123456");

        assertSuccess(importExcel(xlsx(List.of(r)), "dirty.xlsx"));

        Map<String, Object> saved = jdbc.queryForMap("select " + C_OVERDUE + ","
                + C_OVERDUE_START_DATE + "," + C_PROVISION_RATIO + "," + C_CONTRACT_AMOUNT
                + " from " + TABLE + " where " + C_PROJECT_NO + "='F006-1'");
        assertEquals("否2026-05-31", saved.get(C_OVERDUE));
        assertEquals("45567", String.valueOf(saved.get(C_OVERDUE_START_DATE)));
        assertEquals("0.6", String.valueOf(saved.get(C_PROVISION_RATIO)));
        assertEquals(0, new BigDecimal("1234567890.123456")
                .compareTo((BigDecimal) saved.get(C_CONTRACT_AMOUNT)));
    }

    @Test
    void tcF007_createUserComesFromCurrentOperator() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "operator.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx(List.of(row("20960525", "操作人客户", "F007-1"))));
        MvcResult result = mvc.perform(multipart(IMPORT_URL).file(file)
                        .header("X-User-Id", "operator-1001"))
                .andExpect(status().is2xxSuccessful()).andReturn();
        assertSuccess(body(result));

        assertEquals("operator-1001", jdbc.queryForObject("select " + C_CREATE_USER
                + " from " + TABLE + " where " + C_PROJECT_NO + "='F007-1'", String.class));
    }

    @Test
    void tcF008_searchReturnsSuccessRecordsTotalAndAllBusinessFields() throws Exception {
        assertSuccess(importExcel(xlsx(List.of(row("20960524", "分页客户", "F008-1"))), "page.xlsx"));

        JsonNode response = search(Map.of(F_DATA_DATE, "20960524"), 1, 20);
        assertSuccess(response);
        assertEquals(1, total(response));
        JsonNode record = records(response).get(0);
        assertTrue(record.isObject());
        assertTrue(record.has(F_PROJECT_NO));
        assertTrue(record.has("batchNo"));
        assertTrue(record.has("importTime"));

        Set<String> businessColumns = businessColumns();
        assertEquals(36, businessColumns.size(), "DDL 应恰有 36 个业务列");
        for (String column : businessColumns) {
            assertTrue(record.has(snakeToCamel(column)), "响应缺少业务字段: " + column);
        }
    }

    @Test
    void tcF009_eachCommonFilterWorksIndividually() throws Exception {
        insertSearchRecord("筛选甲有限公司", "F009-A", "机构甲", "是", "AAA", "20960523", nowMinus(2));
        insertSearchRecord("筛选乙有限公司", "F009-B", "机构乙", "否", "BBB", "20960522", nowMinus(1));

        assertOnlyProject(search(Map.of(F_CUSTOMER, "筛选甲有限公司"), 1, 20), "F009-A");
        assertOnlyProject(search(Map.of(F_PROJECT_NO, "F009-B"), 1, 20), "F009-B");
        assertOnlyProject(search(Map.of(F_ORG, "机构甲"), 1, 20), "F009-A");
        assertOnlyProject(search(Map.of(F_OVERDUE, "否"), 1, 20), "F009-B");
        assertOnlyProject(search(Map.of(F_RATING, "AAA"), 1, 20), "F009-A");
    }

    @Test
    void tcF010_dataDateFilterReturnsOnlyRequestedBatch() throws Exception {
        insertSearchRecord("客户一", "F010-A", "机构", "否", "A", "20960521", nowMinus(2));
        insertSearchRecord("客户二", "F010-B", "机构", "否", "A", "20960621", nowMinus(1));

        JsonNode response = search(Map.of(F_DATA_DATE, "20960521"), 1, 20);

        assertOnlyProject(response, "F010-A");
    }

    @Test
    void tcE001_reimportOverwritesWithoutGrowingAndRefreshesMetadata() throws Exception {
        byte[] workbook = xlsx(List.of(row("20960520", "原客户", "E001-1")));
        assertSuccess(importExcel(workbook, "same.xlsx"));
        // 避免数据库时间精度导致两次紧邻导入得到相同时间戳，先把旧批次时间移到过去。
        jdbc.update("update " + TABLE + " set " + C_IMPORT_TIME + "=? where "
                + C_PROJECT_NO + "='E001-1'", Timestamp.valueOf(nowMinus(60)));
        Map<String, Object> before = metadata("E001-1");

        assertSuccess(importExcel(workbook, "same.xlsx"));
        Map<String, Object> after = metadata("E001-1");

        assertEquals(1, countByProject("E001-1"));
        assertNotEquals(before.get(C_BATCH_NO), after.get(C_BATCH_NO));
        assertNotEquals(before.get(C_IMPORT_TIME), after.get(C_IMPORT_TIME));
        assertEquals(((Number) before.get(C_VERSION)).longValue() + 1,
                ((Number) after.get(C_VERSION)).longValue());
    }

    @Test
    void tcE002_duplicateKeyInsideFileKeepsLastRow() throws Exception {
        List<String> first = row("20960519", "靠前内容", "E002-1");
        List<String> last = row("20960519", "靠后内容", "E002-1");

        assertSuccess(importExcel(xlsx(List.of(first, last)), "duplicate-in-file.xlsx"));

        assertEquals(1, countByProject("E002-1"));
        assertEquals("靠后内容", jdbc.queryForObject("select " + C_CUSTOMER + " from " + TABLE
                + " where " + C_PROJECT_NO + "='E002-1'", String.class));
    }

    @Test
    void tcE003_emptyDataDateColumnFallsBackToUploadDay() throws Exception {
        String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);

        assertSuccess(importExcel(xlsx(List.of(
                row(null, "甲", "E003-1"), row(null, "乙", "E003-2"))), "no-date.xlsx"));

        assertEquals(2, scalarInt("select count(*) from " + TABLE + " where " + C_PROJECT_NO
                + " like 'E003-%' and " + C_DATA_DATE + "='" + today + "'"));
    }

    @Test
    void tcE004_headerOnlySucceedsWithZeroAndDoesNotWrite() throws Exception {
        int before = scalarInt("select count(*) from " + TABLE);
        JsonNode response = importExcel(xlsx(List.of()), "header-only.xlsx");

        assertSuccess(response);
        assertTrue(response.toString().contains("0"));
        assertEquals(before, scalarInt("select count(*) from " + TABLE));
    }

    @Test
    void tcE005_shellRowsAreSkippedAndExcludedFromProcessedCount() throws Exception {
        List<String> shell = row("20960518", " ", " ");
        shell.set(COL_ORG, "残留值");
        JsonNode response = importExcel(xlsx(List.of(
                row("20960518", "有效客户", "E005-1"), shell)), "shell-row.xlsx");

        assertSuccess(response);
        assertTrue(response.toString().contains("1"));
        assertEquals(1, countByDate("20960518"));
    }

    @Test
    void tcE006_blankOrInvalidAmountBecomesNullWithoutDroppingRows() throws Exception {
        List<String> blank = row("20960517", "空金额", "E006-1");
        blank.set(COL_CONTRACT_AMOUNT, " ");
        List<String> invalid = row(null, "坏金额", "E006-2");
        invalid.set(COL_CONTRACT_AMOUNT, "not-a-number");

        assertSuccess(importExcel(xlsx(List.of(blank, invalid)), "bad-amount.xlsx"));

        assertEquals(2, countByDate("20960517"));
        assertEquals(2, scalarInt("select count(*) from " + TABLE + " where " + C_PROJECT_NO
                + " like 'E006-%' and " + C_CONTRACT_AMOUNT + " is null"));
    }

    @Test
    void tcE007_amountParserAcceptsSeparatorsAndWhitespace() throws Exception {
        String[] raw = {"1,234.50", "1，234.50", " 1234.50 ", "\u00a01234.50\u00a0"};
        List<List<String>> rows = new ArrayList<>();
        for (int i = 0; i < raw.length; i++) {
            List<String> r = row(i == 0 ? "20960516" : null, "金额客户" + i, "E007-" + i);
            r.set(COL_CONTRACT_AMOUNT, raw[i]);
            rows.add(r);
        }

        assertSuccess(importExcel(xlsx(rows), "formatted-amount.xlsx"));

        List<BigDecimal> values = jdbc.queryForList("select " + C_CONTRACT_AMOUNT + " from " + TABLE
                + " where " + C_PROJECT_NO + " like 'E007-%'", BigDecimal.class);
        assertEquals(4, values.size());
        values.forEach(value -> assertEquals(0, new BigDecimal("1234.50").compareTo(value)));
    }

    @Test
    void tcE008_textIsTrimmedAndWhitespaceOnlyBecomesNull() throws Exception {
        List<String> r = row("20960515", "  首尾空白客户  ", "E008-1");
        r.set(COL_ORG, "   ");
        assertSuccess(importExcel(xlsx(List.of(r)), "trim.xlsx"));

        Map<String, Object> saved = jdbc.queryForMap("select " + C_CUSTOMER + "," + C_ORG
                + " from " + TABLE + " where " + C_PROJECT_NO + "='E008-1'");
        assertEquals("首尾空白客户", saved.get(C_CUSTOMER));
        assertNull(saved.get(C_ORG));
    }

    @Test
    void tcE009_fewerThan36ColumnsLeavesMissingTailNull() throws Exception {
        List<String> shortRow = new ArrayList<>(row("20960514", "短行客户", "E009-1").subList(0, 10));

        assertSuccess(importExcel(xlsxWithWidth(List.of(shortRow), 10), "short-columns.xlsx"));

        assertEquals(1, countByProject("E009-1"));
        assertNull(jdbc.queryForObject("select " + C_GUARANTEE_DETAIL + " from " + TABLE
                + " where " + C_PROJECT_NO + "='E009-1'", String.class));
    }

    @Disabled("超长文本行为由数据库严格模式决定；规范明确要求不得写死断言")
    @Test
    void tcE010_overlengthTextNeedsDatabasePolicyDecision() {
        fail("上游确定截断/拒绝行/整批失败后再落地");
    }

    @Test
    void tcE011_emptyFiltersReturnAllUndeletedRows() throws Exception {
        insertSearchRecord("客户一", "E011-A", "机构", "否", "A", "20960513", nowMinus(2));
        insertSearchRecord("客户二", "E011-B", "机构", "否", "A", "20960513", nowMinus(1));

        JsonNode response = search(Map.of(), 1, 10000);

        assertSuccess(response);
        assertTrue(total(response) >= 2);
        assertTrue(projectNos(response).containsAll(Set.of("E011-A", "E011-B")));
    }

    @Test
    void tcE012_multipleFiltersUseAndSemantics() throws Exception {
        insertSearchRecord("组合客户", "E012-A", "机构甲", "否", "A", "20960512", nowMinus(2));
        insertSearchRecord("组合客户", "E012-B", "机构乙", "否", "A", "20960512", nowMinus(1));

        JsonNode response = search(Map.of(F_CUSTOMER, "组合客户", F_ORG, "机构甲"), 1, 20);

        assertOnlyProject(response, "E012-A");
    }

    @Test
    void tcE013_textualSearchMatchingSemanticsAreFieldSpecific() throws Exception {
        insertSearchRecord("某某商贸有限公司", "E013-ABC-001", "华东中心", "否", "AAA", "20960511", nowMinus(1));

        assertOnlyProject(search(Map.of(F_CUSTOMER, "商贸"), 1, 20), "E013-ABC-001");
        assertOnlyProject(search(Map.of(F_PROJECT_NO, "ABC"), 1, 20), "E013-ABC-001");
        assertOnlyProject(search(Map.of(F_ORG, "华东"), 1, 20), "E013-ABC-001");
        assertEquals(0, total(search(Map.of(F_RATING, "AA"), 1, 20)));
        assertEquals(0, total(search(Map.of(F_OVERDUE, "否x"), 1, 20)));
        assertEquals(0, total(search(Map.of(F_DATA_DATE, "209605"), 1, 20)));
    }

    @Test
    void tcE014_firstAndLastPageHaveStableTotal() throws Exception {
        for (int i = 0; i < 5; i++) {
            insertSearchRecord("分页边界", "E014-" + i, "机构", "否", "A", "20960510", nowMinus(i));
        }

        JsonNode first = search(Map.of(F_CUSTOMER, "分页边界"), 1, 2);
        JsonNode last = search(Map.of(F_CUSTOMER, "分页边界"), 3, 2);
        JsonNode beyond = search(Map.of(F_CUSTOMER, "分页边界"), 4, 2);

        assertEquals(5, total(first));
        assertEquals(5, total(last));
        assertEquals(5, total(beyond));
        assertEquals(2, records(first).size());
        assertEquals(1, records(last).size());
        // 规范明确将 M+1 页行为留作待澄清，所以这里只核对 total，不断言 records。
    }

    @Test
    void tcE015_defaultSortIsImportTimeDescending() throws Exception {
        insertSearchRecord("排序客户", "E015-OLD", "机构", "否", "A", "20960509", nowMinus(2));
        insertSearchRecord("排序客户", "E015-NEW", "机构", "否", "A", "20960509", nowMinus(1));

        JsonNode response = search(Map.of(F_CUSTOMER, "排序客户"), 1, 20);

        assertEquals(List.of("E015-NEW", "E015-OLD"), projectNosInOrder(response));
    }

    @Test
    void tcE016_importedRowsAreImmediatelyVisibleToSearch() throws Exception {
        assertSuccess(importExcel(xlsx(List.of(row("20960508", "立即可见", "E016-1"))), "visible.xlsx"));

        assertOnlyProject(search(Map.of(F_DATA_DATE, "20960508"), 1, 20), "E016-1");
    }

    @Test
    void tcErr001_emptyFileReturnsExactFailureAndWritesNothing() throws Exception {
        int before = scalarInt("select count(*) from " + TABLE);

        JsonNode response = importExcel(new byte[0], "empty.xlsx");

        assertFailure(response);
        assertEquals("文件不能为空！", message(response));
        assertEquals(before, scalarInt("select count(*) from " + TABLE));
    }

    @Test
    void tcErr003_invalidExcelContentReturnsImportFailureAndWritesNothing() throws Exception {
        int before = scalarInt("select count(*) from " + TABLE);

        JsonNode response = importExcel("not an excel workbook".getBytes(), "fake.xlsx");

        assertFailure(response);
        assertTrue(message(response).contains("导入失败"));
        assertEquals(before, scalarInt("select count(*) from " + TABLE));
    }

    @Disabled("需一个生产持久化边界的可控故障注入点；唯一输入未给出 Mapper/Service 签名")
    @Test
    void tcErr004_lateWriteFailureRollsBackWholeBatch() {
        fail("对实际批量写 Mapper 注入第 N 行异常后，断言失败信封且该 batch_no 为 0 行");
    }

    @Test
    void tcSt001_logicallyDeletedRecordDisappearsFromListAndTotal() throws Exception {
        insertSearchRecord("删除客户", "ST001-DELETED", "机构", "否", "A", "20960507", nowMinus(2));
        insertSearchRecord("删除客户", "ST001-KEPT", "机构", "否", "A", "20960507", nowMinus(1));
        JsonNode before = search(Map.of(F_CUSTOMER, "删除客户"), 1, 20);
        assertEquals(2, total(before));

        jdbc.update("update " + TABLE + " set " + C_DELETED + "=1 where "
                + C_PROJECT_NO + "='ST001-DELETED'");
        JsonNode after = search(Map.of(F_CUSTOMER, "删除客户"), 1, 20);

        assertEquals(1, total(after));
        assertEquals(Set.of("ST001-KEPT"), projectNos(after));
    }

    // ---------- HTTP / Excel / DB helpers ----------

    private JsonNode importExcel(byte[] content, String filename) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content);
        return body(mvc.perform(multipart(IMPORT_URL).file(file))
                .andExpect(status().is2xxSuccessful()).andReturn());
    }

    private JsonNode search(Map<String, ?> filters, int page, int size) throws Exception {
        ObjectNode request = json.createObjectNode();
        request.put(PAGE_NO, page);
        request.put(PAGE_SIZE, size);
        filters.forEach((key, value) -> request.putPOJO(key, value));
        return body(mvc.perform(post(SEARCH_URL).contentType("application/json")
                        .content(json.writeValueAsBytes(request)))
                .andExpect(status().is2xxSuccessful()).andReturn());
    }

    private JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsByteArray());
    }

    private void assertSuccess(JsonNode response) {
        assertEquals(SUCCESS_CODE, response.path("code").asInt(), response.toPrettyString());
    }

    private void assertFailure(JsonNode response) {
        assertNotEquals(SUCCESS_CODE, response.path("code").asInt(), response.toPrettyString());
    }

    private String message(JsonNode response) {
        return response.path("msg").asText();
    }

    private JsonNode records(JsonNode response) {
        JsonNode records = response.path("data").path("records");
        assertTrue(records.isArray(), "期望 data.records 为数组: " + response.toPrettyString());
        return records;
    }

    private long total(JsonNode response) {
        assertSuccess(response);
        return response.path("data").path("total").asLong();
    }

    private void assertOnlyProject(JsonNode response, String expected) {
        assertSuccess(response);
        assertEquals(Set.of(expected), projectNos(response));
    }

    private Set<String> projectNos(JsonNode response) {
        return new HashSet<>(projectNosInOrder(response));
    }

    private List<String> projectNosInOrder(JsonNode response) {
        List<String> result = new ArrayList<>();
        records(response).forEach(node -> result.add(node.path(F_PROJECT_NO).asText()));
        return result;
    }

    private byte[] xlsx(List<List<String>> rows) {
        return xlsxWithWidth(rows, BUSINESS_COLUMN_COUNT);
    }

    private byte[] xlsxWithWidth(List<List<String>> rows, int width) {
        List<List<String>> head = new ArrayList<>();
        for (int i = 0; i < width; i++) {
            String name = "列" + (i + 1);
            if (i == COL_WRITE_OFF_1 || i == COL_WRITE_OFF_2) name = "核销金额";
            if (i == COL_GUARANTEE_DETAIL) name = "";
            head.add(List.of(name));
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        EasyExcel.write(out).head(head).sheet("小贷星").doWrite(rows);
        return out.toByteArray();
    }

    private List<String> row(String date, String customer, String projectNo) {
        List<String> row = new ArrayList<>(Arrays.asList(new String[BUSINESS_COLUMN_COUNT]));
        for (int i = 0; i < row.size(); i++) row.set(i, "1");
        row.set(COL_DATA_DATE, date);
        row.set(COL_CUSTOMER, customer);
        row.set(COL_PROJECT_NO, projectNo);
        return row;
    }

    private int countByDate(String date) {
        return scalarInt("select count(*) from " + TABLE + " where " + C_DATA_DATE + "='" + date + "'");
    }

    private int countByProject(String projectNo) {
        return scalarInt("select count(*) from " + TABLE + " where " + C_PROJECT_NO + "='" + projectNo + "'");
    }

    private int scalarInt(String sql) {
        return jdbc.queryForObject(sql, Integer.class);
    }

    private Map<String, Object> metadata(String projectNo) {
        return jdbc.queryForMap("select " + C_BATCH_NO + "," + C_IMPORT_TIME + "," + C_VERSION
                + " from " + TABLE + " where " + C_PROJECT_NO + "='" + projectNo + "'");
    }

    private LocalDateTime nowMinus(int minutes) {
        return LocalDateTime.now().minusMinutes(minutes);
    }

    private void insertSearchRecord(String customer, String projectNo, String org,
                                    String overdue, String rating, String dataDate,
                                    LocalDateTime importTime) {
        String sql = "insert into " + TABLE + " (" + String.join(",",
                C_CUSTOMER, C_PROJECT_NO, C_ORG, C_OVERDUE, C_RATING, C_DATA_DATE,
                C_BATCH_NO, C_IMPORT_TIME, C_CREATE_USER, C_DELETED, C_VERSION)
                + ") values (?,?,?,?,?,?,?,?,?,?,?)";
        jdbc.update(sql, customer, projectNo, org, overdue, rating, dataDate,
                UUID.randomUUID().toString(), Timestamp.valueOf(importTime), "test-user", 0, 0);
    }

    private Set<String> businessColumns() {
        Set<String> technical = Set.of("id", "batch_no", "import_time", "create_user",
                "create_time", "update_user", "update_time", "tenant_id", "is_deleted", "version");
        return jdbc.query("select * from " + TABLE + " where 1=0", rs -> {
            ResultSetMetaData md = rs.getMetaData();
            Set<String> columns = new HashSet<>();
            for (int i = 1; i <= md.getColumnCount(); i++) {
                String name = md.getColumnLabel(i).toLowerCase();
                if (!technical.contains(name)) columns.add(name);
            }
            return columns;
        });
    }

    private String snakeToCamel(String value) {
        StringBuilder result = new StringBuilder();
        boolean upper = false;
        for (char c : value.toCharArray()) {
            if (c == '_') {
                upper = true;
            } else {
                result.append(upper ? Character.toUpperCase(c) : c);
                upper = false;
            }
        }
        return result.toString();
    }
}
```

### 文件：`src/test/java/<base-package>/xiaodaixing/XiaodaixingUnresolvedAcceptanceTest.java`

这些测试方法刻意保持 `@Disabled`。它们把不能用当前后端测试栈或唯一输入可靠实现的验收项固定在测试报告中，避免被误报为已覆盖。补齐对应事实或测试工具后，应删除 `@Disabled` 并实现方法体。

```java
package com.example.xiaodaixing;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class XiaodaixingUnresolvedAcceptanceTest {

    @Disabled("需要浏览器/E2E 测试栈及 dev 菜单和页面的可定位契约；MockMvc 无法验证页面渲染与路由跳转")
    @Test
    void tcF011_devMenuIsVisibleAndNavigatesToXiaodaixingPage() {
        fail("待用前端 E2E 覆盖菜单层级、/slp/xiaodaixing、筛选表单、列表和上传入口");
    }

    @Disabled("唯一输入未给出交付文档路径和菜单编码的期望值")
    @Test
    void tcF012_prodMenuGuideContainsRequiredOperationsData() {
        fail("补充文档路径与菜单编码后，断言父节点=业务办理、路由=/slp/xiaodaixing 及全部配置项");
    }

    @Disabled("本项必须执行离线构建并与变更前依赖基线比较；本次交付明确禁止运行构建命令，且唯一输入没有基线")
    @Test
    void tcF013_backendBuildsOfflineWithoutNewDependencies() {
        fail("应由 CI/构建验收任务覆盖，不应由 MockMvc 伪造");
    }

    @Disabled("需要浏览器文件选择器与前端上传组件；MockMvc 绕过了前端")
    @Test
    void tcErr002_frontendRejectsNonExcelBeforeRequestIsSent() {
        fail("待用前端 E2E/组件测试断言格式提示，且后端未收到请求");
    }
}
```

## 2. 覆盖对照

“已落地”表示上面的活动测试方法有明确断言；“部分”表示只覆盖规范已定部分；“禁用”表示交付了可见的 `@Disabled` 契约占位，当前不会产生虚假通过。

| 规范用例 | 测试方法 | 状态与说明 |
|---|---|---|
| TC-F-001 | `tcF001_importsAll66RowsAndReportsProcessedCount` | 已落地 |
| TC-F-002 | `tcF002_fillsFirstDataDateDownToWholeBatch` | 已落地 |
| TC-F-003 | `tcF003_oneImportSharesBatchNumberAndImportTime` | 已落地 |
| TC-F-004 | `tcF004_separateImportsHaveDifferentBatchNumbers` | 已落地 |
| TC-F-005 | `tcF005_mapsKnownDuplicateAndBlankHeaderColumnsByPosition`；`tcF005_remaining33ColumnsNeedAuthoritativeMappingTable` | 部分：规范给出的第 17、31、35 列已落地；其余 33 列缺少权威对照，禁用 |
| TC-F-006 | `tcF006_preservesDirtyStringsAndPersistsAmountsNumerically` | 已落地，依赖列序适配点 |
| TC-F-007 | `tcF007_createUserComesFromCurrentOperator` | 已落地，假设测试环境以 `X-User-Id` 建立 `AppContext` |
| TC-F-008 | `tcF008_searchReturnsSuccessRecordsTotalAndAllBusinessFields` | 已落地；运行时从表元数据核对 36 个业务字段 |
| TC-F-009 | `tcF009_eachCommonFilterWorksIndividually` | 已落地 |
| TC-F-010 | `tcF010_dataDateFilterReturnsOnlyRequestedBatch` | 已落地 |
| TC-F-011 | `tcF011_devMenuIsVisibleAndNavigatesToXiaodaixingPage` | 禁用：需要前端 E2E |
| TC-F-012 | `tcF012_prodMenuGuideContainsRequiredOperationsData` | 禁用：文档路径、菜单编码期望缺失 |
| TC-F-013 | `tcF013_backendBuildsOfflineWithoutNewDependencies` | 禁用：必须由构建/依赖基线验证，且本任务禁止运行构建 |
| TC-E-001 | `tcE001_reimportOverwritesWithoutGrowingAndRefreshesMetadata` | 已落地 |
| TC-E-002 | `tcE002_duplicateKeyInsideFileKeepsLastRow` | 已落地；“其余项目原顺序”没有可观察排序契约，见风险说明 |
| TC-E-003 | `tcE003_emptyDataDateColumnFallsBackToUploadDay` | 已落地，按规范记录的现状断言 `yyyyMMdd` |
| TC-E-004 | `tcE004_headerOnlySucceedsWithZeroAndDoesNotWrite` | 已落地 |
| TC-E-005 | `tcE005_shellRowsAreSkippedAndExcludedFromProcessedCount` | 已落地 |
| TC-E-006 | `tcE006_blankOrInvalidAmountBecomesNullWithoutDroppingRows` | 已落地，依赖金额列序适配点 |
| TC-E-007 | `tcE007_amountParserAcceptsSeparatorsAndWhitespace` | 已落地 |
| TC-E-008 | `tcE008_textIsTrimmedAndWhitespaceOnlyBecomesNull` | 已落地 |
| TC-E-009 | `tcE009_fewerThan36ColumnsLeavesMissingTailNull` | 已落地 |
| TC-E-010 | `tcE010_overlengthTextNeedsDatabasePolicyDecision` | 禁用：规范明确预期待定且要求不得写死断言 |
| TC-E-011 | `tcE011_emptyFiltersReturnAllUndeletedRows` | 已落地 |
| TC-E-012 | `tcE012_multipleFiltersUseAndSemantics` | 已落地 |
| TC-E-013 | `tcE013_textualSearchMatchingSemanticsAreFieldSpecific` | 已落地 |
| TC-E-014 | `tcE014_firstAndLastPageHaveStableTotal` | 部分：第 1 页、末页及三次 total 已落地；M+1 页记录行为按规范不作断言 |
| TC-E-015 | `tcE015_defaultSortIsImportTimeDescending` | 已落地 |
| TC-E-016 | `tcE016_importedRowsAreImmediatelyVisibleToSearch` | 已落地 |
| TC-ERR-001 | `tcErr001_emptyFileReturnsExactFailureAndWritesNothing` | 已落地 |
| TC-ERR-002 | `tcErr002_frontendRejectsNonExcelBeforeRequestIsSent` | 禁用：需要前端 E2E/组件测试 |
| TC-ERR-003 | `tcErr003_invalidExcelContentReturnsImportFailureAndWritesNothing` | 已落地 |
| TC-ERR-004 | `tcErr004_lateWriteFailureRollsBackWholeBatch` | 禁用：缺少可 mock 的生产持久化边界签名或测试故障注入点 |
| TC-ST-001 | `tcSt001_logicallyDeletedRecordDisappearsFromListAndTotal` | 已落地 |

汇总：34 条规范用例中，26 条完整落地，2 条部分落地，6 条以 `@Disabled` 明示无法可靠执行；活动测试方法共 28 个。另有 TC-F-005 的其余 33 列子断言作为一个额外禁用方法保留。

## 3. 假设、问题与风险

### 必须由团队核对的适配假设

1. Spring Boot 测试类需位于启动类包之下；示例包名 `com.example.xiaodaixing` 是占位值。
2. 成功信封假设为 `code=200`、`msg`、`data`，分页假设为 `data.records` 与 `data.total`。规范只约定 `Result` 和“分页结果”，没有给出 JSON 结构。
3. 分页请求假设为 `current`、`size`。若 `SearchVO` 使用 `pageNum/pageSize` 或其他字段，只需改顶部常量。
4. 搜索字段假设为 `customerName/projectNo/affiliatedInstitution/overdue/projectRating/dataDate`；对应数据库列名也属于合理推定，并非唯一输入中的明确事实。
5. Excel 仅明确了 36 列总数以及第 17、31、35 列含义。测试暂定数据日期、客户、项目号在第 1、2、3 列，并为合同金额、是否逾期、逾期起始日、准备金比例选择了集中可改的列序。上游应补交完整的 0..35 对照表，之后才能把 TC-F-005 从部分覆盖提升为完整覆盖。
6. 当前操作人测试假设 `X-User-Id` 能在测试环境建立 `AppContext`。真实系统若由网关透传不同请求头、登录 token 或测试安全上下文提供身份，需要替换这一项夹具；断言目标仍是 `create_user=operator-1001`。
7. 测试假设表中除列出的字段外没有必须由夹具显式提供且无默认值的非空列。如果存在强制 `tenant_id`、审计字段或主键，`insertSearchRecord` 需按测试环境补齐。
8. 测试使用项目已有 EasyExcel 写入夹具，未引入任何新依赖。Spring Boot Test、JUnit 5、MockMvc、Jackson、JDBC 均假设已在测试依赖中。

### 需要上游/团队决定的问题

- TC-E-010 的超长文本策略仍未定义；应在“截断、拒绝该行、整批失败”中选择，并固定数据库严格模式后再写断言。
- TC-E-014 的 M+1 页行为仍未定义；当前只验证 total 不漂移，不能把空集、回落末页或错误任一种写成契约。
- TC-ERR-004 需要可控地让批量写入后段失败。推荐在 Service 层测试中 mock 实际 Mapper/Repository，或在集成测试 profile 提供故障注入实现；唯一输入没有签名，无法给出可编译的 Mockito 装配。
- TC-F-012 缺少 prod 菜单说明文档的确定路径与“菜单编码”的期望值。仅检查任意文档包含关键词会产生低价值的假通过。
- 鉴权三态（无凭据、凭据过期、有凭据无权限）仍没有产品契约，本交付没有自行扩展用例。

### 已知风险

- TC-E-003、E-004、E-006、E-007、E-008、E-012、E-013、E-015、ERR-003、ERR-004 的预期来自规范中记录的“当前实现”，不是已确认产品契约。实现变化时测试会失败，但失败未必表示产品回归。
- TC-E-006 的“不可解析金额置空”和 TC-E-008 的统一 trim 与 R2“原样保真、不清洗、零丢失”存在已知张力，建议优先由产品/数据负责人签字。
- TC-E-002 所称“其余项目号保持文件原有先后顺序”缺少持久化顺序字段或查询排序契约。当前测试可靠覆盖“同组合键保留最后一行”，没有用数据库自然顺序制造脆弱断言。
- `@Transactional` 通常能回滚同线程 MockMvc 请求中的数据库写入；若生产导入使用 `REQUIRES_NEW`、异步线程或独立数据源，需要测试 profile 的显式清理策略。为遵守本次交付限制，本文没有假定或编写破坏性全表清理。
- 本次按要求没有读取代码库、没有读取其他规范/文档，也没有执行编译或测试；因此交付是“按唯一规范形成的可执行候选”，集中适配点必须在合入前由项目维护者与真实类型/字段核对。
