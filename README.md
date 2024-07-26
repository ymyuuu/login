### `email.json`
`email.json` 用于配置发送邮件的 SMTP 服务器信息和收件人的电子邮件地址。

#### 示例内容
```json
{
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "auth": {
        "user": "your-email",
        "pass": "your-email-password"
    },
    "to": "recipient"
}
```

#### 字段说明
- **host**: SMTP 服务器的主机名。
- **port**: SMTP 服务器的端口号。
- **secure**: 是否使用 SSL（`true` 表示使用，`false` 表示不使用）。
- **auth**: 认证信息，包括用户名和密码。
  - **user**: 发送邮件的邮箱地址。
  - **pass**: 邮箱密码或应用专用密码。
- **to**: 接收邮件的邮箱地址。

### `ct8.json`
`ct8.json` 用于配置 CT8 账号的登录信息。

#### 示例内容
```json
[
    {
        "username": "user1",
        "password": "password1"
    },
    {
        "username": "user2",
        "password": "password2"
    },
    {
        "username": "user3",
        "password": "password3"
    }
]
```

#### 字段说明
- **username**: 登录账号的用户名。
- **password**: 登录账号的密码。

### `server00.json`
`server00.json` 用于配置 SERV00 账号的登录信息，包括面板编号（`panelnum`）。

#### 示例内容
```json
[
    {
        "username": "user1",
        "password": "password1",
        "panelnum": 1
    },
    {
        "username": "user2",
        "password": "password2",
        "panelnum": 2
    },
    {
        "username": "user3",
        "password": "password3",
        "panelnum": 3
    }
]
```

#### 字段说明
- **username**: 登录账号的用户名。
- **password**: 登录账号的密码。
- **panelnum**: 面板编号，用于构建 URL。
