const fs = require('fs');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

// 将日期格式化为 ISO 格式的函数
function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

// 获取北京时间
function getBeijingTime() {
  return new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
}

// 读取 accounts.json 文件
function readAccounts(filename) {
  const data = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

// 读取 email.json 文件
function readEmailConfig(filename) {
  const data = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

// 登录函数，增加重试逻辑
async function login(account, maxRetries = 3) {
  const { username, password } = account;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'https://panel.ct8.pl/login/?next=/';

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
        console.log(`账号 ${username} 登录成功！`);
        await browser.close();
        return true;
      }
    } catch (error) {
      // 忽略错误，继续重试
    } finally {
      await browser.close();
    }
  }
  return false;
}

// 发送邮件函数
async function sendEmail(subject, text) {
  const emailConfig = readEmailConfig('email.json');
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
    text: text,
  };

  await transporter.sendMail(mailOptions);
}

// 主函数
(async () => {
  const accounts = readAccounts('accounts.json');
  const totalAccounts = accounts.length;
  let successfulLogins = 0;
  let failedLogins = 0;
  let failedAccounts = [];

  for (const account of accounts) {
    const success = await login(account);
    if (success) {
      successfulLogins++;
    } else {
      failedLogins++;
      failedAccounts.push(account.username);
    }
  }

  // 输出总结信息
  console.log(`所有账号登录完成！`);
  console.log(`总共需要登录的账号数: ${totalAccounts}`);
  console.log(`成功登录的账号数: ${successfulLogins}`);
  console.log(`登录失败的账号数: ${failedLogins}`);

  // 发送邮件通知，如果有失败的账号
  if (failedAccounts.length > 0) {
    const nowBeijing = formatToISO(getBeijingTime());
    const subject = 'CT8 登录结果';
    let text = `所有账号登录完成！\n总共需要登录的账号数: ${totalAccounts}\n成功登录的账号数: ${successfulLogins}\n登录失败的账号数: ${failedLogins}\n登录失败的账号: ${failedAccounts.join(', ')}\n邮件发送时间: 北京时间 ${nowBeijing}`;

    await sendEmail(subject, text);
  }
})();
