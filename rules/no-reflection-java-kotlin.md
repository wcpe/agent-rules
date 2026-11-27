# 禁反射规则（Java/Kotlin 项目通用，适用于所有仓库）

## 硬规则

正式代码与测试代码中，**非必要禁止使用反射**（`Class.forName` / `getDeclaredMethod` / `getDeclaredField` / `setAccessible` / `Method.invoke` / `Field.get|set` / `java.lang.reflect.Proxy` 等）。

判据：能不能用接口、lambda、显式工厂或直接静态调用表达？能 → 必须静态方式，不得反射。

## 迫不得已的例外（须同时满足）

1. 目标类不在编译期 classpath（NMS、第三方 mod 内部类、可选依赖探测），或宿主 API 版本差异无法用静态类型表达；
2. 反射点封装在单个小件内，对外只暴露静态类型函数，反射细节（Class/Method/Field 对象）不得洩出到公开签名、端口接口、模型类；
3. **反射查找必须缓存**（首次查找到后存起来），禁止每次调用重新 `getDeclaredMethod`；热路径（每 tick/每帧/每包）加倍从严；
4. 反射失败必须区分「目标不存在」与「签名变了」，禁止静默吞掉返回 null/Unit。

## 常见误判（按违规处理）

- 目标 API 其实编译期可见（典型：paper-api 自带 Folia 的 `EntityScheduler`/`Entity.getScheduler()`）却用反射绕——静态调用+运行期守卫即可，反射属违规；
- 为了「不进依赖」反射调自己仓里的类；
- 测试里滥用 `java.lang.reflect.Proxy` 当 mock——优先手写假实现/stub，或用正式 mock 框架；
- 存量反射被触碰时不清理（触碰即改），反而原样搬运扩散。

## 评审口径

评审 Java/Kotlin PR 时必须检查本规则：新增反射点逐一过判据，命中误判清单直接打回。
