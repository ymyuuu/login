const fs = require('fs'); // 文件系统模块，用于读取和写入文件
const puppeteer = require('puppeteer-extra'); // Puppeteer 的扩展版，可以通过插件增强功能
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // Puppeteer 的隐身插件，帮助绕过反自动化检测
const nodemailer = require('nodemailer'); // Nodemailer 模块，用于发送电子邮件
const UserAgent = require('user-agents'); // 随机生成 User Agent 的库，模拟不同的浏览器用户

// 使用 Stealth 插件
// StealthPlugin 插件用于隐藏 Puppeteer 的痕迹，避免被网站识别为机器人。它通过修改或隐藏一些常见的指纹信息，如 webdriver 属性、navigator 对象中的语言和插件信息等。
puppeteer.use(StealthPlugin());

// 将日期格式化为 ISO 格式的函数
// 这个函数将日期转换为 ISO 8601 格式，并移除毫秒部分，用于日志记录或时间戳显示。
function formatToISO(date) {
  const isoString = date.toISOString(); // 将日期转换为 ISO 字符串格式
  const noMillis = isoString.split('.')[0]; // 移除毫秒部分
  return noMillis.replace('T', ' ').replace('Z', ' '); // 将 T 和 Z 替换为空格，使其更具可读性
}

// 获取北京时间
// 由于 JavaScript 中的 Date 对象默认使用 UTC 时间，这个函数通过增加 8 小时来获取中国的北京时间。
function getBeijingTime() {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// 读取 JSON 文件
// 这个函数用于读取指定的 JSON 文件并将其内容解析为 JavaScript 对象。
function readJSON(filename) {
  const data = fs.readFileSync(filename, 'utf-8'); // 读取文件内容
  return JSON.parse(data); // 解析 JSON 数据
}

// 登录函数，增加重试逻辑
// 这个函数尝试登录指定的账户，并在失败时最多重试 10 次。
// 如果登录成功则返回 true，否则返回 false。
async function login(account, maxRetries = 10) { // 将默认重试次数设置为 10 次
  const { username, password } = account; // 从账户对象中解构出用户名和密码
  const url = 'https://panel.ct8.pl/login/?next=/'; // 生成登录 URL

  // 多次尝试登录
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 启动 Puppeteer 浏览器实例，设置为无头模式并禁用一些不必要的特性以减少资源消耗
    const browser = await puppeteer.launch({
      headless: true, // 无头模式，运行时不会打开真实的浏览器窗口
      args: [
        '--no-sandbox', // 禁用沙盒模式，提升兼容性
        '--disable-setuid-sandbox', // 也是用于禁用沙盒
        '--disable-dev-shm-usage', // 防止 Docker 中的共享内存不足
        '--disable-accelerated-2d-canvas', // 禁用 2D 画布加速，减少 GPU 负载
        '--disable-gpu', // 禁用 GPU 硬件加速
        '--window-size=1280x1024', // 设置默认的窗口大小
      ]
    });
    const page = await browser.newPage(); // 创建一个新的页面标签

    // 随机生成 User Agent
    // 使用 `user-agents` 库生成随机的 User Agent，模拟不同的浏览器用户。
    const userAgent = new UserAgent().toString();
    await page.setUserAgent(userAgent); // 将随机生成的 User Agent 应用到页面

    // 设置视口大小
    // 视口是浏览器的可视区域，通过设置视口大小，模拟不同设备的屏幕尺寸。
    await page.setViewport({ width: 1280, height: 1024 });

    try {
      // 导航到登录页面，并等待页面完全加载（直到网络请求稳定下来）
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 清空用户名输入框的原有值
      const usernameInput = await page.$('#id_username');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 }); // 选中并清空输入框内容
        await usernameInput.press('Backspace'); // 删除内容
      }

      // 输入账号和密码
      await page.type('#id_username', username); // 输入用户名
      await page.type('#id_password', password); // 输入密码

      // 提交登录表单
      const loginButton = await page.$('#submit'); // 获取登录按钮
      if (loginButton) {
        await loginButton.click(); // 点击登录按钮
      }

      // 等待登录成功
      await page.waitForNavigation({ waitUntil: 'networkidle2' }); // 等待页面导航完成

      // 判断是否登录成功
      const isLoggedIn = await page.evaluate(() => {
        const logoutButton = document.querySelector('a[href="/logout/"]'); // 检查页面中是否存在注销按钮
        return logoutButton !== null; // 如果存在，则表示登录成功
      });

      if (isLoggedIn) {
        // console.log(`${username}@${username}.ct8.pl success`); // 登录成功的日志输出
        await browser.close(); // 关闭浏览器
        return true; // 返回成功
      }
    } catch (error) {
      // 忽略错误，继续重试
    } finally {
      await browser.close(); // 无论是否成功都要关闭浏览器
    }
  }

  console.log(`${username}@${username}.ct8.pl failed`); // 登录失败的日志输出
  return false; // 返回失败
}

// 发送邮件函数
// 这个函数用于发送登录结果通知邮件，内容包括登录失败的账号信息。
async function sendEmail(subject, html) {
  const emailConfig = readJSON('email.json'); // 读取邮件配置
  const transporter = nodemailer.createTransport({
    host: emailConfig.host, // 邮件服务器地址
    port: emailConfig.port, // 邮件服务器端口
    secure: emailConfig.secure, // 是否使用 SSL
    auth: emailConfig.auth, // 邮件服务器的认证信息
  });

  const mailOptions = {
    from: emailConfig.auth.user, // 发件人
    to: emailConfig.to, // 收件人
    subject: subject, // 邮件主题
    html: html, // 邮件内容（HTML 格式）
  };

  await transporter.sendMail(mailOptions); // 发送邮件
}

// 主函数
(async () => {
  const accounts = readJSON('accounts.json'); // 读取账号信息
  let failedAccounts = []; // 记录登录失败的账号

  for (const account of accounts) {
    const success = await login(account); // 尝试登录每个账号
    if (!success) {
      // 如果登录失败，记录失败的账号信息
      failedAccounts.push(`${account.username}@${account.username}.ct8.pl (password: ${account.password})`);
    }
  }

  // 如果有失败的账号，发送邮件通知
  if (failedAccounts.length > 0) {
    const nowBeijing = formatToISO(getBeijingTime()); // 获取当前北京时间
    const subject = 'CT8 登录结果'; // 邮件主题
    const html = `
      <p>失败账号数: <strong>${failedAccounts.length}</strong></p>
      <p>失败的账号:</p>
      <p>${failedAccounts.join('<br>')}</p>
      <br>
      <p><strong>${nowBeijing}</strong></p>
    `;

    await sendEmail(subject, html); // 发送包含失败账号信息的邮件
  }
  
  console.log("处理完成"); // 输出处理完成的日志
})();
