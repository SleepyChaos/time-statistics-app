# Time Native Module

该目录预留 iOS 原生模块，阶段 0 在 Mac 上通过 Expo Modules API 实现：

- `CalendarService`：EventKit 日历完整访问、按范围读取、创建和修改时间；
- `ReminderService`：提醒事项完整访问、清单映射、创建、移动和完成；
- `SystemClockService`：墙上时钟与单调时钟信息；
- EventKitUI 系统日程查看与编辑界面。

Windows 阶段只维护 TypeScript 端口与 DTO。Swift 实现必须在 Mac、Xcode 和 iPhone 真机上验证后提交。
