const fs = require('fs'); // 文件系统模块，用于读取和写入文件
const puppeteer = require('puppeteer-extra'); // Puppeteer 的扩展版，可以通过插件增强功能
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // Puppeteer 的隐身插件，帮助绕过反自动化检测
const nodemailer = require('nodemailer'); // Nodemailer 模块，用于发送电子邮件
const UserAgent = require('user-agents'); // 随机生成 User Agent 的库，模拟不同的浏览器用户

// 使用 Stealth 插件
puppeteer.use(StealthPlugin());

// 将日期格式化为 ISO 格式的函数
function formatToISO(date) {
  const isoString = date.toISOString(); // 将日期转换为 ISO 字符串格式
  const noMillis = isoString.split('.')[0]; // 移除毫秒部分
  return noMillis.replace('T', ' ').replace('Z', ' '); // 将 T 和 Z 替换为空格，使其更具可读性
}

// 获取北京时间
function getBeijingTime() {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// 读取 JSON 文件
function readJSON(filename) {
  const data = fs.readFileSync(filename, 'utf-8'); // 读取文件内容
  return JSON.parse(data); // 解析 JSON 数据
}

// 登录函数，增加重试逻辑
async function login(account, maxRetries = 10) {
  const { username, password, panelnum } = account; // 从账户对象中解构出用户名、密码和面板编号
  const url = `https://panel${panelnum}.serv00.com/login/?next=/`; // 生成登录 URL

  // 启动 Puppeteer 浏览器实例
  const browser = await puppeteer.launch({
    headless: true, // 无头模式，运行时不会打开真实的浏览器窗口
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', 
      '--disable-accelerated-2d-canvas', 
      '--disable-gpu', 
      '--window-size=1280x1024', 
    ]
  });

  const page = await browser.newPage(); // 创建一个新的页面标签
  const userAgent = new UserAgent().toString(); // 随机生成 User Agent
  await page.setUserAgent(userAgent); // 设置随机的 User Agent
  await page.setViewport({ width: 1280, height: 1024 }); // 设置视口大小

  try {
    // 导航到登录页面，并等待页面加载
    await page.goto(url, { waitUntil: 'networkidle2' });

    // 判断是否能够成功加载页面
    const isPageAccessible = await page.evaluate(() => {
      const loginForm = document.querySelector('form'); // 检查登录表单是否存在
      return loginForm !== null; // 如果存在登录表单，表示页面加载成功
    });

    if (!isPageAccessible) {
      // 如果登录页面无法加载，直接输出日志并返回失败
      console.log(`${username}@s${panelnum}.serv00.com 登录失败（官网进不去）`);
      await browser.close(); // 关闭浏览器
      return false; // 返回失败
    }

    // 如果页面加载成功，开始进行登录操作
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const usernameInput = await page.$('#id_username');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.press('Backspace');
      }
      await page.type('#id_username', username);
      await page.type('#id_password', password);
      
      const loginButton = await page.$('#submit');
      if (loginButton) {
        await loginButton.click();
      }

      // 等待页面跳转，检查是否登录成功
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      const isLoggedIn = await page.evaluate(() => {
        const logoutButton = document.querySelector('a[href="/logout/"]');
        return logoutButton !== null;
      });

      if (isLoggedIn) {
        console.log(`${username}@s${panelnum}.serv00.com 登录成功`);
        await browser.close(); 
        return true; 
      }
    }
  } catch (error) {
    console.log(`登录过程中发生错误：${error.message}`);
  } finally {
    await browser.close(); 
  }

  console.log(`${username}@s${panelnum}.serv00.com 登录失败`);
  return false; 
}

// 发送邮件函数
async function sendEmail(subject, html) {
  const emailConfig = readJSON('email.json'); 
  const transporter = nodemailer.createTransport({
    host: emailConfig.host, 
    port: emailConfig.port, 
    secure: emailConfig.secure, 
    auth: emailConfig.auth, 
  });

  const mailOptions = {
    from: emailConfig.auth.user, 
    to: emailConfig.to, 
    subject: subject, 
    html: html, 
  };

  await transporter.sendMail(mailOptions); 
}

// 主函数
(async () => {
  const accounts = readJSON('accounts.json'); 
  let failedAccounts = []; 

  for (const account of accounts) {
    const success = await login(account); 
    if (!success) {
      failedAccounts.push(`${account.username}@s${account.panelnum}.serv00.com (password: ${account.password})`);
    }
  }

  if (failedAccounts.length > 0) {
    const nowBeijing = formatToISO(getBeijingTime()); 
    const subject = 'SERV00 登录结果'; 
    const html = `
      <p>失败账号数: <strong>${failedAccounts.length}</strong></p>
      <p>失败的账号:</p>
      <p>${failedAccounts.join('<br>')}</p>
      <br>
      <p><strong>${nowBeijing}</strong></p>
    `;

    await sendEmail(subject, html); 
  }
  console.log("处理完成"); 
})();
