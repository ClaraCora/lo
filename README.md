# Loon 节点检测工具

用于 Loon 节点页长按节点后执行的节点检测插件，包含以下功能：

- 入口落地查询
- 地理位置查询
- 节点解锁查询
- IP 纯净度查询

## 文件说明

- `LocationDetection.js`：地理位置查询
- `NetworkEntryAndExitQueries.js`：入口落地查询
- `NodeUnlockDetection.js`：节点解锁查询
- `IPQualityDetection.js`：IP 纯净度查询
- `NodeDetectionTool.lpx`：Loon 插件文件

## 使用方式

### 方式一：直接导入 LPX

将下面链接替换成你仓库实际 raw 地址后，在 Loon 中导入：

```text
https://raw.githubusercontent.com/ClaraCora/lo/main/NodeDetectionTool.lpx
```

### 方式二：手动添加脚本

在 Loon 插件或脚本配置中添加以下 generic 项：

```ini
generic script-path=https://raw.githubusercontent.com/ClaraCora/lo/main/NetworkEntryAndExitQueries.js, timeout=10, tag=入口落地查询, img-url=globe.asia.australia.system
generic script-path=https://raw.githubusercontent.com/ClaraCora/lo/main/LocationDetection.js, timeout=10, tag=地理位置查询, img-url=location.circle.system
generic script-path=https://raw.githubusercontent.com/ClaraCora/lo/main/NodeUnlockDetection.js, timeout=20, tag=节点解锁查询, img-url=play.circle.system
generic script-path=https://raw.githubusercontent.com/ClaraCora/lo/main/IPQualityDetection.js, timeout=15, tag=IP纯净度查询, img-url=network.badge.shield.half.filled
```

## 说明

### IP 纯净度查询

`IPQualityDetection.js` 当前通过 IPPure 公共接口获取信息：

- 出口 IP
- 地区 / 国旗
- 时区
- ASN / ASN 机构
- 是否原生 IP（近似判断）
- 住宅 / 机房属性
- 是否住宅 IP
- 是否广播 IP
- 人机流量比（若接口未返回则显示 API 未提供）
- 风险系数
- 风险评级

接口来源：

```text
https://my.ippure.com/v1/info
```

## 仓库结构建议

```text
.
├── README.md
├── NodeDetectionTool.lpx
├── LocationDetection.js
├── NetworkEntryAndExitQueries.js
├── NodeUnlockDetection.js
└── IPQualityDetection.js
```

## 注意

如果你的默认分支不是 `main`，把 README 和 LPX 里的引用地址一起改掉。
