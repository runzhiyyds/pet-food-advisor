# 页面发布 Skill

一键发布 H5 页面到 CDN，自动处理资源依赖和路径替换。

## 快速开始

### 1. 安装依赖（仅首次）

```bash
cd .codebuddy/skills/page-deploy && tnpm install
```

### 2. 使用方式

1. 拖入文件夹，说 **"帮我发布这个页面"**
2. 首次使用会引导配置 token（只需配置一次）
3. 之后每次发布只需确认页面名称和环境即可

## 功能特性

- ✅ 自动检测 HTML、CSS、JS、图片资源
- ✅ 自动替换相对路径为 CDN 绝对路径
- ✅ 支持测试环境和正式环境
- ✅ 页面名称确认，避免误覆盖

## 配置说明

首次使用需要申请两个 token：

| 配置项 | 说明 | 申请地址 |
|--------|------|----------|
| 素材上传 token | CDN 资源上传 | https://fupload.woa.com/create |
| 正式域名 token | HTML 页面上传 | https://fupload.woa.com/createnews |

⚠️ **重要**：两次申请时填写的路径必须一致！

## 上传结果

**测试环境**：`https://testqqnews.qq.com/qqfile/<路径>/<页面名>.html`

**正式环境**：`https://h5.news.qq.com/qqfile/<路径>/<页面名>.html`
