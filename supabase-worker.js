/**
 * Cloudflare Worker — Supabase 代理
 *
 * 作用：前端的 Supabase 请求全部转发到这个 Worker，
 *      由 Worker 加上真正的 SUPABASE_URL 和 ANON_KEY（存在环境变量中），
 *      浏览器永远拿不到你的 Supabase 密钥。
 *
 * 部署步骤：
 * 1. 登录 https://dash.cloudflare.com/ → Workers & Pages → 创建 Worker
 * 2. 将本文件内容粘贴到 Worker 编辑器中
 * 3. 在 Worker 的「设置」→「环境变量」中添加：
 *    - SUPABASE_URL = https://你的项目.supabase.co
 *    - SUPABASE_ANON_KEY = 你的 anon key
 * 4. 部署后获得一个 workers.dev 域名，如 https://my-space-proxy.xxx.workers.dev
 */

export default {
  async fetch(request, env) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info, Prefer',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // 从 Cloudflare Worker 环境变量读取 SUPABASE_URL = env.SUPABASE_URL
      // SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY

      const url = new URL(request.url);
      // 保留路径和查询参数，转发到真实的 Supabase
      const targetUrl = env.SUPABASE_URL + url.pathname + url.search;

      // 复制请求头并注入认证信息
      const newHeaders = new Headers(request.headers);
      newHeaders.set('apikey', env.SUPABASE_ANON_KEY);
      newHeaders.set('Authorization', 'Bearer ' + env.SUPABASE_ANON_KEY);

      // 转发请求
      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'follow',
      });

      const response = await fetch(modifiedRequest);

      // 复制响应并添加 CORS 头
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, X-Total-Count');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};