# 时间刻度

一款受柳比歇夫时间统计法启发的本地优先时间记录 App。第一版面向 iPhone，使用 React Native 构建，并通过 iOS EventKit 接入 Apple 日历和提醒事项。

## 当前状态

项目处于“阶段 0：技术验证”。目前已经建立：

- Expo SDK 57 + React Native + TypeScript 工程；
- 计时、视图、待办、设置四个一级页面；
- SQLite 初始化和第一版核心表；
- 计时状态机起点及单元测试；
- Apple 日历与提醒事项 TypeScript 端口；
- iOS 原生模块目录；
- GitHub Actions 基础检查。

具体状态参见[开发进度.md](./开发进度.md)。

## 文档

- [功能设计方案](./功能设计方案.md)
- [技术设计方案](./技术设计方案.md)
- [开发进度](./开发进度.md)

功能方案是产品需求基线，技术方案是实现规范，开发进度记录当前事实。需求或架构发生改变时，需要同步更新对应文档。

## 环境

- Node.js 24
- pnpm 11
- Expo SDK 57
- React Native 0.86
- iOS 17+

安装：

```bash
pnpm install
```

Windows 上启动 Metro 或 Web 预览：

```bash
pnpm start
pnpm web
```

Mac 上生成并运行 iOS 工程：

```bash
pnpm install
pnpm prebuild:ios
pnpm ios
```

正式开发使用 Development Build，不把 Expo Go 作为 EventKit、通知和自定义原生模块的验证环境。

项目在 pnpm 安装阶段禁用 Skia 的跨平台二进制复制脚本，避免 Windows 复制 Apple XCFramework 时失败；`pnpm prebuild:ios` 会在 Mac 上先执行该脚本。

## 检查

```bash
pnpm check
```

它会依次执行代码规范、TypeScript 检查和单元测试。

## Windows 与 Mac 协作

1. Windows 完成 TypeScript、界面、SQLite、测试和文档。
2. 提交并推送到 GitHub。
3. Mac 拉取相同提交并执行 `pnpm install`。
4. 在 Mac 生成 iOS 工程，开发或验证 Swift 原生模块。
5. 真机结果写回 `开发进度.md`，连同代码一起提交。

`ios/`、`android/`、证书、描述文件和本地密钥不提交。应用配置、数据库迁移、锁文件及 `modules/time-native` 原生模块源码必须提交。

## 许可证

[MIT](./LICENSE)
