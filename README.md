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
- 风险系数
- 风险评级
- Google 识别的出口 IP 地区
- Google 是否“送中”（是否定位为中国大陆）
- Gemini 是否解锁（匿名网页检测）

接口来源：

```text
https://my.ippure.com/v1/info
```

Google 定位通过 Gemini 的 `K4WWud` 接口读取明确标记为“来自互联网地址”的结果，和 IPPure 的数据库地区分别显示。港澳台地区不会因为地址带有 `China` 后缀而被判作中国大陆；只有城市、无可识别国家/地区时显示“无法判断”。

Gemini 直接检查其网页的可用性标记和地区限制提示。HTTP 200、登录页或其他服务的地区信息都不会单独作为解锁依据。403、429、验证码及未知页面会显示检测受限或无法判断。此项是未登录的网络可用性检测，实际使用还受 Google 账号、年龄等条件影响；Google 更改接口或标记后可能需要更新脚本。

三项请求并行，经所选节点执行，单项超时 10 秒。任一接口失败仍显示其他结果；缺失或异常的风险分数显示“未知”。Loon 和 `cora/` 版本使用相同检测逻辑，结果只保留核心字段。

## 验证

需要 Node.js 18 或更高版本，无第三方依赖：

```sh
node --test tests/ip-quality.test.js
```

测试覆盖中国大陆和港澳台定位、Gemini 可用性和受限页面、请求失败、异常风险分数、HTML 转义，以及 Cora 清单摘要和签名校验。

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
