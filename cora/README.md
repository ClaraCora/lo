# Cora 外部检测脚本

这里维护 Cora 使用的外部 JavaScript 检测脚本。脚本不会编译进 Cora App，App 启动或手动更新时读取 `manifest.json`，校验脚本摘要后缓存最后一个可用版本。

## 运行时约定

当前脚本使用与 Loon 兼容的最小 API：

- `$environment.params.node`：Cora 注入的目标节点名称。
- `$httpClient.get/post(options, callback)`：请求由 Cora 的 NE 经目标节点执行。
- `$done({ title, htmlMessage })`：完成检测。Cora 会把结果作为纯文本展示，不直接渲染 HTML。
- `console.log/info/warn/error(...)`：兼容 Loon 的日志接口，Cora 运行时会安全忽略日志输出。

脚本仅允许 HTTPS 的 GET、POST、HEAD 请求。每次运行最多 12 个请求，单次响应最多 256 KB；脚本不能访问文件、App Group 或其他原生 API。

## 更新流程

1. 修改脚本并更新 `manifest.json` 中的版本和 SHA-256。
2. 在 Cora 中通过签名 manifest 发布更新。
3. Cora 设置页的“检测脚本”中可以手动检查并更新脚本。
4. App 只有在摘要和签名都通过后才替换本地脚本缓存，下载失败会继续使用上一个版本。

解锁测试优先使用本地缓存，避免每次长按都等待远程仓库；首次安装或用户手动更新时才下载 manifest、签名和脚本。单个检测请求最多等待 15 秒，一次脚本最多运行 45 秒。

根目录的 Loon `.lpx` 和脚本保持原有用途，不依赖 Cora 运行时。
