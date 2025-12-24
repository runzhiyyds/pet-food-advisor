/**
 * 页面发布脚本
 * 用法: 
 *   发布页面: node deploy.cjs <folderPath> <projectName> <env>
 *   更新配置: node deploy.cjs --set-config <key> <value>
 *
 * 功能：
 * 1. 检测 HTML 依赖资源（图片、JS、CSS）
 * 2. 上传图片到 CDN
 * 3. 替换 CSS/JS 中的图片路径为 CDN 绝对路径
 * 4. 上传 CSS/JS 到 CDN（带 hash 防缓存）
 * 5. 替换 HTML 中的资源路径为 CDN 绝对路径
 * 6. 上传 HTML 到服务器
 * 7. 恢复源文件到发布前状态
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 生成随机 hash（8位）
 */
function generateHash() {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * 为文件名添加 hash
 * @param {string} filename - 原始文件名
 * @param {string} hash - hash 值
 * @returns {string} 带 hash 的文件名
 */
function addHashToFilename(filename, hash) {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const dir = path.dirname(filename);
  return path.join(dir, `${name}.${hash}${ext}`);
}

// 文件备份存储（用于发布后恢复）
const fileBackups = new Map();

/**
 * 备份文件内容
 * @param {string} filePath - 文件路径
 */
function backupFile(filePath) {
  if (!fileBackups.has(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    fileBackups.set(filePath, content);
  }
}

/**
 * 恢复所有备份的文件
 */
function restoreAllFiles() {
  for (const [filePath, content] of fileBackups) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * 检查依赖是否已安装
 */
function checkDependencies() {
  const deps = ['@tencent/tupload2', '@tencent/fupload', 'chalk'];
  const missingDeps = [];

  for (const dep of deps) {
    try {
      require.resolve(dep);
    } catch (e) {
      missingDeps.push(dep);
    }
  }

  if (missingDeps.length > 0) {
    console.error(`\n❌ 缺失依赖: ${missingDeps.join(', ')}`);
    console.error('\n请先安装依赖：');
    console.error('  cd .codebuddy/skills/page-deploy && tnpm install');
    console.error('\n如果遇到权限问题，请执行：');
    console.error('  sudo chown -R $(whoami) ~/.tnpm');
    console.error('');
    process.exit(1);
  }
}

// 检查依赖
checkDependencies();

// 依赖检查通过后再加载
const chalk = require('chalk');
const { IMAGE_EXTS, CSS_EXTS, JS_EXTS, getUploadConfig, getCdnBase, checkConfig, updateConfig } = require('../config.cjs');

// 命令行参数
const args = process.argv.slice(2);

// 处理 --set-config 命令
if (args[0] === '--set-config') {
  const key = args[1];
  const value = args[2];
  
  if (!key || !value) {
    console.log(chalk.red('用法: node deploy.cjs --set-config <key> <value>'));
    console.log(chalk.yellow('  key: TUPLOAD_TOKEN, FUPLOAD_TOKEN, 或 FOLDER_NAME'));
    console.log(chalk.yellow('  value: 对应的值'));
    process.exit(1);
  }
  
  const validKeys = ['TUPLOAD_TOKEN', 'FUPLOAD_TOKEN', 'FOLDER_NAME'];
  if (!validKeys.includes(key)) {
    console.log(chalk.red(`无效的配置项: ${key}`));
    console.log(chalk.yellow(`有效的配置项: ${validKeys.join(', ')}`));
    process.exit(1);
  }
  
  updateConfig(key, value);
  console.log(chalk.green(`✅ 已更新配置: ${key} = ${value}`));
  
  // 重新检查配置
  // 需要重新加载模块以获取最新值
  delete require.cache[require.resolve('../config.cjs')];
  const { checkConfig: recheckConfig } = require('../config.cjs');
  const configStatus = recheckConfig();
  
  if (configStatus.valid) {
    console.log(chalk.green('\n🎉 所有配置已完成，可以开始上传了！'));
  } else {
    console.log(chalk.yellow(`\n还需要配置: ${configStatus.missing.join(', ')}`));
  }
  
  process.exit(0);
}

// 检查配置是否完整
const configStatus = checkConfig();
if (!configStatus.valid) {
  console.log(chalk.red('\n❌ 配置不完整，无法上传'));
  console.log(chalk.yellow('\n缺少以下配置项：'));
  
  // 输出特殊格式，供 AI 识别并引导用户
  console.log('\n[CONFIG_MISSING_START]');
  console.log(JSON.stringify({
    missing: configStatus.missing,
    instructions: {
      TUPLOAD_TOKEN: {
        description: 'CDN 上传 token',
        applyUrl: 'https://fupload.woa.com/create',
        note: '请在申请页面填写上传路径，获取 token 后提供给我'
      },
      FUPLOAD_TOKEN: {
        description: 'HTML 服务器上传 token',
        applyUrl: 'https://fupload.woa.com/createnews',
        note: '请确保填写的路径与 TUPLOAD_TOKEN 申请时一致，获取 token 后提供给我'
      },
      FOLDER_NAME: {
        description: '上传路径名称',
        note: '请提供你在申请 token 时填写的路径名称（两次申请需一致）'
      }
    }
  }, null, 2));
  console.log('[CONFIG_MISSING_END]');
  
  console.log(chalk.cyan('\n请按以下步骤操作：'));
  
  if (configStatus.missing.includes('TUPLOAD_TOKEN')) {
    console.log(chalk.white('\n1. 申请 TUPLOAD_TOKEN（CDN 上传 token）：'));
    console.log(chalk.blue('   访问: https://fupload.woa.com/create'));
    console.log(chalk.gray('   填写上传路径后获取 token'));
  }
  
  if (configStatus.missing.includes('FUPLOAD_TOKEN')) {
    console.log(chalk.white('\n2. 申请 FUPLOAD_TOKEN（HTML 服务器上传 token）：'));
    console.log(chalk.blue('   访问: https://fupload.woa.com/createnews'));
    console.log(chalk.red('   ⚠️ 重要：填写的路径必须与上一步一致！'));
  }
  
  if (configStatus.missing.includes('FOLDER_NAME')) {
    console.log(chalk.white('\n3. 提供 FOLDER_NAME（上传路径名称）：'));
    console.log(chalk.gray('   即你在申请 token 时填写的路径名称'));
  }
  
  console.log(chalk.cyan('\n获取后，请按以下格式告诉我：'));
  console.log(chalk.white('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('素材上传的token是xxx'));
  console.log(chalk.green('正式域名上传的token是xxx'));
  console.log(chalk.green('上传路径是xxx'));
  console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.gray('\n（将 xxx 替换为你申请到的实际值）'));
  console.log('');
  
  process.exit(1);
}

const tupload = require('@tencent/tupload2');
const fupload = require('@tencent/fupload');

const [folderPath, projectName, env = 'test'] = args;

if (!folderPath || !projectName) {
  console.log(chalk.red('用法: node deploy.cjs <folderPath> <projectName> [env]'));
  console.log(chalk.yellow('  folderPath: 要上传的文件夹路径'));
  console.log(chalk.yellow('  projectName: 项目名称（用于 CDN 路径）'));
  console.log(chalk.yellow('  env: 环境类型，test 或 production（默认 test）'));
  process.exit(1);
}

// 配置
const config = getUploadConfig(projectName, env);
const cdnBase = getCdnBase(config);

/**
 * 递归查找指定扩展名的文件
 */
function findFiles(dir, extensions, basePath = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('.')) continue; // 跳过隐藏文件

    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results.push(...findFiles(filePath, extensions, basePath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        results.push({
          absolutePath: filePath,
          relativePath: path.relative(basePath, filePath),
        });
      }
    }
  }
  return results;
}

/**
 * 上传文件到 tupload (CDN)
 */
async function uploadToTupload(filePath, relativePath) {
  const uploadPath = `${config.tupload.baseUrl}/${relativePath}`;
  console.log(chalk.yellow(`  上传: ${relativePath}`));

  try {
    const res = await tupload.upload(filePath, uploadPath, config.tupload);
    if (Number(res.ret) !== 0) {
      console.log(chalk.red(`    失败: ${res.msg}`));
      return false;
    }
    console.log(chalk.green(`    成功: ${cdnBase}/${relativePath}`));
    return true;
  } catch (e) {
    console.log(chalk.red(`    错误: ${e.message}`));
    return false;
  }
}

/**
 * 上传文件到 fupload (HTML 服务器)
 */
async function uploadToFupload(filePath) {
  console.log(chalk.yellow(`  上传 HTML: ${path.basename(filePath)}`));

  try {
    const res = await fupload.upload(filePath, config.fupload.baseUrl, config.fupload);
    if (res.code === 0) {
      console.log(chalk.green(`    成功: ${res.url}`));
      return res;
    }
    console.log(chalk.red(`    失败: ${res.msg || JSON.stringify(res)}`));
    return null;
  } catch (e) {
    console.log(chalk.red(`    错误: ${e.message}`));
    return null;
  }
}

/**
 * 替换 CSS 中的图片路径
 */
function replaceCssImagePaths(cssPath, imageMap) {
  // 备份原始内容
  backupFile(cssPath);
  
  let content = fs.readFileSync(cssPath, 'utf-8');
  let replaced = false;

  // 替换 url() 中的相对路径
  content = content.replace(/url\(["']?([^"')]+)["']?\)/g, (match, url) => {
    // 跳过 data: 和 http(s): 开头的 URL
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return match;
    }

    // 解析相对路径
    const cssDir = path.dirname(cssPath);
    const absoluteUrl = path.resolve(cssDir, url);
    const relativeToFolder = path.relative(folderPath, absoluteUrl);

    // 检查是否在 imageMap 中
    if (imageMap[relativeToFolder]) {
      replaced = true;
      return `url(${cdnBase}/${relativeToFolder})`;
    }

    // 尝试匹配简化路径
    const simplePath = url.replace(/^\.\.?\/?/, '');
    for (const key of Object.keys(imageMap)) {
      if (key.endsWith(simplePath) || key === simplePath) {
        replaced = true;
        return `url(${cdnBase}/${key})`;
      }
    }

    return match;
  });

  if (replaced) {
    fs.writeFileSync(cssPath, content, 'utf-8');
    console.log(chalk.cyan(`  已替换: ${path.relative(folderPath, cssPath)}`));
  }

  return replaced;
}

/**
 * 替换 JS 中的图片路径
 */
function replaceJsImagePaths(jsPath, imageMap) {
  // 备份原始内容
  backupFile(jsPath);
  
  let content = fs.readFileSync(jsPath, 'utf-8');
  let replaced = false;

  // 替换字符串中的图片路径
  const imageExtPattern = IMAGE_EXTS.map(ext => ext.slice(1)).join('|');
  const regex = new RegExp(`["']([^"']*\\.(${imageExtPattern}))["']`, 'gi');

  content = content.replace(regex, (match, url) => {
    // 跳过已经是绝对路径的 URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('data:')) {
      return match;
    }

    // 解析相对路径
    const jsDir = path.dirname(jsPath);
    const absoluteUrl = path.resolve(jsDir, url);
    const relativeToFolder = path.relative(folderPath, absoluteUrl);

    // 检查是否在 imageMap 中
    if (imageMap[relativeToFolder]) {
      replaced = true;
      const quote = match[0];
      return `${quote}${cdnBase}/${relativeToFolder}${quote}`;
    }

    // 尝试匹配简化路径
    const simplePath = url.replace(/^\.\.?\/?/, '');
    for (const key of Object.keys(imageMap)) {
      if (key.endsWith(simplePath) || key === simplePath) {
        replaced = true;
        const quote = match[0];
        return `${quote}${cdnBase}/${key}${quote}`;
      }
    }

    return match;
  });

  if (replaced) {
    fs.writeFileSync(jsPath, content, 'utf-8');
    console.log(chalk.cyan(`  已替换: ${path.relative(folderPath, jsPath)}`));
  }

  return replaced;
}

/**
 * 替换 HTML 中的资源路径
 * @param {string} htmlPath - HTML 文件路径
 * @param {object} resourceMap - 资源映射表 { 原始路径: { uploaded: true, hashedPath?: string } }
 */
function replaceHtmlPaths(htmlPath, resourceMap) {
  // 备份原始内容
  backupFile(htmlPath);
  
  let content = fs.readFileSync(htmlPath, 'utf-8');

  // 替换 CSS 引用 (href)
  content = content.replace(/href=[\"']([^\"']+\.css)[\"']/gi, (match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return match;
    }
    const simplePath = url.replace(/^\.?\/?/, '');
    const resource = resourceMap[simplePath];
    if (resource && resource.hashedPath) {
      return `href="${cdnBase}/${resource.hashedPath}"`;
    }
    return match;
  });

  // 替换 JS 引用 (src)
  content = content.replace(/src=[\"']([^\"']+\.js)[\"']/gi, (match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return match;
    }
    const simplePath = url.replace(/^\.?\/?/, '');
    const resource = resourceMap[simplePath];
    if (resource && resource.hashedPath) {
      return `charset="utf-8" src="${cdnBase}/${resource.hashedPath}"`;
    }
    return match;
  });

  // 替换图片引用 (src)
  const imageExtPattern = IMAGE_EXTS.map(ext => ext.slice(1)).join('|');
  const imgRegex = new RegExp(`src=[\"']([^\"']+\\.(${imageExtPattern}))[\"']`, 'gi');
  content = content.replace(imgRegex, (match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('data:')) {
      return match;
    }
    const simplePath = url.replace(/^\.?\/?/, '');
    if (resourceMap[simplePath]) {
      return `src="${cdnBase}/${simplePath}"`;
    }

    for (const key of Object.keys(resourceMap)) {
      if (key.endsWith(simplePath) || simplePath.endsWith(key)) {
        return `src="${cdnBase}/${key}"`;
      }
    }
    return match;
  });

  // 替换 CSS 中的背景图 (style 属性)
  content = content.replace(/url\([\"']?([^\"')]+)[\"']?\)/g, (match, url) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('data:')) {
      return match;
    }
    const simplePath = url.replace(/^\.?\/?/, '');
    if (resourceMap[simplePath]) {
      return `url(${cdnBase}/${simplePath})`;
    }
    for (const key of Object.keys(resourceMap)) {
      if (key.endsWith(simplePath) || simplePath.endsWith(key)) {
        return `url(${cdnBase}/${key})`;
      }
    }
    return match;
  });

  fs.writeFileSync(htmlPath, content, 'utf-8');
  console.log(chalk.cyan(`  已替换: ${path.relative(folderPath, htmlPath)}`));
}

/**
 * 主函数
 */
async function main() {
  // 生成本次发布的 hash
  const deployHash = generateHash();
  
  console.log(chalk.green('┏━━━ 🚀 页面发布 ━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green(`文件夹: ${folderPath}`));
  console.log(chalk.green(`页面名称: ${projectName}`));
  console.log(chalk.green(`环境: ${env}`));
  console.log(chalk.green(`CDN 路径: ${cdnBase}`));
  console.log(chalk.green(`本次 Hash: ${deployHash}`));
  console.log('');

  // 检查文件夹是否存在
  if (!fs.existsSync(folderPath)) {
    console.log(chalk.red(`文件夹不存在: ${folderPath}`));
    process.exit(1);
  }

  // 查找 HTML 文件
  const htmlFiles = findFiles(folderPath, ['.html', '.htm']);
  if (htmlFiles.length === 0) {
    console.log(chalk.red('未找到 HTML 文件'));
    process.exit(1);
  }

  // 查找所有资源文件
  const imageFiles = findFiles(folderPath, IMAGE_EXTS);
  const cssFiles = findFiles(folderPath, CSS_EXTS);
  const jsFiles = findFiles(folderPath, JS_EXTS);

  console.log(chalk.blue('检测到的资源:'));
  console.log(`  HTML: ${htmlFiles.length} 个文件`);
  console.log(`  CSS: ${cssFiles.length} 个文件`);
  console.log(`  JS: ${jsFiles.length} 个文件`);
  console.log(`  图片: ${imageFiles.length} 个文件`);
  console.log('');

  // 资源映射表 { 原始路径: { uploaded: true, hashedPath?: string } }
  const resourceMap = {};

  try {
    // Step 1: 上传图片（图片不需要 hash，因为内容不变）
    console.log(chalk.blue('Step 1: 上传图片资源'));
    for (const img of imageFiles) {
      const success = await uploadToTupload(img.absolutePath, img.relativePath);
      if (success) {
        resourceMap[img.relativePath] = { uploaded: true };
      }
    }
    console.log('');

    // Step 2: 替换 CSS 中的图片路径
    console.log(chalk.blue('Step 2: 替换 CSS 中的图片路径'));
    for (const css of cssFiles) {
      replaceCssImagePaths(css.absolutePath, resourceMap);
    }
    console.log('');

    // Step 3: 上传 CSS（带 hash）
    console.log(chalk.blue('Step 3: 上传 CSS 文件（带 hash 防缓存）'));
    for (const css of cssFiles) {
      const hashedRelativePath = addHashToFilename(css.relativePath, deployHash);
      const success = await uploadToTupload(css.absolutePath, hashedRelativePath);
      if (success) {
        resourceMap[css.relativePath] = { uploaded: true, hashedPath: hashedRelativePath };
      }
    }
    console.log('');

    // Step 4: 替换 JS 中的图片路径
    console.log(chalk.blue('Step 4: 替换 JS 中的图片路径'));
    for (const js of jsFiles) {
      replaceJsImagePaths(js.absolutePath, resourceMap);
    }
    console.log('');

    // Step 5: 上传 JS（带 hash）
    console.log(chalk.blue('Step 5: 上传 JS 文件（带 hash 防缓存）'));
    for (const js of jsFiles) {
      const hashedRelativePath = addHashToFilename(js.relativePath, deployHash);
      const success = await uploadToTupload(js.absolutePath, hashedRelativePath);
      if (success) {
        resourceMap[js.relativePath] = { uploaded: true, hashedPath: hashedRelativePath };
      }
    }
    console.log('');

    // Step 6: 替换 HTML 中的资源路径
    console.log(chalk.blue('Step 6: 替换 HTML 中的资源路径'));
    for (const html of htmlFiles) {
      replaceHtmlPaths(html.absolutePath, resourceMap);
    }
    console.log('');

    // Step 7: 上传 HTML
    console.log(chalk.blue('Step 7: 上传 HTML 文件'));
    let finalUrl = '';
    for (const html of htmlFiles) {
      // 只上传 index.html 或第一个 HTML 文件
      if (html.relativePath === 'index.html' || htmlFiles.length === 1) {
        const res = await uploadToFupload(html.absolutePath);
        if (res && res.url) {
          finalUrl = res.url;
        }
      }
    }
    console.log('');

    // 完成
    console.log(chalk.green('━━━ ✅ 发布完成 ━━━━━━━━━━━━━━━━━━━'));
    if (finalUrl) {
      console.log(chalk.green(`访问地址: ${finalUrl}`));
    } else {
      const domain = env === 'production' ? 'h5.news.qq.com' : 'testqqnews.qq.com';
      console.log(chalk.green(`访问地址: https://${domain}${config.fupload.baseUrl}`));
    }
    console.log('');

  } finally {
    // Step 8: 恢复源文件到发布前状态
    if (fileBackups.size > 0) {
      console.log(chalk.blue('Step 8: 恢复源文件'));
      restoreAllFiles();
      console.log(chalk.green(`  已恢复 ${fileBackups.size} 个文件到发布前状态`));
      console.log('');
    }
  }
}

main().catch((err) => {
  // 发生错误时也要恢复文件
  if (fileBackups.size > 0) {
    console.log(chalk.yellow('\n正在恢复源文件...'));
    restoreAllFiles();
    console.log(chalk.green(`已恢复 ${fileBackups.size} 个文件`));
  }
  console.error(chalk.red(`上传失败: ${err.message}`));
  process.exit(1);
});
