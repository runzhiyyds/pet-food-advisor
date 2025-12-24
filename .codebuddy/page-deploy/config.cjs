/**
 * 上传配置文件
 */

const fs = require('fs');
const path = require('path');

// ============ Token 配置 ============
// CDN 上传 token (tupload) - 申请地址: https://fupload.woa.com/create
const TUPLOAD_TOKEN = '';
// HTML 服务器上传 token (fupload) - 申请地址: https://fupload.woa.com/createnews
const FUPLOAD_TOKEN = '';
// 上传路径名称（两次申请时填写的路径需一致）
const FOLDER_NAME = '';

// 支持的文件扩展名
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
const CSS_EXTS = ['.css'];
const JS_EXTS = ['.js'];

/**
 * 检查配置是否完整
 * @returns {object} { valid: boolean, missing: string[] }
 */
function checkConfig() {
  const missing = [];

  if (!TUPLOAD_TOKEN || TUPLOAD_TOKEN.trim() === '') {
    missing.push('TUPLOAD_TOKEN');
  }
  if (!FUPLOAD_TOKEN || FUPLOAD_TOKEN.trim() === '') {
    missing.push('FUPLOAD_TOKEN');
  }
  if (!FOLDER_NAME || FOLDER_NAME.trim() === '') {
    missing.push('FOLDER_NAME');
  }

  return {
    valid: missing.length === 0,
    missing,
    current: {
      TUPLOAD_TOKEN,
      FUPLOAD_TOKEN,
      FOLDER_NAME,
    }
  };
}

/**
 * 更新配置文件中的值
 * @param {string} key - 配置项名称
 * @param {string} value - 配置项值
 */
function updateConfig(key, value) {
  const configPath = path.join(__dirname, 'config.cjs');
  let content = fs.readFileSync(configPath, 'utf-8');

  // 对 FOLDER_NAME 进行路径规范化：去除首尾的 /
  if (key === 'FOLDER_NAME') {
    value = value.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  // 匹配 const KEY = '...' 或 const KEY = "" 格式
  const regex = new RegExp(`(const ${key} = )['"](.*?)['"];`, 'g');
  content = content.replace(regex, `$1'${value}';`);

  fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * 获取上传配置
 * @param {string} projectName - 项目名称（页面名称）
 * @param {string} env - 环境类型 (test | pre | production)
 */
function getUploadConfig(projectName, env = 'test') {
  const envSuffix = env === 'test' ? '_test' : '';

  return {
    tupload: {
      site: 'mat1.gtimg.com',
      baseUrl: `/qqcdn/${FOLDER_NAME}/${projectName}${envSuffix}`,
      token: TUPLOAD_TOKEN,
    },
    fupload: {
      site: env === 'production' || env === 'pre' ? 'h5.news.qq.com' : 'testqqnews.qq.com',
      baseUrl: `/qqfile/${FOLDER_NAME}/${projectName}.html`,
      token: FUPLOAD_TOKEN,
    },
    // 导出项目名信息供外部使用
    projectName,
  };
}

/**
 * 获取 CDN 基础路径
 * @param {object} config - 上传配置
 */
function getCdnBase(config) {
  return `https://mat1.gtimg.com${config.tupload.baseUrl}`;
}

module.exports = {
  IMAGE_EXTS,
  CSS_EXTS,
  JS_EXTS,
  getUploadConfig,
  getCdnBase,
  checkConfig,
  updateConfig,
};
