const fs = require('fs');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

// 将日期格式化为 ISO 格式的函数
function formatToISO(date) {
  const isoString = date.toISOString();
  const noMillis = isoString.split('.')[0];
  return noMillis.replace('T', ' ').replace('Z', ' ');
}

// 获取北京时间
function getBeijingTime() {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// 读取 JSON 文件
function readJSON(filename) {
  const data = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

// 登录函数，增加重试逻辑
async function login(account, maxRetries = 3) {
  const { username, password, panelnum } = account;
  const url = `https://panel${panelnum}.serv00.com/login/?next=/`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url);

      // 清空用户名输入框的原有值
      const usernameInput = await page.$('#id_username');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.press('Backspace');
      }

      // 输入账号和密码
      await page.type('#id_username', username);
      await page.type('#id_password', password);

      // 提交登录表单
      const loginButton = await page.$('#submit');
      if (loginButton) {
        await loginButton.click();
      } else {
        throw new Error('无法找到登录按钮');
      }

      // 等待登录成功
      await page.waitForNavigation();

      // 判断是否登录成功
      const isLoggedIn = await page.evaluate(() => {
        const logoutButton = document.querySelector('a[href="/logout/"]');
        return logoutButton !== null;
      });

      if (isLoggedIn) {
        console.log(`${username}@s${panelnum}.serv00.com success`);
        await browser.close();
        return true;
      }
    } catch (error) {
      // 忽略错误，继续重试
    } finally {
      await browser.close();
    }
  }

  console.log(`${username}@s${panelnum}.serv00.com failed`);
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

  // 发送邮件通知，如果有失败的账号
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
})();
