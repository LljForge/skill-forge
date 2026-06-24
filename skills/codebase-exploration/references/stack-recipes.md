# 框架约定速查表（派生种子，非穷举）

> SKILL.md §5.3 的外置内容。**§5.4 栈探测协议识别出栈后，查本表对应行起步**，再现场补。
>
> **作派生起点，不是完整配方**——新栈缺行照 §5.1 槽模型 + §5.2 通用名模式现场派生；某栈跑顺了**结晶到本表**成下一份参考（结晶进**这里**、不回灌 SKILL.md，避免主干随栈数膨胀）。

每行回答「这个栈里，每个信号槽该 grep 什么」（机械层）；列对应 §5.1 信号槽。

| 栈 | 入口/路由约定 | 依赖装配 | 数据访问 | 横切件 |
|---|---|---|---|---|
| JS/TS | Next.js `pages/*`·`app/**/page.*`·`app/**/route.ts`(api)·`layout.*`；Expo `*+api.*`/screens；Express/MVC `routes/`·`controllers/`·`handlers/`；CLI 工具 commander `.command()`；MCP server `server.tool(...)`/`tools.ts`（AI/agent 工具类高频形态） | NestJS `@Injectable`/构造注入；否则手工 wiring | Prisma/TypeORM/Drizzle；`schema.prisma` | NestJS guard/interceptor/middleware；Express middleware |
| Python | Django `views.py`·`urls.py`；FastAPI/Flask `@app.get`/`APIRouter`；入口 `main.py`/`manage.py` | 多显式构造；FastAPI `Depends` | SQLAlchemy/Django ORM | 装饰器 / middleware |
| Go | `main.go`；handlers/routes/controllers 目录；gin/echo/fiber 路由 | 显式构造/wire | gorm/sqlx | middleware 链 |
| Java/Spring（**Java 结晶参考**） | `@RestController`/`@Controller`·`@Service`·`@Scheduled` | `@Autowired`/`@Resource`/构造注入 | MyBatis/`@TableName`/JPA | `@Aspect`/HandlerInterceptor；全局异常处理器；SecurityConfig |

**许可证护栏**（同 §5.5）：本表借的是「框架怎么摆文件」这类公共约定事实、用自己的话重表述；不抄 GitNexus 源码、不依赖它。
