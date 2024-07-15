const fs = require('fs');
const puppeteer = require('puppeteer');

// 将日期格式化为 ISO 格式的函数
function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

// 读取 accounts.json 文件
function readAccounts(filename) {
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
        const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); // 北京时间
        console.log(`账号 ${username} 于北京时间 ${nowBeijing} 登录成功！`);
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

// 主函数
(async () => {
  const accounts = readAccounts('accounts.json');
  const totalAccounts = accounts.length;
  let successfulLogins = 0;
  let failedLogins = 0;

  for (const account of accounts) {
    const success = await login(account);
    if (success) {
      successfulLogins++;
    } else {
      console.error(`账号 ${account.username} 登录失败，请检查账号和密码是否正确。`);
      failedLogins++;
    }
  }

  // 输出总结信息
  console.log(`所有账号登录完成！`);
  console.log(`总共需要登录的账号数: ${totalAccounts}`);
  console.log(`成功登录的账号数: ${successfulLogins}`);
  console.log(`登录失败的账号数: ${failedLogins}`);
})();
