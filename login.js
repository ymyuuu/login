const fs = require('fs');
const puppeteer = require('puppeteer');

// 将日期格式化为YYYY-MM-DD HH:MM:SS格式
function formatToLocalTime(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

// 延迟指定毫秒数的函数
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAccount(account, browser) {
  const { username, password, panelNumber } = account;
  const loginUrl = `https://panel${panelNumber}.serv00.com/login/?next=/`;

  const page = await browser.newPage();

  try {
    // 访问登录页面
    await page.goto(loginUrl);

    // 清空并输入用户名
    const usernameField = await page.$('#id_username');
    if (usernameField) {
      await usernameField.click({ clickCount: 3 }); // 选中输入框的内容
      await usernameField.press('Backspace'); // 删除原来的值
      await page.type('#id_username', username); // 输入实际的用户名
    }

    // 输入密码
    await page.type('#id_password', password);

    // 提交登录表单
    const submitButton = await page.$('#submit');
    if (submitButton) {
      await submitButton.click();
    } else {
      throw new Error('找不到提交按钮');
    }

    // 等待页面跳转（登录成功后的导航）
    await page.waitForNavigation();

    // 判断是否登录成功
    const isLoginSuccessful = await page.evaluate(() => {
      const logoutLink = document.querySelector('a[href="/logout/"]');
      return logoutLink !== null;
    });

    if (isLoginSuccessful) {
      // 获取当前的北京时间
      const currentBeijingTime = formatToLocalTime(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); // 北京时间东8区
      console.log(`账号 ${username} 于北京时间 ${currentBeijingTime} 登录成功！`);
    } else {
      console.error(`账号 ${username} 登录失败，请检查账号和密码是否正确。`);
    }
  } catch (error) {
    console.error(`账号 ${username} 登录时发生错误: ${error}`);
  } finally {
    // 关闭页面
    await page.close();

    // 在账号之间添加随机延时
    const randomDelay = Math.floor(Math.random() * 8000) + 1000; // 随机延时1秒到8秒之间
    await sleep(randomDelay);
  }
}

(async () => {
  // 读取 accounts.json 文件并解析为JSON对象
  const accountsData = fs.readFileSync('accounts.json', 'utf-8');
  const accounts = JSON.parse(accountsData);

  // 启动浏览器
  const browser = await puppeteer.launch({ headless: false });

  // 并发登录所有账号
  await Promise.all(accounts.map(account => loginAccount(account, browser)));

  // 关闭浏览器
  await browser.close();

  console.log('所有账号登录完成！');
})();
