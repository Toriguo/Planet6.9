/**
 * Supabase 客户端封装模块
 * 提供图片上传、URL获取、Profile 和 Planets 数据的读写功能
 * 依赖：supabase-config.js（会创建 window.supabaseClient）
 */

(function () {
  'use strict';

  const STORAGE_BUCKET = 'images';
  const PROFILES_TABLE = 'profiles';
  const PLANETS_TABLE = 'planets';
  const CONNECTIONS_TABLE = 'connections';

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error('Supabase client not initialized. Make sure supabase-config.js is loaded first.');
    }
    return window.supabaseClient;
  }

  /* ===== Storage 图片操作 ===== */

  /**
   * 上传图片到 Supabase Storage
   * @param {File} file - 文件对象
   * @param {string} path - 存储路径，例如 'avatars/abc123.png'
   * @returns {Promise<{data?: object, error?: Error}>}
   */
  async function uploadImage(file, path) {
    const client = getClient();
    const { data, error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
    return { data, error };
  }

  /**
   * 获取 Storage 中图片的公开 URL
   * @param {string} path - 存储路径
   * @returns {string|null}
   */
  function getImageUrl(path) {
    const client = getClient();
    const { data } = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);
    return data && data.publicUrl ? data.publicUrl : null;
  }

  /* ===== Profile 操作 ===== */

  /**
   * 检查 space_id 是否已存在（除了当前slug对应的）
   * @param {string} spaceId - 要检查的ID
   * @param {string} currentSlug - 当前用户的slug（可选，检查时排除自己）
   * @returns {Promise<{exists: boolean, data?: object, error?: Error}>}
   */
  async function checkSpaceIdExists(spaceId, currentSlug = null) {
    const client = getClient();
    let query = client.from(PROFILES_TABLE).select('slug').eq('space_id', spaceId);
    if (currentSlug) {
      query = query.neq('slug', currentSlug); // 排除自己
    }
    const { data, error } = await query.limit(1);
    return { exists: data && data.length > 0, data, error };
  }

  /**
   * 保存或更新 Profile（upsert）
   * @param {string} slug - 唯一标识
   * @param {object} data - 要保存的数据，例如 { avatar_url, ig_link, xhs_link, dy_link }
   * @returns {Promise<{data?: object, error?: Error}>}
   */
  async function saveProfile(slug, data) {
    const client = getClient();
    const payload = {
      slug,
      updated_at: new Date().toISOString(),
      ...data,
    };
    const { data: result, error } = await client
      .from(PROFILES_TABLE)
      .upsert(payload, { onConflict: 'slug' })
      .select()
      .single();
    return { data: result, error };
  }

  /**
   * 根据 slug 获取 Profile
   * @param {string} slug
   * @returns {Promise<{data?: object, error?: Error}>}
   */
  async function getProfile(slug) {
    const client = getClient();
    const { data, error } = await client
      .from(PROFILES_TABLE)
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    return { data, error };
  }

  /**
   * 根据 space_id 获取 Profile（用于搜索 SPACE-XXXX）
   * @param {string} spaceId
   * @returns {Promise<{data?: object, error?: Error}>}
   */
  async function getProfileBySpaceId(spaceId) {
    const client = getClient();
    const { data, error } = await client
      .from(PROFILES_TABLE)
      .select('*')
      .eq('space_id', spaceId)
      .maybeSingle();
    return { data, error };
  }

  /* ===== Planets 操作 ===== */

  /**
   * 保存星球数据（先删除旧数据再插入新数据）
   * @param {string} slug - 所属 profile 的 slug
   * @param {Array} planets - 星球数组，每项包含 { name, images: [{ path }] }
   * @returns {Promise<{data?: object[], error?: Error}>}
   */
  async function savePlanets(slug, planets) {
    const client = getClient();

    // 删除该 slug 下的旧记录
    const { error: deleteError } = await client
      .from(PLANETS_TABLE)
      .delete()
      .eq('slug', slug);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    if (!planets || planets.length === 0) {
      return { data: [], error: null };
    }

    const rows = planets.map(function (planet, index) {
      return {
        slug,
        planet_index: index,
        name: planet.name || '',
        images: planet.images || [],
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await client
      .from(PLANETS_TABLE)
      .insert(rows)
      .select();

    return { data, error };
  }

  /**
   * 获取某 slug 下的所有星球数据
   * @param {string} slug
   * @returns {Promise<{data?: object[], error?: Error}>}
   */
  async function getPlanets(slug) {
    const client = getClient();
    const { data, error } = await client
      .from(PLANETS_TABLE)
      .select('*')
      .eq('slug', slug)
      .order('planet_index', { ascending: true });
    return { data, error };
  }

  /* ===== Connections 操作 ===== */

  function normalizeConnectionPair(slugA, slugB) {
    return slugA < slugB ? [slugA, slugB] : [slugB, slugA];
  }

  /**
   * 检查两个用户是否已连接
   */
  async function checkConnection(slugA, slugB) {
    const client = getClient();
    const [a, b] = normalizeConnectionPair(slugA, slugB);
    const { data, error } = await client
      .from(CONNECTIONS_TABLE)
      .select('id')
      .eq('slug_a', a)
      .eq('slug_b', b)
      .maybeSingle();
    return { connected: !!data, data, error };
  }

  /**
   * 建立两个用户之间的连接
   */
  async function createConnection(slugA, slugB) {
    const client = getClient();
    const [a, b] = normalizeConnectionPair(slugA, slugB);
    const existing = await checkConnection(slugA, slugB);
    if (existing.connected) {
      return { data: existing.data, alreadyConnected: true, error: null };
    }
    const { data, error } = await client
      .from(CONNECTIONS_TABLE)
      .insert({ slug_a: a, slug_b: b })
      .select()
      .single();
    return { data, error, alreadyConnected: false };
  }

  /**
   * 删除两个用户之间的连接
   */
  async function deleteConnection(slugA, slugB) {
    const client = getClient();
    const [a, b] = normalizeConnectionPair(slugA, slugB);
    const { error } = await client
      .from(CONNECTIONS_TABLE)
      .delete()
      .eq('slug_a', a)
      .eq('slug_b', b);
    return { error };
  }

  /* ===== 工具函数 ===== */

  /**
   * 生成随机 8 字符 slug（字母+数字）
   * @returns {string}
   */
  function generateSlug() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
  }

  /* ===== 暴露到全局 ===== */
  window.supabaseApi = {
    uploadImage,
    getImageUrl,
    checkSpaceIdExists,
    saveProfile,
    getProfile,
    getProfileBySpaceId,
    checkConnection,
    createConnection,
    deleteConnection,
    savePlanets,
    getPlanets,
    generateSlug,
  };
})();