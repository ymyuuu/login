const fs = require('fs'); // 文件系统模块，用于读取和写入文件
const nodemailer = require('nodemailer'); // Nodemailer 模块，用于发送电子邮件

// 读取 JSON 文件
function readJSON(filename) {
  const data = fs.readFileSync(filename, 'utf-8'); // 读取文件内容
  return JSON.parse(data); // 解析 JSON 数据
}

// 发送邮件函数
async function sendEmail(subject, html, attachmentPaths) {
  const emailConfig = readJSON('email.json'); // 读取邮件配置
  const transporter = nodemailer.createTransport({
    host: emailConfig.host, // 邮件服务器地址
    port: emailConfig.port, // 邮件服务器端口
    secure: emailConfig.secure, // 是否使用 SSL
    auth: emailConfig.auth, // 邮件服务器的认证信息
  });

  const attachments = attachmentPaths.map((path) => ({
    filename: path.split('/').pop(), // 使用文件名作为附件名
    path: path, // 文件路径
  }));

  const mailOptions = {
    from: emailConfig.auth.user, // 发件人
    to: emailConfig.to, // 收件人
    subject: subject, // 邮件主题
    html: html, // 邮件内容（HTML 格式）
    attachments: attachments, // 邮件附件
  };

  await transporter.sendMail(mailOptions); // 发送邮件
}

// 主函数
(async () => {
  const accountsPath = 'accounts.json'; // accounts.json 文件路径
  const emailConfigPath = 'email.json'; // email.json 文件路径
  const nowBeijing = new Date().toISOString().split('T')[0]; // 获取当前日期

  const subject = `JSON Files - ${nowBeijing}`; // 邮件主题
  const html = `<p>请查看附件中的 <strong>accounts.json</strong> 和 <strong>email.json</strong> 文件。</p>`; // 邮件内容

  // 发送邮件并附加文件
  await sendEmail(subject, html, [accountsPath, emailConfigPath]);

  console.log("邮件已发送。");
})();
