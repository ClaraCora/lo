# Cora 外部检测脚本

这里维护 Cora 使用的外部 JavaScript 检测脚本。脚本不会编译进 Cora App，App 启动或手动更新时读取 `manifest.json`，校验脚本摘要后缓存最后一个可用版本。

## 当前脚本

- `NodeUnlockDetection.js`：流媒体与 AI 服务可用性检测。
- `NetworkEntryAndExitQueries.js`：显示本机公网 IP、节点入口 IP、入口归属及出口信息。只有本机公网查询由 NE 内置的固定 DIRECT 接口执行；脚本的其他 HTTP 请求仍经过所选节点。
- `IPQualityDetection.js`：查询出口 IP 的网络属性、住宅/机房、广播和风险信息，并检测 Google 的 IP 定位、是否“送中”及 Gemini 解锁状态。

脚本输出按检测项目逐行返回，只保留必要字段，避免把完整 API 响应带入 Network Extension。新增脚本时，除了更新清单，还应在节点长按菜单中确认脚本名称和 SF Symbol 图标正确显示。`direct-network-info` 是受限能力：它不允许脚本直接发起请求，只允许读取 NE 通过固定公网接口得到的本机网络摘要。

## 运行时约定

当前脚本使用与 Loon 兼容的最小 API：

- `$environment.params.node`：Cora 注入的目标节点名称。
- `$httpClient.get/post(options, callback)`：请求由 Cora 的 NE 经目标节点执行。
- `$done({ title, htmlMessage })`：完成检测。Cora 会把结果作为纯文本展示，不直接渲染 HTML。
- `console.log/info/warn/error(...)`：兼容 Loon 的日志接口，Cora 运行时会安全忽略日志输出。

脚本仅允许 HTTPS 的 GET、POST、HEAD 请求。每次运行最多 12 个请求，单次响应最多 256 KB；脚本不能访问文件、App Group 或其他原生 API。

## 更新流程

1. 修改脚本并更新 `manifest.json` 中的版本和 SHA-256。
2. 对 manifest 原始 UTF-8 字节重新签名并更新 `manifest.sig`。
3. Cora 设置页的“检测脚本”中可以手动检查并更新脚本。
4. App 只有在摘要和签名都通过后才替换本地脚本缓存，下载失败会继续使用上一个版本。

解锁测试优先使用本地缓存，避免每次长按都等待远程仓库；首次安装或用户手动更新时才下载 manifest、签名和脚本。单个检测请求最多等待 15 秒，一次脚本最多运行 45 秒。

根目录的 Loon `.lpx` 和脚本保持原有用途，不依赖 Cora 运行时。

## Google 与 Gemini 检测

IP 质量检测 1.1.0 使用三个并行 HTTPS 请求，每项最多等待 10 秒：

- IPPure 提供 IP 质量字段，缺失或异常的风险分数显示“未知”。
- Google 的 `K4WWud` 接口提供出口 IP 定位。仅接受明确来自互联网地址的结果；中国大陆显示“已送中”，港澳台单独识别，无可识别国家/地区时显示“无法判断”。
- Gemini 网页的可用性标记或明确地区限制提示用于判断解锁，不用其他服务的地区白名单推测。403、429、验证码、登录页、缺少标记等情况显示检测受限或无法判断。

任何一项失败都保留其他项目结果。Gemini 是未登录检测，实际使用还受 Google 账号、年龄等条件影响；Google 更改接口或标记后可能需要更新脚本。结果不返回网页正文或原始接口对象，兼容 NE 的响应和请求数量限制。

更新推送后，可在 Cora 设置页的“检测脚本”中检查更新，再执行节点的 IP 质量检测。
