const fs = require('fs');
const puppeteer = require('puppeteer');

function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAccount(account) {
  const { username, password, panelnum } = account;
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const url = `https://panel${panelnum}.serv00.com/login/?next=/`;

  try {
    await page.goto(url);

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
    } else {
      throw new Error('无法找到登录按钮');
    }

    await page.waitForNavigation();

    const isLoggedIn = await page.evaluate(() => {
      const logoutButton = document.querySelector('a[href="/logout/"]');
      return logoutButton !== null;
    });

    if (isLoggedIn) {
      const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000));
      console.log(`账号 ${username} 登录成功。北京时间：${nowBeijing}`);
    } else {
      console.error(`账号 ${username} 登录失败。请检查账号和密码是否正确。`);
    }
  } catch (error) {
    console.error(`账号 ${username} 登录时出现错误：${error.message}`);
  } finally {
    await page.close();
    await browser.close();
    const delay = Math.floor(Math.random() * 8000) + 1000;
    await delayTime(delay);
  }
}

(async () => {
  const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
  const accounts = JSON.parse(accountsJson);

  console.log(`开始登录 ${accounts.length} 个账号...\n`);

  // 使用 Promise.all 并行处理所有账号
  await Promise.all(accounts.map(account => loginAccount(account)));

  console.log('\n所有账号登录完成！');
})();
