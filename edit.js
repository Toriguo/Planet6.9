(function () {
  'use strict';

  /* ===== Supabase API 快捷引用 ===== */
  const sb = window.supabaseApi;

  /* ===== 星空背景 ===== */
  const starfield = document.getElementById('starfield');
  const ctx = starfield.getContext('2d');
  let stars = [];
  let animStars = null;
  let scrollY = 0;

  function resize() {
    starfield.width = Math.min(window.innerWidth, 900);
    starfield.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    const count = Math.floor((starfield.width * starfield.height) / 4000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * starfield.width,
        y: Math.random() * starfield.height * 3,
        z: Math.random(),
        size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
        brightness: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function drawStars(time) {
    ctx.clearRect(0, 0, starfield.width, starfield.height);
    const colors = ['#ffffff', '#ccddff', '#aaccff', '#88ccff'];

    stars.forEach(function (star) {
      const factor = 0.1 + star.z * 0.4;
      const offsetY = (scrollY * factor) % (starfield.height * 3);
      let y = star.y - offsetY;
      if (y < -10) y += starfield.height * 3;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.brightness * twinkle;

      ctx.fillStyle = colors[Math.floor(star.z * colors.length)];
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(star.x), Math.round(y), star.size, star.size);
    });
    ctx.globalAlpha = 1;
    animStars = requestAnimationFrame(drawStars);
  }

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(drawStars);

  /* ===== 变量声明 ===== */
  let portfolioData = [];
  let avatarFile = null;
  let currentSlug = null;
  let publicPlanetIndex = -1;  // 被公开的星球索引，-1 表示没有
  let originalSpaceId = null;  // 记录用户原来的ID，用来检查是否改了

  const avatarPreview = document.getElementById('avatar-preview');
  const avatarInput = document.getElementById('avatar-input');
  const avatarBtn = document.getElementById('avatar-btn');
  const planetGrid = document.getElementById('planet-grid');
  const addPlanetBtn = document.getElementById('add-planet');
  const saveBtn = document.getElementById('save-btn');
  const shareLink = document.getElementById('share-link');
  const shareUrl = document.getElementById('share-url');
  const copyBtn = document.getElementById('copy-btn');
  const igLink = document.getElementById('ig-link');
  const xhsLink = document.getElementById('xhs-link');
  const dyLink = document.getElementById('dy-link');
  const previewModal = document.getElementById('image-preview-modal');
  const previewImg = document.getElementById('preview-img');
  const previewClose = document.getElementById('preview-close');

  /* ===== 头像上传 ===== */
  avatarBtn.addEventListener('click', function () {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    avatarFile = file;
    const reader = new FileReader();
    reader.onload = function (evt) {
      avatarPreview.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ===== 星球卡片渲染 ===== */
  function renderPlanetCards() {
    planetGrid.innerHTML = '';
    portfolioData.forEach(function (planet, index) {
      const card = document.createElement('div');
      card.className = 'planet-upload-card';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'planet-name-input';
      nameInput.placeholder = '星球名称';
      nameInput.value = planet.name || '';
      nameInput.addEventListener('input', function () {
        portfolioData[index].name = this.value;
      });

      const dropZone = document.createElement('div');
      dropZone.className = 'planet-drop-zone';
      dropZone.innerHTML = '<span class="drop-hint">点击上传图片</span>';

      const input = document.createElement('input');
      input.type = 'file';
      input.className = 'planet-file-input';
      input.accept = 'image/*';
      input.multiple = true;

      input.addEventListener('change', function (e) {
        handleFiles(e.target.files, index);
      });

      dropZone.addEventListener('click', function () {
        input.click();
      });

      dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files, index);
      });

      const previewWrap = document.createElement('div');
      previewWrap.className = 'planet-preview-wrap';

      if (planet.images && planet.images.length > 0) {
        planet.images.forEach(function (imgData, imgIdx) {
          const src = imgData.url || imgData.base64 || sb.getImageUrl(imgData.path);
          if (!src) return;

          const thumb = document.createElement('div');
          thumb.className = 'planet-thumb';

          const img = document.createElement('img');
          img.src = src;
          img.alt = '星球图片';
          img.addEventListener('click', function () {
            showPreview(src);
          });

          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-thumb';
          removeBtn.textContent = '✕';
          removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            portfolioData[index].images.splice(imgIdx, 1);
            renderPlanetCards();
          });

          thumb.appendChild(img);
          thumb.appendChild(removeBtn);
          previewWrap.appendChild(thumb);
        });
      }

      const btnGroup = document.createElement('div');
      btnGroup.className = 'planet-btn-group';

      const publicBtn = document.createElement('button');
      publicBtn.className = 'public-planet-btn' + (publicPlanetIndex === index ? ' is-public' : '');
      publicBtn.textContent = publicPlanetIndex === index ? '✦ 已公开' : '公开该星球';
      publicBtn.addEventListener('click', function () {
        if (publicPlanetIndex === index) {
          // 点击已公开 → 取消公开
          publicPlanetIndex = -1;
        } else {
          publicPlanetIndex = index;
        }
        renderPlanetCards();
      });

      const deletePlanetBtn = document.createElement('button');
      deletePlanetBtn.className = 'delete-planet-btn';
      deletePlanetBtn.textContent = '删除星球';
      deletePlanetBtn.addEventListener('click', function () {
        portfolioData.splice(index, 1);
        // 如果删除了公开的星球，重置
        if (publicPlanetIndex === index) {
          publicPlanetIndex = -1;
        } else if (publicPlanetIndex > index) {
          publicPlanetIndex--;
        }
        renderPlanetCards();
      });

      btnGroup.appendChild(publicBtn);
      btnGroup.appendChild(deletePlanetBtn);

      card.appendChild(nameInput);
      card.appendChild(dropZone);
      card.appendChild(previewWrap);
      card.appendChild(btnGroup);
      planetGrid.appendChild(card);
    });
  }

  function handleFiles(files, planetIndex) {
    const currentCount = portfolioData[planetIndex].images.length;
    if (currentCount >= 8) {
      alert('每个星球最多支持上传 8 张图片！');
      return;
    }
    const remaining = 8 - currentCount;
    const validFiles = Array.from(files).slice(0, remaining);
    if (validFiles.length < files.length) {
      alert('每个星球最多支持上传 8 张图片，已自动保留前 ' + remaining + ' 张。');
    }
    validFiles.forEach(function (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        portfolioData[planetIndex].images.push({
          file: file,
          base64: e.target.result,
          name: file.name,
        });
        renderPlanetCards();
      };
      reader.readAsDataURL(file);
    });
  }

  function showPreview(src) {
    previewImg.src = src;
    previewModal.style.display = 'flex';
  }

  previewClose.addEventListener('click', function () {
    previewModal.style.display = 'none';
  });

  previewModal.addEventListener('click', function (e) {
    if (e.target === previewModal) previewModal.style.display = 'none';
  });

  addPlanetBtn.addEventListener('click', function () {
    portfolioData.push({ name: '', images: [] });
    renderPlanetCards();
  });

  /* ===== 保存到 Supabase ===== */
  saveBtn.addEventListener('click', async function () {
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;

    try {
      // 检查ID相关
      const spaceInput = document.getElementById('space-id-input');
      const newSpaceIdPart = spaceInput ? spaceInput.value.trim().toUpperCase() : '134340';
      if (!newSpaceIdPart) {
        alert('请输入您的ID！');
        saveBtn.textContent = '保存设置';
        saveBtn.disabled = false;
        return;
      }
      const newSpaceId = 'SPACE-' + newSpaceIdPart;

      // 1. 检查是否改了ID（必须改！）
      if (originalSpaceId && originalSpaceId === newSpaceId) {
        alert('请修改您的ID！不能和原来的一样！');
        saveBtn.textContent = '保存设置';
        saveBtn.disabled = false;
        return;
      }

      // 2. 检查新ID是否已经被别人用了
      if (!originalSpaceId || originalSpaceId !== newSpaceId) {
        const { exists: idExists, error: checkError } = await sb.checkSpaceIdExists(newSpaceId, currentSlug);
        if (checkError) {
          console.error('检查ID失败:', checkError);
          alert('检查ID是否重复时出错：' + checkError.message);
          saveBtn.textContent = '保存设置';
          saveBtn.disabled = false;
          return;
        }
        if (idExists) {
          alert('这个ID已经被别人用了！请换一个！');
          saveBtn.textContent = '保存设置';
          saveBtn.disabled = false;
          return;
        }
      }

      // 生成或复用 slug
      if (!currentSlug) {
        currentSlug = sb.generateSlug();
      }

      let avatarUrl = null;

      // 上传头像
      if (avatarFile) {
        const avatarPath = 'avatars/' + currentSlug + '_' + Date.now() + '.png';
        const { error: uploadError } = await sb.uploadImage(avatarFile, avatarPath);
        if (uploadError) {
          console.error('头像上传失败:', uploadError);
          alert('头像上传失败！请检查 Supabase Storage 是否设置为 Public。\n错误：' + uploadError.message);
          saveBtn.textContent = '保存设置';
          saveBtn.disabled = false;
          return;
        } else {
          avatarUrl = sb.getImageUrl(avatarPath);
        }
      }

      // 保存 profile
      const profileData = {
        avatar_url: avatarUrl,
        ig_link: igLink.value || null,
        xhs_link: xhsLink.value || null,
        dy_link: dyLink.value || null,
        space_id: newSpaceId,
        public_planet_index: publicPlanetIndex,
      };
      const { data: savedProfile, error: profileError } = await sb.saveProfile(currentSlug, profileData);
      // 保存到 localStorage（给首页读取）
      localStorage.setItem('space_id', profileData.space_id);
      localStorage.setItem('space_id_' + currentSlug, profileData.space_id);
      originalSpaceId = profileData.space_id; // 更新保存后的原始ID
      if (profileError) {
        console.error('Profile 保存失败:', profileError);
        alert('保存失败：数据库保存出错。\n可能原因：\n1. 数据库缺少 space_id 或 public_planet_index 列，请在 Supabase SQL Editor 运行：\n   ALTER TABLE profiles ADD COLUMN space_id TEXT;\n   ALTER TABLE profiles ADD COLUMN public_planet_index INT DEFAULT -1;\n2. 数据库 RLS 权限限制\n\n错误详情：' + profileError.message);
        saveBtn.textContent = '保存设置';
        saveBtn.disabled = false;
        return;
      }

      // 上传星球图片并整理数据
      saveBtn.textContent = '上传图片中...';
      const planetsForSave = [];
      const uploadTasks = [];

      for (let i = 0; i < portfolioData.length; i++) {
        const planet = portfolioData[i];
        const imagePaths = [];

        for (let j = 0; j < planet.images.length; j++) {
          const img = planet.images[j];
          if (img.file) {
            // 新上传的图片 — 先记录不等待
            const path = 'planets/' + currentSlug + '_planet' + i + '_img' + j + '_' + Date.now() + '.png';
            const task = sb.uploadImage(img.file, path).then(function (result) {
              if (result.error) {
                throw new Error('星球图片上传失败：' + result.error.message);
              }
              imagePaths.push(path);
            });
            uploadTasks.push(task);
          } else if (img.path) {
            // 已有图片
            imagePaths.push(img.path);
          }
        }

        planetsForSave.push({
          name: planet.name || '',
          images: imagePaths,
        });
      }

      // 并行上传所有图片
      if (uploadTasks.length > 0) {
        try {
          await Promise.all(uploadTasks);
        } catch (err) {
          alert(err.message);
          saveBtn.textContent = '保存设置';
          saveBtn.disabled = false;
          return;
        }
      }

      // 保存星球数据
      saveBtn.textContent = '保存数据中...';
      const { error: planetsError } = await sb.savePlanets(currentSlug, planetsForSave);
      if (planetsError) {
        console.error('星球保存失败:', planetsError);
        alert('星球数据保存失败！请检查数据库表结构和 RLS 权限。\n错误：' + planetsError.message);
        saveBtn.textContent = '保存设置';
        saveBtn.disabled = false;
        return;
      }

      // 显示分享链接
      const baseUrl = window.location.origin + window.location.pathname.replace('edit.html', 'index.html');
      const fullUrl = baseUrl + '?user=' + currentSlug;
      shareUrl.value = fullUrl;
      shareLink.style.display = 'block';

      // 保存 slug 到 localStorage 方便下次编辑
      localStorage.setItem('my_galaxy_slug', currentSlug);

      // 跳转到个人主页
      window.location.href = fullUrl;

    } catch (err) {
      console.error('保存出错:', err);
      alert('保存失败：' + (err.message || '请检查网络连接'));
    }

    saveBtn.textContent = '保存设置';
    saveBtn.disabled = false;
  });

  copyBtn.addEventListener('click', function () {
    shareUrl.select();
    document.execCommand('copy');
    alert('链接已复制！');
  });

  /* ===== 加载已有数据 ===== */
  async function loadExistingData() {
    const savedSlug = localStorage.getItem('my_galaxy_slug');
    if (!savedSlug) {
      // 默认4个空星球
      portfolioData = [
        { name: '', images: [] },
        { name: '', images: [] },
        { name: '', images: [] },
        { name: '', images: [] },
      ];
      renderPlanetCards();
      return;
    }

    currentSlug = savedSlug;

    try {
      // 加载 profile
      const { data: profile, error: profileError } = await sb.getProfile(currentSlug);
      if (!profileError && profile) {
        if (profile.avatar_url) {
          avatarPreview.src = profile.avatar_url;
        }
        if (profile.ig_link) igLink.value = profile.ig_link;
        if (profile.xhs_link) xhsLink.value = profile.xhs_link;
        if (profile.dy_link) dyLink.value = profile.dy_link;
        if (profile.space_id) {
          const input = document.getElementById('space-id-input');
          if (input) {
            const parts = profile.space_id.split('-');
            input.value = parts[1] || '134340';
          }
          originalSpaceId = profile.space_id; // 记录原来的ID
        }
        if (profile.public_planet_index !== null && profile.public_planet_index !== undefined) {
          publicPlanetIndex = profile.public_planet_index;
        } else {
          publicPlanetIndex = -1;
        }
      }

      // 加载星球数据
      const { data: planets, error: planetsError } = await sb.getPlanets(currentSlug);
      if (!planetsError && planets && planets.length > 0) {
        portfolioData = planets.map(function (p) {
          return {
            name: p.name || '',
            images: (p.images || []).map(function (img) {
              if (typeof img === 'string') {
                return { path: img, url: sb.getImageUrl(img) };
              }
              return img;
            }),
          };
        });
      } else {
        portfolioData = [
          { name: '', images: [] },
          { name: '', images: [] },
          { name: '', images: [] },
          { name: '', images: [] },
        ];
      }

      renderPlanetCards();

      // 显示分享链接
      const baseUrl = window.location.origin + window.location.pathname.replace('edit.html', 'index.html');
      const fullUrl = baseUrl + '?user=' + currentSlug;
      shareUrl.value = fullUrl;
      shareLink.style.display = 'block';

    } catch (err) {
      console.error('加载数据失败:', err);
      portfolioData = [
        { name: '', images: [] },
        { name: '', images: [] },
        { name: '', images: [] },
        { name: '', images: [] },
      ];
      renderPlanetCards();
    }
  }

  loadExistingData();

})();
