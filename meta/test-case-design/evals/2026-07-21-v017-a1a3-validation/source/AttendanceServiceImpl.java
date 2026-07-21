// AttendanceServiceImpl.java — 关键片段（供 test-case-design 读结构与坐标）
package com.example.attendance.service.impl;

@Service
public class AttendanceServiceImpl
        extends ServiceImpl<AttendanceMapper, AttendanceRecord>
        implements AttendanceService {

    /** 纯函数：Excel 一行 -> 实体。5 列映射 + 工时计算 + 格式解析。 */
    public AttendanceRecord parseAttendanceRow(Row row) {
        AttendanceRecord r = new AttendanceRecord();
        r.setEmpNo(cell(row, 0));                                  // 第 0 列：工号
        r.setWorkDate(parseDate(cell(row, 1)));                   // 第 1 列：打卡日期 yyyy-MM-dd
        r.setClockIn(parseTime(cell(row, 2)));                    // 第 2 列：上班时间 HH:mm
        r.setClockOut(parseTime(cell(row, 3)));                   // 第 3 列：下班时间 HH:mm
        r.setDept(cell(row, 4));                                  // 第 4 列：部门
        r.setWorkHours(calcHours(r.getClockIn(), r.getClockOut())); // 工时 = 下班 - 上班，2 位小数
        return r;
    }

    @Override
    public ImportResult importExcel(MultipartFile file) {
        List<AttendanceRecord> ok = new ArrayList<>();
        List<Skip> skipped = new ArrayList<>();
        int rowIdx = 0;
        for (Row row : sheet(file)) {
            rowIdx++;
            AttendanceRecord r = parseAttendanceRow(row);
            String err = validate(r);          // 工号 8 位 / 上班早于下班 / 必填 / 月份边界
            if (err != null) { skipped.add(new Skip(rowIdx, err)); continue; }
            ok.add(r);
        }
        saveBatch(ok);   // 同一批 created_time 相同；表无原始行号列
        return new ImportResult(ok.size(), skipped);
    }

    @Override
    public Page<AttendanceVO> page(AttendanceQuery q) {
        // MyBatis-Plus 分页，未指定 ORDER BY —— 返回顺序由存储引擎决定
        return baseMapper.selectPage(new Page<>(q.getPageNo(), q.getPageSize()), wrapper(q))
                         .convert(this::toVO);
    }
}
