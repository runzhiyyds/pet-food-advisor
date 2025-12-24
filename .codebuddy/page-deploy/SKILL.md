---
name: page-deploy
description: 发布 H5 页面（自动处理依赖和路径替换）
---

# 发布 H5 页面

发布用户拖入的 H5 页面文件夹，自动检测依赖、替换路径、上传资源。

**特性：**
- 自动为 JS/CSS 文件添加 hash 后缀，解决浏览器缓存问题
- 发布完成后自动恢复源文件，不影响本地开发

---

## 首次使用 - 配置检查

在上传前，脚本会自动检查配置是否完整。如果配置不完整，会输出包含 `[CONFIG_MISSING_START]` 和 `[CONFIG_MISSING_END]` 标记的 JSON 数据。

### 配置项说明

| 配置项 | 说明 | 申请地址 |
|--------|------|----------|
| TUPLOAD_TOKEN | CDN 上传 token | https://fupload.woa.com/create |
| FUPLOAD_TOKEN | HTML 服务器上传 token | https://fupload.woa.com/createnews |
| FOLDER_NAME | 上传路径名称 | 用户申请时填写的路径 |

### 配置引导流程

当检测到配置缺失时，按以下流程引导用户：

1. **缺少 TUPLOAD_TOKEN**：
   - 引导用户访问 https://fupload.woa.com/create 申请
   - 用户需要填写上传路径（如 `activity/myproject`）并获取 token

2. **缺少 FUPLOAD_TOKEN**：
   - 引导用户访问 https://fupload.woa.com/createnews 申请
   - **重要提示**：用户填写的路径必须与申请 TUPLOAD_TOKEN 时一致

3. **缺少 FOLDER_NAME**：
   - 即用户在申请 token 时填写的路径名称（如 `activity/myproject`）

### 用户反馈格式

引导用户按以下格式提供配置信息：

```
素材上传的token是xxx
正式域名上传的token是xxx
上传路径是xxx
```

收到用户反馈后，解析并执行以下命令自动配置：

```bash
node .codebuddy/skills/page-deploy/scripts/deploy.cjs --set-config TUPLOAD_TOKEN <素材上传的token>
node .codebuddy/skills/page-deploy/scripts/deploy.cjs --set-config FUPLOAD_TOKEN <正式域名上传的token>
node .codebuddy/skills/page-deploy/scripts/deploy.cjs --set-config FOLDER_NAME <上传路径>
```

### 配置完成确认

每次更新配置后，脚本会自动检查剩余缺失项。当所有配置完成时，会输出：
```
🎉 所有配置已完成，可以开始上传了！
```

---

## 使用流程

### 1. 确定发布目录

**情况一：用户已附加文件夹**

直接使用附加的文件夹路径。

**情况二：用户未指定文件夹（如只说"帮我发布页面"）**

自动检测当前项目中可能需要发布的目录，按以下优先级查找包含 `index.html` 的文件夹：

1. `dist/` - 构建输出目录
2. `build/` - 构建输出目录
3. `output/` - 输出目录
4. `public/` - 公共资源目录
5. `www/` - Web 目录
6. `docs/` - 文档目录
7. 项目根目录

检测到后，向用户确认：

```
检测到可能需要发布的目录：`dist/`（包含 index.html）

是否发布此目录？
- 回复"是"或发布环境（test/production）确认发布
- 回复"否"请拖入正确的文件夹
```

**情况三：未检测到可发布目录**

```
未检测到包含 HTML 文件的目录，请拖入要发布的文件夹。
```

### 2. 页面名称确认

默认使用文件夹名称作为页面名称，需要与用户确认：

```
检测到文件夹名称为：xxx
将使用此名称作为页面名称，最终访问地址为：
https://testqqnews.qq.com/qqfile/<FOLDER_NAME>/xxx.html

是否需要修改页面名称？如需修改请输入新名称，否则直接回复"确认"或发布环境（test/production）
```

⚠️ **重要提示**：如果该页面名称已经发布过，再次发布会覆盖之前的内容。如不希望覆盖，请使用新的页面名称。

**环境类型**：
```
请选择发布环境：
```
选项：`test（测试环境）` / `production（正式环境）`

### 2. 检测文件夹结构

分析文件夹内容，期望的文件夹结构：

```
folder/
├── index.html          // 必须存在
├── css/               // CSS 文件目录（可选）
│   └── *.css
├── js/                // JS 文件目录（可选）
│   └── *.js
├── images/            // 图片目录（可选）
│   └── *.png, *.jpg, *.gif, *.svg, *.webp
└── assets/            // 其他资源目录（可选）
    └── *.*
```

### 3. 执行上传

执行以下命令进行发布：

```bash
node .codebuddy/skills/page-deploy/scripts/deploy.cjs <folderPath> <projectName> <env>
```

示例：
```bash
node .codebuddy/skills/page-deploy/scripts/deploy.cjs /Users/xxx/Desktop/myProject myLandingPage test
```

### 4. 上传流程说明

脚本会自动执行以下步骤：

1. **上传图片资源**：上传所有图片到 CDN
2. **替换 CSS 中的图片路径**：将相对路径替换为 CDN 绝对路径
3. **上传 CSS 文件**：上传处理后的 CSS 到 CDN（带 hash 防缓存，如 `style.a1b2c3d4.css`）
4. **替换 JS 中的图片路径**：将相对路径替换为 CDN 绝对路径
5. **上传 JS 文件**：上传处理后的 JS 到 CDN（带 hash 防缓存，如 `main.a1b2c3d4.js`）
6. **替换 HTML 中的资源路径**：将所有资源路径替换为 CDN 绝对路径（使用带 hash 的文件名）
7. **上传 HTML**：上传 HTML 文件到服务器
8. **恢复源文件**：将所有被修改的源文件恢复到发布前状态

> **注意**：每次发布会生成新的 hash，确保二次发布时浏览器不会使用旧的缓存文件。

---

## 上传结果

**测试环境**：
- HTML: `https://testqqnews.qq.com/qqfile/<FOLDER_NAME>/<projectName>.html`
- 资源: `https://mat1.gtimg.com/qqcdn/<FOLDER_NAME>/<projectName>_test/`

**正式环境**：
- HTML: `https://h5.news.qq.com/qqfile/<FOLDER_NAME>/<projectName>.html`
- 资源: `https://mat1.gtimg.com/qqcdn/<FOLDER_NAME>/<projectName>/`

---

## 使用示例

### 示例一：用户拖入文件夹

**用户**：帮我发布这个页面 [拖入文件夹]

**AI**：检测到文件夹：`/Users/xxx/Desktop/myProject`

将使用文件夹名称 **myProject** 作为页面名称，最终访问地址为：
`https://testqqnews.qq.com/qqfile/activity/demo/myProject.html`

⚠️ **注意**：如果该页面已发布过，再次发布会覆盖之前的内容。

请确认：
1. **页面名称**：使用 `myProject` 还是修改为其他名称？
2. **发布环境**：`test`（测试环境）还是 `production`（正式环境）？

**用户**：production

**AI**：发布完成！🎉

**访问地址**：https://h5.news.qq.com/qqfile/activity/demo/myProject.html

---

### 示例二：用户未指定文件夹（自动检测）

**用户**：帮我发布页面

**AI**：（自动检测项目目录）

检测到可能需要发布的目录：`dist/`（包含 index.html 及 3 个资源文件）

是否发布此目录？
- 回复"是"或发布环境（test/production）确认发布
- 回复"否"请拖入正确的文件夹

**用户**：test

**AI**：发布完成！🎉

**访问地址**：https://testqqnews.qq.com/qqfile/activity/demo/dist.html

---

### 示例三：未检测到可发布目录

**用户**：帮我发布页面

**AI**：未检测到包含 HTML 文件的目录。

请拖入要发布的文件夹，或指定目录路径。

---

## 配置参考

### CDN 配置 (tupload)

```javascript
{
  site: 'mat1.gtimg.com',
  baseUrl: '/qqcdn/<FOLDER_NAME>/<projectName>',
  token: '<TUPLOAD_TOKEN>',
}
```

### HTML 服务器配置 (fupload)

```javascript
// 测试环境
{
  site: 'testqqnews.qq.com',
  baseUrl: '/qqfile/<FOLDER_NAME>/<projectName>.html',
  token: '<FUPLOAD_TOKEN>',
}

// 正式环境
{
  site: 'h5.news.qq.com',
  baseUrl: '/qqfile/<FOLDER_NAME>/<projectName>.html',
  token: '<FUPLOAD_TOKEN>',
}
```

---

## 首次使用 - 安装依赖

**重要**：首次使用此 skill 时，需要先安装依赖：

```bash
cd .codebuddy/skills/page-deploy && tnpm install
```

如果遇到权限问题（如 `.tnpm` 目录权限错误），请执行：
```bash
sudo chown -R $(whoami) ~/.tnpm
```

然后重新安装依赖。

---

## 注意事项

1. **文件编码**：确保所有文件使用 UTF-8 编码
2. **路径格式**：使用相对路径引用资源，避免使用绝对路径
3. **图片格式**：支持 png, jpg, jpeg, gif, svg, webp, ico
4. **文件大小**：单个文件不超过 10MB
5. **项目名称**：使用英文、数字和短横线，避免特殊字符
6. **测试优先**：建议先上传到测试环境验证，再发布到正式环境

---

## 错误处理

| 错误 | 原因 | 解决方案 |
|-----|------|---------|
| 文件夹不存在 | 路径错误 | 检查文件夹路径 |
| 未找到 HTML 文件 | 缺少 index.html | 确保文件夹中有 HTML 文件 |
| 上传失败 | 网络问题或权限不足 | 检查网络连接，确认 token 有效 |
| 路径替换失败 | 文件编码问题 | 确保文件使用 UTF-8 编码 |
| 资源找不到 | 相对路径错误 | 检查资源引用路径 |
