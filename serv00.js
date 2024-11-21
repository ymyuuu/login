const fs = require('fs'); // 文件系统模块，用于读取和写入文件
const nodemailer = require('nodemailer'); // Nodemailer 模块，用于发送电子邮件

// 读取 JSON 文件
function readJSON(filename) {
  const data = fs.readFileSync(filename, 'utf-8'); // 读取文件内容
  return JSON.parse(data); // 解析 JSON 数据
}

// 发送邮件函数
async function sendEmail(subject, html, attachmentPath) {
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
    attachments: [
      {
        filename: 'accounts.json', // 附件文件名
        path: attachmentPath, // 附件路径
      },
    ],
  };

  await transporter.sendMail(mailOptions); // 发送邮件
}

// 主函数
(async () => {
  const accountsPath = 'accounts.json'; // 要发送的文件路径
  const nowBeijing = new Date().toISOString().split('T')[0]; // 获取当前日期

  const subject = `Accounts JSON File - ${nowBeijing}`; // 邮件主题
  const html = `<p>请查看附件中的 <strong>accounts.json</strong> 文件。</p>`; // 邮件内容

  // 发送邮件并附加文件
  await sendEmail(subject, html, accountsPath);

  console.log("邮件已发送。");
})();
