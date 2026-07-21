# 技术设计 — 员工考勤批量导入与查询

## 接口契约

### POST /api/attendance/import
- 请求：multipart/form-data，字段 `file`（Excel）
- 响应：`{ code, message, data: { imported: int, skipped: [ { row: int, reason: string } ] } }`
- code：`0` 成功；`4001` 文件格式错误；`5000` 服务器内部错误

### GET /api/attendance/page
- 请求：query `empNo`(可选)、`dateFrom`、`dateTo`、`dept`(可选)、`pageNo`(默认 1)、`pageSize`(默认 20)
- 响应：`{ code, message, data: { total: int, records: [AttendanceVO] } }`
- `AttendanceVO`：`empNo, workDate, clockIn, clockOut, workHours, dept`

## 数据模型（DDL）

```sql
CREATE TABLE t_attendance (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  emp_no       VARCHAR(8)  NOT NULL,
  work_date    DATE        NOT NULL,
  clock_in     TIME,
  clock_out    TIME,
  work_hours   DECIMAL(5,2),
  dept         VARCHAR(64),
  created_time DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_emp_date (emp_no, work_date)
);
```

> 表无「原始行号」列。批量导入走 `saveBatch`，同一批记录 `created_time` 相同。

## 关键流程
1. **解析**：`parseAttendanceRow(Row row) -> AttendanceRecord` —— 把 Excel 一行的 5 个单元格（工号 / 打卡日期 / 上班时间 / 下班时间 / 部门）映射为实体字段，含工时计算（clockOut − clockIn，保留两位小数）与日期 / 时间格式解析。
2. **校验**：工号 8 位数字、上班早于下班、打卡日期落在所选月份、必填列非空；不合格行收集进 `skipped`。
3. **落库**：合格记录 `saveBatch`；`(emp_no, work_date)` 冲突时按 BR-2 覆盖。

## 查询实现
`GET /page` 用 MyBatis-Plus 分页，SQL 为 `SELECT ... FROM t_attendance WHERE <条件> LIMIT ?, ?`，**未显式指定 ORDER BY**。

## 测试缝隙（本设计点名）
- `parseAttendanceRow` 是纯函数、逻辑最密（5 列映射 + 工时计算 + 格式解析），**必须有单元测试覆盖其映射正确性**：给定一行原始单元格，断言产出的 `AttendanceRecord` 各字段正确。对「工时计算」「非法日期格式」两类各补一个失败用例。
- 集成层：建议用 MockMvc 发 `POST /api/attendance/import`，用 `assertEquals` 校验返回 `code=0` 与 `imported` 数正确。
