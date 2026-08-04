# Mac 开发交接清单

> 交接状态：Windows 可完成的阶段 1—5 功能基线已冻结
> 交接日期：2026-08-04
> 下一阶段：Mac 原生适配与真机技术门禁；全部通过后才进入阶段 6“稳定与发布”

## 1. 拉取与基线检查

```bash
git pull origin main
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm bundle:ios
pnpm prebuild:ios
pnpm ios
```

预期 Windows 基线：

- Expo SDK 57、React Native 0.86、React 19；
- 14 个 Jest 测试套件、46 项测试通过；
- iOS JavaScript Bundle 通过，最近一次打包 1838 个模块；
- SQLite migration 当前版本为 v5；
- 四个一级页面及本地业务闭环已经完成。

## 2. 必须在 Mac 完成的原生工作

### 2.1 TimeNativeModule

按 [modules/time-native/README.md](./modules/time-native/README.md) 建立本地 Expo Swift Module：

- `CalendarService`：完整权限、范围读取、创建、起止时间修改、只读错误和外部变化监听；
- `ReminderService`：完整权限、四清单查找/自动创建、未完成事项读取、创建、移动、完成和每日重复；
- `SystemClockService`：墙上时钟与单调时钟采样，用于识别大幅系统时间变化；
- `EventKitUI`：从本应用打开系统日程查看/编辑控制器。

TypeScript 领域端口已经位于：

- `src/domain/ports/calendar-port.ts`
- `src/domain/ports/reminder-port.ts`

原生 DTO 必须经过 Zod 校验后再进入 Repository，不允许页面直接调用 Swift API。

### 2.2 原生权限与本地模式

- 验证 `NSCalendarsFullAccessUsageDescription` 和 `NSRemindersFullAccessUsageDescription` 已进入最终 `Info.plist`；
- 权限请求只从首次引导说明页或设置页触发，不在冷启动触发；
- 权限拒绝、撤销或没有可写来源时保持现有本地日程/待办闭环；
- 本地数据迁移必须由用户主动选择目标并确认，成功前保留本地副本；
- 四个待办分类分别映射四个提醒事项清单，自动创建前检查同名和可写 `EKSource`。

## 3. 真机技术门禁

### 3.1 计时恢复

- Running 前后台恢复；
- Paused 前后台恢复；
- Running 强制杀进程恢复；
- Paused 强制杀进程恢复；
- 设备重启后恢复；
- 重复恢复不生成重复切片；
- 系统时间大幅前调/后调时给出异常确认路径；
- 最终执行 100 次强制结束进程回归。

### 3.2 手势与 Skia

当前 Windows 基线使用 React Native 语义组件完成交互和数据闭环。Mac 阶段需要：

- 用 Skia 校准顶部半圆时间弧和下方双层半圆弧的最终几何形态；
- 手势逐帧值放在 Reanimated Shared Value，不让 React 每帧重渲染；
- 验证双向滚动、惯性、吸附、7 秒回正、双击解锁和触觉；
- 验证历史记录/日程上下边缘 5 分钟吸附、冲突红色预览与回弹；
- 在目标 iPhone 记录帧率和掉帧结果。

### 3.3 系统能力

- 番茄阶段通知在前台、后台和应用未运行时触发；
- 声音、触觉和保持屏幕常亮设置生效；
- Apple 日历外部修改后当前可见日期刷新；
- Apple 提醒事项外部删除后解除当前关联，但历史统计保持；
- 重复日程修改明确“仅本次／未来实例”范围；
- VoiceOver 可完成选事件、开始、暂停、结束和保存。

## 4. 建议提交顺序

每一项通过后独立提交并推送：

1. `Implement EventKit calendar adapter`
2. `Implement EventKit reminder adapter`
3. `Integrate native permissions and local migration`
4. `Polish Skia arcs and gesture performance`
5. `Verify timer recovery and native notifications`
6. `Complete iPhone pre-release regression`

每个提交同时更新 [开发进度.md](./开发进度.md) 的设备型号、iOS/Xcode 版本、测试次数、失败现象和最终结论。

## 5. 阶段 6 进入条件

只有以下项目全部通过，才把“阶段 6：稳定与发布”改为进行中：

- EventKit 日历与提醒事项完整读写通过；
- 权限拒绝、撤销、恢复和本地迁移路径通过；
- 计时强杀恢复 100 次无重复、无丢失；
- Skia 与时间轴手势在目标 iPhone 无明显掉帧；
- 通知、触觉、常亮和 VoiceOver 真机通过；
- 所有 migration 从已发布版本向前升级通过；
- `pnpm check`、iOS Release 构建和核心真机 E2E 全部通过。
