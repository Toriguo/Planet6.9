# Supabase 项目设置指南

## 1. 创建 Supabase 项目

1. 打开浏览器，访问 [Supabase 官网](https://supabase.com/)。
2. 点击右上角的 "Sign Up" 注册账号，支持使用 GitHub 或邮箱注册。
3. 登录后，点击 "New Project" 创建新项目。
4. 选择或创建一个 Organization。
5. 填写项目名称（Project name），设置数据库密码（Database Password），选择地区（Region，建议选择离你最近的地区，如 `Northeast Asia (Tokyo)`）。
6. 点击 "Create new project"，等待项目初始化完成（约 1-2 分钟）。

---

## 2. 数据库表结构设置

项目创建完成后，进入项目的 Dashboard，点击左侧菜单的 "SQL Editor"。

在 SQL Editor 中，点击 "New query"，然后粘贴以下 SQL 代码并点击 "Run"：

```sql
-- 创建 profiles 表
CREATE TABLE profiles (
  slug TEXT PRIMARY KEY,
  avatar_url TEXT,
  ig_link TEXT,
  xhs_link TEXT,
  dy_link TEXT,
  space_id TEXT,              -- 用户自定义的星际坐标ID，如 SPACE-134340
  public_planet_index INT DEFAULT -1,  -- 公开的星球索引（-1=无）
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建 planets 表
CREATE TABLE planets (
  id SERIAL PRIMARY KEY,
  slug TEXT,
  planet_index INT,
  name TEXT,
  images JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

> **如果已经创建过表**，请在 SQL Editor 中额外运行以下命令添加 `space_id` 列：
> ```sql
> ALTER TABLE profiles ADD COLUMN space_id TEXT;
> ALTER TABLE profiles ADD COLUMN public_planet_index INT DEFAULT -1;
> ```

执行成功后，点击左侧菜单 "Table Editor"，即可看到 `profiles` 和 `planets` 两张表。

---

## 2b. 开启 RLS 安全策略

**重要：** 为了在允许所有人读写的同时防止数据被恶意删除或批量拖库，需要开启 Row Level Security（行级安全策略）。

在 SQL Editor 中新建查询，运行以下 SQL：

```sql
-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE planets ENABLE ROW LEVEL SECURITY;

-- profiles 表：所有人可查看、新增、更新，但不可删除
CREATE POLICY "公开查看" ON profiles FOR SELECT USING (true);
CREATE POLICY "公开新增" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "公开更新" ON profiles FOR UPDATE USING (true) WITH CHECK (true);

-- planets 表：所有人可查看、新增、更新、删除（保存时需先删后插）
CREATE POLICY "公开查看" ON planets FOR SELECT USING (true);
CREATE POLICY "公开新增" ON planets FOR INSERT WITH CHECK (true);
CREATE POLICY "公开更新" ON planets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "公开删除" ON planets FOR DELETE USING (true);
```

> **注意事项：**
> - 这些策略允许任何知道你的 Supabase URL 的人读写数据（因为项目本身设计为无需登录），但相比完全关闭 RLS 更规范，且防止通过其他工具直接连接时拖库。
> - 如果将来想加管理后台，可以在此基础上添加更严格的策略。
> - 运行后如果之前是关闭 RLS 的，数据不会受影响，策略即时生效。

---

## 3. 创建 Storage 存储桶

1. 在左侧菜单中点击 "Storage"。
2. 点击 "New bucket" 按钮。
3. 输入 Bucket 名称：`images`。
4. **重要**：取消勾选 "Restrict public access?"（或勾选 "Public bucket"），确保存储桶是公开的，否则图片无法被外部访问。
5. 点击 "Save" 或 "Create bucket"。

---

## 4. 获取 SUPABASE_URL 和 SUPABASE_ANON_KEY

1. 在左侧菜单中点击 "Project Settings"（齿轮图标）。
2. 在左侧子菜单中选择 "API"。
3. 在 "Project API keys" 区域，你可以找到以下信息：
   - **Project URL**：`SUPABASE_URL`
   - **anon public**：`SUPABASE_ANON_KEY`
4. 点击右侧的复制按钮，将这两个值复制下来。

---

## 5. 部署 Cloudflare Worker（保护 Supabase 密钥）

⚠️ **重要：** 为了不让你的 Supabase URL 和 ANON KEY 暴露在浏览器源码中，所有 API 请求通过 Cloudflare Worker 转发，密钥放在 Worker 的环境变量里。

### 5.1 创建 Worker

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击左侧 「Workers & Pages」→ 「创建 Worker」
3. 给 Worker 取个名字（如 `my-space-proxy`）
4. 将项目中的 `supabase-worker.js` 文件内容**全部复制**粘贴到 Worker 编辑器中
5. 点击右上角 **「保存并部署」**

### 5.2 设置环境变量

1. 在 Worker 详情页点击 **「设置」** → **「环境变量」**
2. 点击 **「添加变量」**，添加以下两个变量：

   | 变量名 | 值 |
   |--------|-----|
   | `SUPABASE_URL` | 你的 Supabase URL，例如 `https://abcdefgh12345678.supabase.co` |
   | `SUPABASE_ANON_KEY` | 你的 Supabase anon public key |

3. ⚠️ **不要勾选「加密」**，勾选「部署后可用」
4. 点击 **「保存并部署」**

### 5.3 获取 Worker 地址

部署后，你会得到一个地址，例如：
```
https://my-space-proxy.your-name.workers.dev
```

### 5.4 配置 supabase-config.js

打开项目中的 `supabase-config.js`，将 `WORKER_URL` 替换为你的 Worker 地址：

```javascript
const WORKER_URL = 'https://my-space-proxy.your-name.workers.dev';
```

保存文件。

---

## 6. 测试连接

部署完成后，启动项目并测试：
1. 打开编辑页面，尝试保存数据
2. 打开首页，检查数据是否能正常加载
3. 打开浏览器开发者工具 → Network 面板，确认请求是发往 Worker 地址（`workers.dev`）而非 Supabase 地址

如果一切正常，你的 Supabase 密钥就安全了——浏览器只能看到 Worker 地址，看不到真实的 Supabase URL 和 Key。

如果控制台输出 "连接成功" 并返回数据，说明配置正确。

---

## 常见问题

- **CORS 错误**：确保在 Supabase Dashboard 的 "Authentication" -> "URL Configuration" 中添加了你的本地开发地址（如 `http://localhost:3000`）。
- **权限错误**：如果查询返回 401 或 403，检查是否启用了 Row Level Security (RLS)。对于公开数据，可以在表上创建允许匿名访问的 RLS 策略，或在开发阶段暂时关闭 RLS。
- **图片无法显示**：确认 `images` 存储桶已设置为 Public，且图片的 URL 正确。
