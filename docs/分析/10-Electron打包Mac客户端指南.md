# Electron 打包 Mac 客户端指南

本文档详细介绍如何将 ShipAny Next.js 项目使用 Electron 打包成 macOS 客户端应用。

## 目录

1. [方案概述](#方案概述)
2. [环境准备](#环境准备)
3. [安装依赖](#安装依赖)
4. [项目结构调整](#项目结构调整)
5. [配置文件](#配置文件)
6. [开发调试](#开发调试)
7. [打包构建](#打包构建)
8. [Mac 签名与公证](#mac-签名与公证)
9. [常见问题](#常见问题)

---

## 方案概述

### 技术选型

| 工具 | 版本 | 用途 |
|------|------|------|
| Electron | ^32.0.0 | 桌面应用框架 |
| electron-builder | ^25.0.0 | 打包工具 |
| concurrently | ^9.0.0 | 并行运行命令 |
| wait-on | ^8.0.0 | 等待服务就绪 |

### 集成方案

由于本项目是 Next.js 全栈应用（包含 API 路由和数据库操作），推荐使用 **内嵌 Next.js 服务器** 方案：

```
┌─────────────────────────────────────┐
│         Electron 主进程              │
│  ┌─────────────────────────────┐    │
│  │    Next.js 独立服务器        │    │
│  │    (standalone mode)        │    │
│  └─────────────────────────────┘    │
│              ↓                      │
│  ┌─────────────────────────────┐    │
│  │    BrowserWindow            │    │
│  │    加载 localhost:3000       │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 环境准备

### 系统要求

- macOS 10.15+ (Catalina 或更高版本)
- Node.js 18+
- pnpm 8+
- Xcode Command Line Tools (用于签名)

### 安装 Xcode CLI

```bash
xcode-select --install
```

---

## 安装依赖

### 1. 安装 Electron 及相关包

```bash
pnpm add -D electron electron-builder concurrently wait-on cross-env
```

### 2. 安装辅助工具

```bash
pnpm add electron-serve electron-store
```

完整的 devDependencies 更新：

```json
{
  "devDependencies": {
    "electron": "^32.2.0",
    "electron-builder": "^25.1.8",
    "concurrently": "^9.1.0",
    "wait-on": "^8.0.1",
    "cross-env": "^7.0.3"
  },
  "dependencies": {
    "electron-serve": "^2.1.1",
    "electron-store": "^10.0.0"
  }
}
```

---

## 项目结构调整

### 创建 Electron 相关目录

```bash
mkdir -p electron
```

### 最终项目结构

```
shipany-template/
├── electron/
│   ├── main.js           # Electron 主进程
│   ├── preload.js        # 预加载脚本
│   └── utils/
│       └── server.js     # Next.js 服务器管理
├── src/                  # Next.js 源代码
├── public/
│   └── icons/            # 应用图标
│       ├── icon.icns     # macOS 图标
│       ├── icon.png      # 通用图标
│       └── icon.ico      # Windows 图标
├── package.json
├── electron-builder.yml  # 打包配置
└── ...
```

---

## 配置文件

### 1. Electron 主进程 (`electron/main.js`)

```javascript
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 环境判断
const isDev = !app.isPackaged;
const PORT = process.env.PORT || 3000;

let mainWindow = null;
let serverProcess = null;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'ShipAny',
    titleBarStyle: 'hiddenInset', // macOS 特有的标题栏样式
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icons/icon.png'),
    show: false, // 先隐藏，加载完成后再显示
  });

  // 加载应用
  const url = isDev
    ? `http://localhost:${PORT}`
    : `http://localhost:${PORT}`;

  mainWindow.loadURL(url);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 外部链接用默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 开发模式打开 DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 启动 Next.js 服务器 (生产模式)
async function startNextServer() {
  if (isDev) {
    // 开发模式下假设 Next.js 已经在运行
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const serverPath = path.join(
      process.resourcesPath,
      'standalone',
      'server.js'
    );

    // 设置环境变量
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString(),
    };

    serverProcess = spawn('node', [serverPath], {
      cwd: path.join(process.resourcesPath, 'standalone'),
      env,
      stdio: 'pipe',
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
      if (data.toString().includes('Ready')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    // 超时处理
    setTimeout(() => {
      resolve(); // 即使没有收到 Ready 信号也继续
    }, 10000);
  });
}

// 停止 Next.js 服务器
function stopNextServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// 应用启动
app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start application:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时
app.on('window-all-closed', () => {
  stopNextServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  stopNextServer();
});

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
```

### 2. 预加载脚本 (`electron/preload.js`)

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 获取平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // 判断是否在 Electron 环境中
  isElectron: true,

  // 发送消息到主进程
  send: (channel, data) => {
    const validChannels = ['app-event', 'window-control'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // 接收来自主进程的消息
  receive: (channel, func) => {
    const validChannels = ['app-update', 'app-notification'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
```

### 3. package.json 脚本更新

```json
{
  "name": "shipany-template-two",
  "version": "1.6.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",

    "electron:dev": "concurrently -n next,electron \"pnpm dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "pnpm build && electron-builder --mac",
    "electron:build:dmg": "pnpm build && electron-builder --mac dmg",
    "electron:build:pkg": "pnpm build && electron-builder --mac pkg",
    "electron:build:mas": "pnpm build && electron-builder --mac mas",

    "postinstall": "fumadocs-mdx && electron-builder install-app-deps"
  }
}
```

### 4. electron-builder 配置 (`electron-builder.yml`)

```yaml
appId: com.shipany.app
productName: ShipAny
copyright: Copyright © 2024 ShipAny.ai

# 目录配置
directories:
  output: dist-electron
  buildResources: build

# 文件包含配置
files:
  - electron/**/*
  - "!node_modules"
  - "!src"
  - "!content"
  - "!docs"
  - "!.next"
  - "!.git"

# 额外资源 - Next.js standalone 输出
extraResources:
  - from: .next/standalone
    to: standalone
    filter:
      - "**/*"
  - from: .next/static
    to: standalone/.next/static
    filter:
      - "**/*"
  - from: public
    to: standalone/public
    filter:
      - "**/*"
      - "!icons"

# macOS 配置
mac:
  category: public.app-category.productivity
  icon: public/icons/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  darkModeSupport: true

# DMG 配置
dmg:
  background: build/background.png
  icon: public/icons/icon.icns
  iconSize: 100
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
  window:
    width: 540
    height: 380

# Mac App Store 配置 (可选)
mas:
  category: public.app-category.productivity
  entitlements: build/entitlements.mas.plist
  entitlementsInherit: build/entitlements.mas.inherit.plist
  provisioningProfile: build/embedded.provisionprofile

# 发布配置
publish:
  provider: github
  releaseType: release

# 构建选项
buildDependenciesFromSource: false
nodeGypRebuild: false
npmRebuild: true
```

### 5. macOS 权限文件 (`build/entitlements.mac.plist`)

创建 `build` 目录并添加权限文件：

```bash
mkdir -p build
```

`build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

### 6. 修改 Next.js 配置 (`next.config.mjs`)

确保始终使用 standalone 模式输出：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 修改为始终使用 standalone
  // ... 其他配置
};
```

---

## 开发调试

### 启动开发模式

```bash
# 同时启动 Next.js 和 Electron
pnpm electron:dev
```

这将：
1. 启动 Next.js 开发服务器 (http://localhost:3000)
2. 等待服务器就绪
3. 启动 Electron 并加载应用

### 调试技巧

1. **打开 DevTools**: 开发模式下自动打开，或使用快捷键 `Cmd + Option + I`

2. **重新加载**: `Cmd + R`

3. **查看主进程日志**: 终端中查看 Electron 输出

---

## 打包构建

### 1. 创建应用图标

需要准备以下图标文件：

```bash
# 创建图标目录
mkdir -p public/icons

# 需要的图标文件:
# - icon.icns (macOS, 至少 512x512)
# - icon.png (1024x1024 推荐)
```

**生成 .icns 文件的方法**:

```bash
# 准备一个 1024x1024 的 PNG 图片

# 创建 iconset 目录
mkdir icon.iconset

# 生成各种尺寸
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# 生成 icns 文件
iconutil -c icns icon.iconset -o public/icons/icon.icns

# 清理
rm -rf icon.iconset
```

### 2. 构建应用

```bash
# 构建 DMG 安装包 (推荐用于分发)
pnpm electron:build:dmg

# 构建 ZIP 包
pnpm electron:build

# 构建 PKG 安装包
pnpm electron:build:pkg
```

### 3. 输出位置

构建完成后，输出文件位于：

```
dist-electron/
├── ShipAny-1.6.0.dmg          # DMG 安装包
├── ShipAny-1.6.0-arm64.dmg    # Apple Silicon 版本
├── ShipAny-1.6.0-x64.dmg      # Intel 版本
├── ShipAny-1.6.0-mac.zip      # ZIP 包
└── mac/                        # 解压的应用
    └── ShipAny.app
```

---

## Mac 签名与公证

### 为什么需要签名？

从 macOS 10.15 开始，未签名的应用会被 Gatekeeper 阻止运行。用户会看到"无法打开应用，因为它来自身份不明的开发者"警告。

### 1. 获取开发者证书

1. 注册 [Apple Developer Program](https://developer.apple.com/programs/) ($99/年)
2. 在 Xcode 或 Apple Developer 网站创建证书：
   - **Developer ID Application**: 用于分发到 Mac App Store 之外
   - **Mac App Distribution**: 用于 Mac App Store

### 2. 配置签名

在 `electron-builder.yml` 中添加：

```yaml
mac:
  identity: "Developer ID Application: Your Company Name (TEAM_ID)"
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
```

### 3. 公证 (Notarization)

公证是 Apple 的安全检查流程，可以让用户顺利打开应用。

在 `electron-builder.yml` 中添加：

```yaml
afterSign: scripts/notarize.js
```

创建 `scripts/notarize.js`:

```javascript
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log('Notarization complete!');
};
```

安装公证依赖：

```bash
pnpm add -D @electron/notarize
```

设置环境变量：

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # 在 appleid.apple.com 生成
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### 4. 不签名的临时解决方案

如果只是测试或内部使用，用户可以：

```bash
# 移除 quarantine 属性
xattr -cr /Applications/ShipAny.app

# 或者在系统偏好设置 > 安全性与隐私 中允许打开
```

---

## 常见问题

### Q1: 应用启动时显示白屏

**原因**: Next.js 服务器尚未完全启动

**解决方案**:
1. 增加等待超时时间
2. 在 main.js 中添加加载动画
3. 检查端口是否被占用

### Q2: 打包后应用体积过大

**原因**: 包含了不必要的文件

**解决方案**:
1. 检查 `electron-builder.yml` 的 files 配置
2. 使用 `.npmrc` 设置 `node-linker=hoisted`
3. 排除开发依赖

```yaml
files:
  - "!**/*.{ts,tsx,map}"
  - "!**/node_modules/*/{README.md,readme.md,changelog.md}"
  - "!**/node_modules/.cache"
```

### Q3: Apple Silicon 和 Intel 兼容性

**解决方案**: 构建通用二进制 (Universal Binary)

```yaml
mac:
  target:
    - target: dmg
      arch:
        - universal  # 同时支持 x64 和 arm64
```

### Q4: 环境变量无法读取

**原因**: Electron 打包后无法读取 `.env` 文件

**解决方案**:
1. 在构建时将环境变量嵌入
2. 使用 `electron-store` 存储配置
3. 创建配置文件打包进应用

### Q5: 数据库连接问题

**原因**: SQLite 等本地数据库路径问题

**解决方案**:
```javascript
const { app } = require('electron');
const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
```

### Q6: 自动更新

推荐使用 `electron-updater`:

```bash
pnpm add electron-updater
```

```javascript
// main.js
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

---

## 完整命令参考

```bash
# 开发
pnpm electron:dev          # 启动开发环境

# 构建
pnpm electron:build        # 构建 zip + dmg
pnpm electron:build:dmg    # 仅构建 DMG
pnpm electron:build:pkg    # 构建 PKG
pnpm electron:build:mas    # 构建 Mac App Store 版本

# 调试
DEBUG=electron-builder pnpm electron:build  # 查看详细构建日志
```

---

## 参考资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Next.js Standalone 输出](https://nextjs.org/docs/app/building-your-application/deploying#self-hosting)
- [Apple 开发者文档 - 公证](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron + Next.js 最佳实践](https://github.com/nicholascelestin/electron-nextjs-example)

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2024-12-16 | 1.0 | 初始版本 |
