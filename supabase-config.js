/**
 * Supabase 客户端配置
 * 使用 CDN 引入的 supabase 全局对象
 * 请将占位符替换为你的实际 Supabase 项目信息
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://tlywnhotiqixxmgxhdwl.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_sQG6VyVnFx0Q3BeblmBxnA_z5IcSIsE';

  // 从 CDN 全局对象创建客户端
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 暴露到全局以便其他模块使用
  window.supabaseClient = supabaseClient;
  window.REAL_SUPABASE_URL = SUPABASE_URL;
})();