```java
// 文件：src/test/java/com/zjq/xiaodaixing/TjdBaseXiaodaixingProjectTest.java
package com.zjq.xiaodaixing;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zjq.common.context.AppContext;
import com.zjq.common.exception.GlobalExceptionHandler;
import com.zjq.common.page.PageResult;
import com.zjq.xiaodaixing.controller.TjdBaseXiaodaixingProjectController;
import com.zjq.xiaodaixing.domain.TjdBaseXiaodaixingProject;
import com.zjq.xiaodaixing.dto.TjdBaseXiaodaixingProjectExcelRow;
import com.zjq.xiaodaixing.infrastructure.BatchNoGenerator;
import com.zjq.xiaodaixing.infrastructure.TjdBaseXiaodaixingProjectRepository;
import com.zjq.xiaodaixing.infrastructure.XiaodaixingExcelReader;
import com.zjq.xiaodaixing.query.TjdBaseXiaodaixingProjectQuery;
import com.zjq.xiaodaixing.service.impl.TjdBaseXiaodaixingProjectServiceImpl;
import com.zjq.xiaodaixing.vo.ImportResult;
import com.zjq.xiaodaixing.vo.TjdBaseXiaodaixingProjectSearchVO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toSet;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 小贷星管理导入及分页查询测试。
 *
 * <p>基于规范作如下生产代码命名假设：ExcelReader 使用 EasyExcel 按 index=0..35
 * 全 String 读取；Service 完成转换、fill-down、批次及审计字段填充；Repository
 * 执行 saveBatch 追加写和分页查询。</p>
 *
 * <p>规范中的待定项采用可执行默认约定：仅表头文件成功导入 0 行且不创建空批次；
 * pageNo 小于 1 归一为 1，pageSize 小于 1 使用 20、大于 200 钳制为 200；
 * 超末页返回空页；校验错误返回 HTTP 400、code=VALIDATION_ERROR。</p>
 */
@ExtendWith(MockitoExtension.class)
class TjdBaseXiaodaixingProjectTest {

    private static final String BASE =
            "/api-zjq/xiaodaixing/tjdBaseXiaodaixingProject";
    private static final Instant NOW = Instant.parse("2026-07-20T01:02:03Z");
    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final LocalDateTime IMPORT_TIME = LocalDateTime.ofInstant(NOW, ZONE);
    private static final String USER_ID = "operator-10086";

    @Mock XiaodaixingExcelReader excelReader;
    @Mock TjdBaseXiaodaixingProjectRepository repository;
    @Mock BatchNoGenerator batchNoGenerator;

    private TjdBaseXiaodaixingProjectServiceImpl service;
    private MockedStatic<AppContext> appContext;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        service = new TjdBaseXiaodaixingProjectServiceImpl(
                excelReader, repository, batchNoGenerator, Clock.fixed(NOW, ZONE));
        TjdBaseXiaodaixingProjectController controller =
                new TjdBaseXiaodaixingProjectController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();

        appContext = mockStatic(AppContext.class);
        appContext.when(AppContext::getUserId).thenReturn(USER_ID);
        lenient().when(batchNoGenerator.next()).thenReturn("batch-001");
        lenient().when(repository.saveBatch(anyList()))
                .thenAnswer(invocation -> invocation.<List<?>>getArgument(0).size());
    }

    @AfterEach
    void tearDown() {
        appContext.close();
    }

    @Test
    @DisplayName("TC-F-001 标准清单经端点导入 66 行且共享日期、批次号和导入时间")
    void importsAllSixtySixRowsInOneBatch() throws Exception {
        MockMultipartFile file = excelFile("小贷星项目清单（20260531）.xlsx");
        when(excelReader.read(any())).thenReturn(rows(66, "20260531"));

        mockMvc.perform(multipart(BASE + "/importExcel").file(file))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.importedCount").value(66));

        List<TjdBaseXiaodaixingProject> saved = savedBatch();
        assertAll(
                () -> assertEquals(66, saved.size(), "不得丢失任何数据行"),
                () -> assertTrue(saved.stream()
                        .allMatch(it -> "20260531".equals(it.getDataDate()))),
                () -> assertEquals(Set.of("batch-001"),
                        saved.stream().map(TjdBaseXiaodaixingProject::getBatchNo)
                                .collect(toSet())),
                () -> assertTrue(saved.stream()
                        .allMatch(it -> IMPORT_TIME.equals(it.getImportTime())))
        );
    }

    @Test
    @DisplayName("TC-F-002 创建人取当次登录用户标识")
    void fillsCreateUserFromAppContext() {
        TjdBaseXiaodaixingProject saved =
                importRows(List.of(row(1).setDataDate("20260531"))).get(0);

        assertAll(
                () -> assertNotNull(saved.getCreateUser()),
                () -> assertFalse(saved.getCreateUser().isBlank()),
                () -> assertEquals(USER_ID, saved.getCreateUser())
        );
        appContext.verify(AppContext::getUserId);
    }

    @Test
    @DisplayName("TC-F-003 首行数据日期向下填充整批")
    void fillsDataDateDown() {
        List<TjdBaseXiaodaixingProjectExcelRow> source = rows(5, "20260531");
        assertTrue(source.subList(1, 5).stream().allMatch(it -> it.getDataDate() == null));

        List<TjdBaseXiaodaixingProject> saved = importRows(source);

        assertTrue(saved.stream().allMatch(it -> "20260531".equals(it.getDataDate())));
    }

    @Test
    @DisplayName("TC-F-004 默认分页成功且显式查询 is_deleted=0")
    void returnsDefaultPageForActiveRowsOnly() throws Exception {
        TjdBaseXiaodaixingProject active = project("ACTIVE", 0);
        when(repository.selectPage(any(TjdBaseXiaodaixingProjectQuery.class)))
                .thenReturn(PageResult.of(List.of(active), 1L, 1, 20));

        mockMvc.perform(post(BASE + "/page")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(
                                new TjdBaseXiaodaixingProjectSearchVO())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].projectNo").value("ACTIVE"));

        TjdBaseXiaodaixingProjectQuery query = capturedQuery();
        assertAll(
                () -> assertEquals(1, query.getPageNo()),
                () -> assertEquals(20, query.getPageSize()),
                () -> assertEquals(0, query.getIsDeleted(),
                        "必须手写 is_deleted=0，不依赖 @TableLogic")
        );
    }

    @ParameterizedTest(name = "TC-F-005 单条件筛选：{0}")
    @MethodSource("singleFilterCases")
    @DisplayName("TC-F-005 常用单一筛选条件原样进入查询")
    void appliesOneCommonFilter(
            String name,
            Consumer<TjdBaseXiaodaixingProjectSearchVO> setter,
            Function<TjdBaseXiaodaixingProjectQuery, String> getter,
            String expected) {
        TjdBaseXiaodaixingProjectSearchVO vo =
                new TjdBaseXiaodaixingProjectSearchVO();
        setter.accept(vo);
        when(repository.selectPage(any(TjdBaseXiaodaixingProjectQuery.class)))
                .thenReturn(PageResult.empty(1, 20));

        service.page(vo);

        assertEquals(expected, getter.apply(capturedQuery()), name);
    }

    static Stream<Arguments> singleFilterCases() {
        return Stream.of(
                filter("客户名", vo -> vo.setCustomerName("星海公司"),
                        TjdBaseXiaodaixingProjectQuery::getCustomerName, "星海公司"),
                filter("项目号", vo -> vo.setProjectNo("P-1001"),
                        TjdBaseXiaodaixingProjectQuery::getProjectNo, "P-1001"),
                filter("所属机构", vo -> vo.setOrganizationName("杭州分部"),
                        TjdBaseXiaodaixingProjectQuery::getOrganizationName, "杭州分部"),
                filter("是否逾期", vo -> vo.setIsOverdue("是"),
                        TjdBaseXiaodaixingProjectQuery::getIsOverdue, "是"),
                filter("项目评级", vo -> vo.setProjectRating("A"),
                        TjdBaseXiaodaixingProjectQuery::getProjectRating, "A"),
                filter("数据日期", vo -> vo.setDataDate("20260531"),
                        TjdBaseXiaodaixingProjectQuery::getDataDate, "20260531")
        );
    }

    @Test
    @DisplayName("TC-F-006 清晰金额以 decimal(24,6) 精度落库")
    void keepsDecimalPrecision() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setContractAmount("123456789012345678.123456")
                .setLoanAmount("8800.100000"))).get(0);

        assertAll(
                () -> assertEquals(new BigDecimal("123456789012345678.123456"),
                        saved.getContractAmount()),
                () -> assertEquals(new BigDecimal("8800.100000"),
                        saved.getLoanAmount()),
                () -> assertEquals(6, saved.getContractAmount().scale()),
                () -> assertEquals(6, saved.getLoanAmount().scale())
        );
    }

    @Test
    @DisplayName("TC-E-001 仅表头文件成功返回零行且不创建空批次")
    void acceptsHeaderOnlyExcelAsZeroRows() {
        MultipartFile file = excelFile("仅表头.xlsx");
        when(excelReader.read(file)).thenReturn(List.of());

        ImportResult result = service.importExcel(file);

        assertAll(
                () -> assertEquals(0, result.getImportedCount()),
                () -> assertNull(result.getBatchNo())
        );
        verify(repository, never()).saveBatch(anyList());
    }

    @Test
    @DisplayName("TC-E-002 数据日期整列为空时以上传日期兜底")
    void fallsBackToUploadDate() {
        List<TjdBaseXiaodaixingProject> saved = importRows(rows(3, null));

        assertAll(
                () -> assertEquals(3, saved.size()),
                () -> assertTrue(saved.stream()
                        .allMatch(it -> "20260720".equals(it.getDataDate())))
        );
    }

    @Test
    @DisplayName("TC-E-003 非数字金额置空但该行其他字段保留")
    void nullsDirtyDecimalAndKeepsRow() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setCustomerName("必须保留的客户")
                .setContractAmount("非数字脏值"))).get(0);

        assertAll(
                () -> assertNull(saved.getContractAmount()),
                () -> assertEquals("必须保留的客户", saved.getCustomerName()),
                () -> assertEquals("P-0001", saved.getProjectNo())
        );
    }

    @Test
    @DisplayName("TC-E-004 两个核销金额列按 idx16/idx30 分列保真")
    void preservesBothWriteOffColumns() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setWriteOffAmount("idx16-非数字")
                .setWriteOffAmount2("idx30-另一原值"))).get(0);

        assertAll(
                () -> assertEquals("idx16-非数字", saved.getWriteOffAmount()),
                () -> assertEquals("idx30-另一原值", saved.getWriteOffAmount2())
        );
    }

    @Test
    @DisplayName("TC-E-005 空表头 idx34 落入 guaranteeWayDetail")
    void preservesHeaderlessColumn() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setGuaranteeWayDetail("信用贷款"))).get(0);

        assertEquals("信用贷款", saved.getGuaranteeWayDetail());
    }

    @Test
    @DisplayName("TC-E-006 是否逾期日期拼接脏值原样入 varchar")
    void preservesDirtyOverdueValue() {
        String dirty = "否2026/05/31";
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setIsOverdue(dirty))).get(0);

        assertEquals(dirty, saved.getIsOverdue());
    }

    @Test
    @DisplayName("TC-E-007 逾期起始日序列号原样入 varchar")
    void preservesExcelDateSerialNumbers() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setPrincipalOverdueStartDate("45808")
                .setInterestOverdueStartDate("45809.5"))).get(0);

        assertAll(
                () -> assertEquals("45808", saved.getPrincipalOverdueStartDate()),
                () -> assertEquals("45809.5", saved.getInterestOverdueStartDate())
        );
    }

    @Test
    @DisplayName("TC-E-008 准备金计提比例原样入 varchar")
    void preservesReserveRatio() {
        TjdBaseXiaodaixingProject saved = importRows(List.of(row(1)
                .setDataDate("20260531")
                .setReserveRatio("0.6"))).get(0);

        assertEquals("0.6", saved.getReserveRatio());
    }

    @ParameterizedTest(name = "TC-E-009 {0}/{1} => {2}/{3}")
    @MethodSource("pageBoundaries")
    @DisplayName("TC-E-009 分页边界值按默认约定归一化")
    void normalizesPageBoundaries(
            int inputPage, int inputSize, int expectedPage, int expectedSize) {
        TjdBaseXiaodaixingProjectSearchVO vo =
                new TjdBaseXiaodaixingProjectSearchVO();
        vo.setPageNo(inputPage);
        vo.setPageSize(inputSize);
        when(repository.selectPage(any(TjdBaseXiaodaixingProjectQuery.class)))
                .thenReturn(PageResult.empty(expectedPage, expectedSize));

        PageResult<TjdBaseXiaodaixingProject> result = service.page(vo);

        TjdBaseXiaodaixingProjectQuery query = capturedQuery();
        assertAll(
                () -> assertEquals(expectedPage, query.getPageNo()),
                () -> assertEquals(expectedSize, query.getPageSize()),
                () -> assertTrue(result.getRecords().isEmpty())
        );
    }

    static Stream<Arguments> pageBoundaries() {
        return Stream.of(
                Arguments.of(0, 20, 1, 20),
                Arguments.of(-1, 20, 1, 20),
                Arguments.of(1, 0, 1, 20),
                Arguments.of(1, -1, 1, 20),
                Arguments.of(1, 10_000, 1, 200),
                Arguments.of(999, 20, 999, 20)
        );
    }

    @Test
    @DisplayName("TC-E-010 筛选无命中返回空分页且不报错")
    void returnsEmptyPageWhenNothingMatches() {
        TjdBaseXiaodaixingProjectSearchVO vo =
                new TjdBaseXiaodaixingProjectSearchVO();
        vo.setProjectNo("不存在");
        when(repository.selectPage(any(TjdBaseXiaodaixingProjectQuery.class)))
                .thenReturn(PageResult.empty(1, 20));

        PageResult<TjdBaseXiaodaixingProject> result = service.page(vo);

        assertAll(
                () -> assertEquals(0L, result.getTotal()),
                () -> assertNotNull(result.getRecords()),
                () -> assertTrue(result.getRecords().isEmpty())
        );
    }

    @Test
    @DisplayName("TC-E-011 重复导入完整追加且批次号不同")
    void appendsDuplicateImportAsNewBatch() {
        MultipartFile first = excelFile("第一次.xlsx");
        MultipartFile second = excelFile("第二次.xlsx");
        List<TjdBaseXiaodaixingProjectExcelRow> sameRows = rows(2, "20260531");
        when(excelReader.read(first)).thenReturn(sameRows);
        when(excelReader.read(second)).thenReturn(sameRows);
        when(batchNoGenerator.next()).thenReturn("batch-A", "batch-B");

        service.importExcel(first);
        service.importExcel(second);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TjdBaseXiaodaixingProject>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(repository, times(2)).saveBatch(captor.capture());
        List<TjdBaseXiaodaixingProject> batchA = captor.getAllValues().get(0);
        List<TjdBaseXiaodaixingProject> batchB = captor.getAllValues().get(1);
        assertAll(
                () -> assertEquals(2, batchA.size()),
                () -> assertEquals(2, batchB.size()),
                () -> assertEquals(
                        batchA.stream().map(TjdBaseXiaodaixingProject::getProjectNo).toList(),
                        batchB.stream().map(TjdBaseXiaodaixingProject::getProjectNo).toList()),
                () -> assertEquals(Set.of("batch-A"),
                        batchA.stream().map(TjdBaseXiaodaixingProject::getBatchNo)
                                .collect(toSet())),
                () -> assertEquals(Set.of("batch-B"),
                        batchB.stream().map(TjdBaseXiaodaixingProject::getBatchNo)
                                .collect(toSet()))
        );
    }

    @Test
    @DisplayName("TC-ERR-001 空文件返回“文件不能为空”且不入库")
    void rejectsEmptyFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "空文件.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[0]);

        mockMvc.perform(multipart(BASE + "/importExcel").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("文件不能为空")));
        verifyNoInteractions(excelReader);
        verify(repository, never()).saveBatch(anyList());
    }

    @ParameterizedTest(name = "TC-ERR-002 非 Excel：{0}")
    @ValueSource(strings = {"项目清单.txt", "项目清单.csv", "项目清单.pdf"})
    @DisplayName("TC-ERR-002 非 xls/xlsx 返回“格式不支持”且不入库")
    void rejectsNonExcelFile(String filename) throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", filename, MediaType.TEXT_PLAIN_VALUE,
                "not-excel".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart(BASE + "/importExcel").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("格式不支持")));
        verifyNoInteractions(excelReader);
        verify(repository, never()).saveBatch(anyList());
    }

    @Test
    @DisplayName("TC-ST-001 逻辑删除行不进入查询结果")
    void excludesLogicallyDeletedRows() {
        TjdBaseXiaodaixingProject active = project("ACTIVE", 0);
        when(repository.selectPage(any(TjdBaseXiaodaixingProjectQuery.class)))
                .thenAnswer(invocation -> {
                    TjdBaseXiaodaixingProjectQuery query = invocation.getArgument(0);
                    assertEquals(0, query.getIsDeleted());
                    return PageResult.of(List.of(active), 1L,
                            query.getPageNo(), query.getPageSize());
                });

        PageResult<TjdBaseXiaodaixingProject> result =
                service.page(new TjdBaseXiaodaixingProjectSearchVO());

        assertAll(
                () -> assertEquals(List.of("ACTIVE"), result.getRecords().stream()
                        .map(TjdBaseXiaodaixingProject::getProjectNo).toList()),
                () -> assertTrue(result.getRecords().stream()
                        .noneMatch(it -> Integer.valueOf(1).equals(it.getIsDeleted())))
        );
    }

    private List<TjdBaseXiaodaixingProject> importRows(
            List<TjdBaseXiaodaixingProjectExcelRow> source) {
        MultipartFile file = excelFile("测试清单.xlsx");
        when(excelReader.read(file)).thenReturn(source);
        service.importExcel(file);
        return savedBatch();
    }

    private List<TjdBaseXiaodaixingProject> savedBatch() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TjdBaseXiaodaixingProject>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(repository).saveBatch(captor.capture());
        return captor.getValue();
    }

    private TjdBaseXiaodaixingProjectQuery capturedQuery() {
        ArgumentCaptor<TjdBaseXiaodaixingProjectQuery> captor =
                ArgumentCaptor.forClass(TjdBaseXiaodaixingProjectQuery.class);
        verify(repository).selectPage(captor.capture());
        return captor.getValue();
    }

    private static Arguments filter(
            String name,
            Consumer<TjdBaseXiaodaixingProjectSearchVO> setter,
            Function<TjdBaseXiaodaixingProjectQuery, String> getter,
            String expected) {
        return Arguments.of(name, setter, getter, expected);
    }

    private static List<TjdBaseXiaodaixingProjectExcelRow> rows(
            int count, String firstDataDate) {
        List<TjdBaseXiaodaixingProjectExcelRow> result = new ArrayList<>();
        IntStream.rangeClosed(1, count).forEach(index ->
                result.add(row(index).setDataDate(index == 1 ? firstDataDate : null)));
        return result;
    }

    private static TjdBaseXiaodaixingProjectExcelRow row(int index) {
        return new TjdBaseXiaodaixingProjectExcelRow()
                .setProjectNo("P-%04d".formatted(index))
                .setCustomerName("客户-%04d".formatted(index))
                .setOrganizationName("机构-A")
                .setProjectRating("A");
    }

    private static TjdBaseXiaodaixingProject project(String projectNo, int deleted) {
        return new TjdBaseXiaodaixingProject()
                .setProjectNo(projectNo)
                .setCustomerName("测试客户")
                .setIsDeleted(deleted);
    }

    private static MockMultipartFile excelFile(String name) {
        return new MockMultipartFile(
                "file", name,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "由 ExcelReader mock 接管的内容".getBytes(StandardCharsets.UTF_8));
    }
}
```
