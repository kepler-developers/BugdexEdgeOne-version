// 全局数据
let posts = [];
let userProfile = {
  username: 'CurrentUser',
  bio: '这是你的个人简介，可以在"用户中心"编辑。',
  posts: []
};
let weeklyRanking = [];

// 获取所有帖子
async function fetchPosts() {
  try {
    const response = await fetch('/api/posts');
    if (response.ok) {
      posts = await response.json();
    }
  } catch (error) {
    console.error('获取帖子失败:', error);
  }
}

// 获取用户信息
async function fetchUserProfile(username) {
  try {
    const response = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
  return null;
}

// 获取排行榜
async function fetchWeeklyRanking() {
  try {
    const response = await fetch('/api/weekly');
    if (response.ok) {
      weeklyRanking = await response.json();
    }
  } catch (error) {
    console.error('获取排行榜失败:', error);
  }
}

// 清除导航高亮
function clearActiveNav() {
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.remove('active');
  });
}

// 路由函数：根据 section 渲染不同视图
async function goTo(section) {
  if (section === 'home') {
    if (!adminUnlocked) {
      homeClickCount++;
      if (homeClickCount > 3) homeClickCount = 1;
      weeklyClickCount = 0;
    }
  } else if (section === 'weekly') {
    if (!adminUnlocked && homeClickCount === 3) {
      weeklyClickCount++;
      if (weeklyClickCount > 3) weeklyClickCount = 1;
      if (weeklyClickCount === 3) {
        // 弹出密码输入框
        setTimeout(() => {
          const pwd = prompt('请输入管理员密码：');
          if (pwd === ADMIN_PASSWORD) {
            adminUnlocked = true;
            alert('验证成功，进入管理后台！');
            oldGoTo('admin');
          } else {
            alert('密码错误！');
            homeClickCount = 0;
            weeklyClickCount = 0;
          }
        }, 200);
        return;
      }
    } else {
      homeClickCount = 0;
      weeklyClickCount = 0;
    }
  } else if (section !== 'admin') {
    homeClickCount = 0;
    weeklyClickCount = 0;
  }
  if (section === 'admin' && !adminUnlocked) {
    alert('无权访问管理后台！');
    return;
  }
  clearActiveNav();
  const btn = document.querySelector(`.nav-button[data-section="${section}"]`);
  if (btn) btn.classList.add('active');

  const container = document.getElementById('posts-container');
  container.innerHTML = '';

  // 根据页面类型获取数据
  switch (section) {
    case 'user':
      await fetchUserProfile(userProfile.username);
      renderUserCenter(container);
      break;
    case 'weekly':
      await fetchWeeklyRanking();
      renderWeeklyRanking(container);
      break;
    case 'admin':
      await fetchPosts();
      renderAdminPanel(container);
      break;
    default:
      await fetchPosts();
      renderPosts(container);
  }
}

// 渲染帖子列表（首页）
function renderPosts(container) {
  // 先插入首页横幅
  const banner = document.createElement('div');
  banner.className = 'home-banner';
  banner.innerHTML = '<span>Who is the trouble maker?</span>';
  container.appendChild(banner);
  
  if (posts.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.textContent = '暂无帖子';
    emptyDiv.style.textAlign = 'center';
    emptyDiv.style.padding = '20px';
    emptyDiv.style.color = '#888';
    container.appendChild(emptyDiv);
    return;
  }
  
  posts.forEach((post, index) => {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.addEventListener('click', () => goToDetail(post.id || index));

    const userDiv = document.createElement('div');
    userDiv.className = 'username';
    userDiv.textContent = post.user ? post.user.username : post.username;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = post.content;

    postDiv.appendChild(userDiv);
    postDiv.appendChild(contentDiv);
    container.appendChild(postDiv);
  });
}

// 渲染帖子详情（弹窗形式）
async function goToDetail(postId) {
  // 从后端获取帖子详情
  let post;
  try {
    const response = await fetch(`/api/posts/${postId}`);
    if (response.ok) {
      post = await response.json();
    } else {
      console.error('获取帖子详情失败');
      return;
    }
  } catch (error) {
    console.error('获取帖子详情失败:', error);
    return;
  }

  // 构建弹窗内容
  const modal = document.getElementById('modal');
  modal.innerHTML = '';
  modal.style.display = 'flex';

  const content = document.createElement('div');
  content.className = 'modal-content';

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  content.appendChild(closeBtn);

  // 帖子头部（头像、用户名、时间）
  const header = document.createElement('div');
  header.className = 'modal-post-header';
  // 头像（首字母圆形）
  const avatar = document.createElement('div');
  avatar.className = 'modal-avatar';
  const username = post.user ? post.user.username : post.username;
  avatar.textContent = username ? username[0].toUpperCase() : '?';
  header.appendChild(avatar);
  // 用户名和时间
  const userInfo = document.createElement('div');
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'modal-username';
  usernameSpan.textContent = username;
  userInfo.appendChild(usernameSpan);
  const timeSpan = document.createElement('span');
  timeSpan.className = 'modal-time';
  timeSpan.textContent = new Date(post.created_at).toLocaleString();
  userInfo.appendChild(timeSpan);
  header.appendChild(userInfo);
  content.appendChild(header);

  // 帖子内容
  const postContentDiv = document.createElement('div');
  postContentDiv.className = 'modal-post-content';
  postContentDiv.textContent = post.content;
  content.appendChild(postContentDiv);

  // 图片展示
  if (post.image_url) {
    const imgWrap = document.createElement('div');
    imgWrap.style.margin = '12px 0 8px 0';
    imgWrap.style.display = 'flex';
    imgWrap.style.justifyContent = 'flex-start';
    
    const img = document.createElement('img');
    img.src = post.image_url;
    img.className = 'img-preview-thumb';
    img.style.maxWidth = '180px';
    img.style.maxHeight = '180px';
    imgWrap.appendChild(img);
    content.appendChild(imgWrap);
  }

  // 代码文件下载
  if (post.codefile_url) {
    const codeWrap = document.createElement('div');
    codeWrap.className = 'codefile-preview';
    
    const icon = document.createElement('span');
    icon.className = 'codefile-icon';
    icon.textContent = '💾';
    codeWrap.appendChild(icon);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = post.codefile_name || '代码文件';
    codeWrap.appendChild(nameSpan);
    
    const downloadBtn = document.createElement('a');
    downloadBtn.href = post.codefile_url;
    downloadBtn.download = post.codefile_name || 'codefile';
    downloadBtn.className = 'upload-btn';
    downloadBtn.style.padding = '4px 16px';
    downloadBtn.style.fontSize = '0.98em';
    downloadBtn.style.marginLeft = '8px';
    downloadBtn.textContent = '下载代码';
    codeWrap.appendChild(downloadBtn);
    content.appendChild(codeWrap);
  }

  // 点赞按钮和数量
  const likeBtn = document.createElement('button');
  likeBtn.className = 'like-btn';
  likeBtn.innerHTML = `<span class="like-icon">👍</span>点赞 <span>(${post.likes_count || 0})</span>`;
  likeBtn.onclick = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('请先登录');
        return;
      }
      
      const res = await fetch(`/api/posts/${postId}/like`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        post.likes_count = data.likes_count;
        likeBtn.innerHTML = `<span class="like-icon">👍</span>点赞 <span>(${post.likes_count})</span>`;
      } else {
        const error = await res.json();
        alert(error.error || '点赞失败');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      alert('点赞失败');
    }
  };
  content.appendChild(likeBtn);

  // 评论区
  const commentsSection = document.createElement('div');
  commentsSection.className = 'comments-section';
  const commentsTitle = document.createElement('div');
  commentsTitle.className = 'comments-title';
  commentsTitle.textContent = '评论';
  commentsSection.appendChild(commentsTitle);

  const commentList = document.createElement('ul');
  commentList.className = 'comment-list';
  function renderComments() {
    commentList.innerHTML = '';
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        const li = document.createElement('li');
        // 用户名
        const userSpan = document.createElement('span');
        userSpan.className = 'comment-user';
        userSpan.textContent = c.User ? c.User.username : c.username;
        li.appendChild(userSpan);
        // 内容
        const contentSpan = document.createElement('span');
        contentSpan.textContent = c.content;
        li.appendChild(contentSpan);
        // 时间
        if (c.created_at) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'comment-time';
          timeSpan.textContent = `  ${new Date(c.created_at).toLocaleString()}`;
          li.appendChild(timeSpan);
        }
        commentList.appendChild(li);
      });
    } else {
      const emptyLi = document.createElement('li');
      emptyLi.textContent = '暂无评论';
      emptyLi.style.textAlign = 'center';
      emptyLi.style.color = '#888';
      emptyLi.style.fontStyle = 'italic';
      commentList.appendChild(emptyLi);
    }
  }
  renderComments();
  commentsSection.appendChild(commentList);

  // 评论输入框
  const commentInput = document.createElement('textarea');
  commentInput.className = 'comment-input';
  commentInput.placeholder = '写下你的评论...';
  commentsSection.appendChild(commentInput);

  // 提交评论按钮
  const submitBtn = document.createElement('button');
  submitBtn.className = 'comment-submit-btn';
  submitBtn.textContent = '发表评论';
  submitBtn.onclick = async () => {
    const content = commentInput.value.trim();
    if (!content) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }
    
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });
      
      if (res.ok) {
        const newComment = await res.json();
        if (!post.comments) post.comments = [];
        post.comments.unshift(newComment);
        // 动画：评论飞走
        commentInput.classList.add('fly-up');
        setTimeout(() => {
          commentInput.value = '';
          commentInput.classList.remove('fly-up');
          renderComments();
        }, 700);
      } else {
        const error = await res.json();
        alert(error.error || '评论失败');
      }
    } catch (error) {
      console.error('评论失败:', error);
      alert('评论失败');
    }
  };
  commentsSection.appendChild(submitBtn);

  content.appendChild(commentsSection);
  modal.appendChild(content);

  // 点击遮罩关闭弹窗
  modal.onclick = function(e) {
    if (e.target === modal) modal.style.display = 'none';
  };
}

// 渲染用户中心
function renderUserCenter(container) {
  container.innerHTML = '';
  // 个人信息区
  const title = document.createElement('h2');
  title.textContent = `${userProfile.username} 的个人中心`;
  container.appendChild(title);

  // 昵称和简介
  const profileBox = document.createElement('div');
  profileBox.style.marginBottom = '18px';

  // 昵称
  const nameLabel = document.createElement('span');
  nameLabel.textContent = '昵称：';
  profileBox.appendChild(nameLabel);
  const nameSpan = document.createElement('span');
  nameSpan.textContent = userProfile.username;
  nameSpan.style.fontWeight = 'bold';
  profileBox.appendChild(nameSpan);

  // 简介
  const bioLabel = document.createElement('span');
  bioLabel.textContent = '   简介：';
  bioLabel.style.marginLeft = '16px';
  profileBox.appendChild(bioLabel);
  const bioSpan = document.createElement('span');
  bioSpan.textContent = userProfile.bio;
  profileBox.appendChild(bioSpan);

  // 编辑按钮
  const editBtn = document.createElement('button');
  editBtn.textContent = '编辑';
  editBtn.style.marginLeft = '18px';
  editBtn.className = 'comment-submit-btn';
  profileBox.appendChild(editBtn);

  // 编辑表单
  let editing = false;
  editBtn.onclick = () => {
    if (editing) return;
    editing = true;
    // 替换为输入框
    nameSpan.innerHTML = `<input type='text' value='${userProfile.username}' id='edit-username' style='width:90px;'>`;
    bioSpan.innerHTML = `<input type='text' value='${userProfile.bio}' id='edit-bio' style='width:220px;'>`;
    editBtn.style.display = 'none';
    // 保存/取消按钮
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.className = 'comment-submit-btn';
    saveBtn.style.marginRight = '10px';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'comment-submit-btn';
    cancelBtn.style.marginLeft = '8px';
    profileBox.appendChild(saveBtn);
    profileBox.appendChild(cancelBtn);
    saveBtn.onclick = async () => {
      const newName = document.getElementById('edit-username').value.trim();
      const newBio = document.getElementById('edit-bio').value.trim();
      if (!newName) return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('请先登录');
        return;
      }
      
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ username: newName, bio: newBio })
        });
        
        if (res.ok) {
          const data = await res.json();
          userProfile.username = data.username;
          userProfile.bio = data.bio;
          nameSpan.textContent = data.username;
          bioSpan.textContent = data.bio;
          saveBtn.remove();
          cancelBtn.remove();
          editBtn.style.display = '';
          editing = false;
          // 重新渲染"我的帖子"标题
          postsTitle.textContent = `${userProfile.username} 的帖子`;
        } else {
          const error = await res.json();
          alert(error.error || '更新失败');
        }
      } catch (error) {
        console.error('更新失败:', error);
        alert('更新失败');
      }
    };
    cancelBtn.onclick = () => {
      nameSpan.textContent = userProfile.username;
      bioSpan.textContent = userProfile.bio;
      saveBtn.remove();
      cancelBtn.remove();
      editBtn.style.display = '';
      editing = false;
    };
  };
  container.appendChild(profileBox);

  // 发布新帖子区
  const newPostBox = document.createElement('div');
  newPostBox.style.marginBottom = '24px';
  const newPostBtn = document.createElement('button');
  newPostBtn.textContent = '发布新帖子';
  newPostBtn.className = 'comment-submit-btn';
  newPostBox.appendChild(newPostBtn);
  container.appendChild(newPostBox);

  // 新帖子编辑区（初始隐藏）
  let editorVisible = false;
  let editorDiv = null;
  newPostBtn.onclick = () => {
    if (editorVisible) return;
    editorVisible = true;
    editorDiv = document.createElement('div');
    editorDiv.style.marginTop = '10px';
    editorDiv.style.background = '#23242b';
    editorDiv.style.borderRadius = '8px';
    editorDiv.style.padding = '18px';
    editorDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';

    // 上传区美化容器
    const uploadArea = document.createElement('div');
    uploadArea.className = 'upload-area';

    // 输入框
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-input';
    textarea.placeholder = '写下你的新帖子内容...';
    textarea.style.minHeight = '60px';
    uploadArea.appendChild(textarea);

    // 图片上传美化
    const imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/*';
    imgInput.multiple = false;
    imgInput.id = 'img-upload-input';
    const imgBtn = document.createElement('label');
    imgBtn.className = 'upload-btn';
    imgBtn.setAttribute('for', 'img-upload-input');
    imgBtn.innerHTML = '🖼️ 选择图片';
    uploadArea.appendChild(imgBtn);
    uploadArea.appendChild(imgInput);
    // 图片预览
    const imgPreviewWrap = document.createElement('div');
    imgPreviewWrap.className = 'img-preview-wrap';
    uploadArea.appendChild(imgPreviewWrap);
    imgInput.onchange = () => {
      imgPreviewWrap.innerHTML = '';
      if (imgInput.files && imgInput.files[0]) {
        const file = imgInput.files[0];
        const reader = new FileReader();
        reader.onload = e => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'img-preview-thumb';
          imgPreviewWrap.appendChild(img);
          // 移除按钮
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-btn';
          removeBtn.innerHTML = '✖️';
          removeBtn.title = '移除图片';
          removeBtn.onclick = (ev) => {
            ev.preventDefault();
            imgInput.value = '';
            imgPreviewWrap.innerHTML = '';
          };
          imgPreviewWrap.appendChild(removeBtn);
        };
        reader.readAsDataURL(file);
      }
    };

    // 代码文件上传美化
    const codeInput = document.createElement('input');
    codeInput.type = 'file';
    codeInput.accept = '.js,.py,.java,.txt,.ts,.cpp,.c,.json,.html,.css';
    codeInput.multiple = false;
    codeInput.id = 'code-upload-input';
    const codeBtn = document.createElement('label');
    codeBtn.className = 'upload-btn';
    codeBtn.setAttribute('for', 'code-upload-input');
    codeBtn.innerHTML = '📄 选择代码文件';
    uploadArea.appendChild(codeBtn);
    uploadArea.appendChild(codeInput);
    // 代码文件预览
    const codePreview = document.createElement('div');
    codePreview.className = 'codefile-preview';
    uploadArea.appendChild(codePreview);
    codeInput.onchange = () => {
      codePreview.innerHTML = '';
      if (codeInput.files && codeInput.files[0]) {
        const file = codeInput.files[0];
        const icon = document.createElement('span');
        icon.className = 'codefile-icon';
        icon.textContent = '💾';
        codePreview.appendChild(icon);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name;
        codePreview.appendChild(nameSpan);
        // 移除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '✖️';
        removeBtn.title = '移除文件';
        removeBtn.onclick = (ev) => {
          ev.preventDefault();
          codeInput.value = '';
          codePreview.innerHTML = '';
        };
        codePreview.appendChild(removeBtn);
      }
    };

    editorDiv.appendChild(uploadArea);

    // 发布/取消按钮
    const postBtn = document.createElement('button');
    postBtn.textContent = '发布';
    postBtn.className = 'comment-submit-btn';
    postBtn.style.marginRight = '10px';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'comment-submit-btn';
    editorDiv.appendChild(postBtn);
    editorDiv.appendChild(cancelBtn);
    newPostBox.appendChild(editorDiv);
    // 发布逻辑
    postBtn.onclick = async () => {
      const content = textarea.value.trim();
      if (!content) return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('请先登录');
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('title', content.substring(0, 50)); // 使用内容前50字符作为标题
        formData.append('content', content);
        
        if (imgInput.files[0]) {
          formData.append('image', imgInput.files[0]);
        }
        if (codeInput.files[0]) {
          formData.append('codefile', codeInput.files[0]);
        }
        
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (res.ok) {
          const newPost = await res.json();
          posts.unshift(newPost);
          
          // 刷新页面数据
          await fetchPosts();
          await fetchWeeklyRanking();
          
          // 动画：新帖子卡片飞走
          renderUserCenter(container);
          setTimeout(() => {
            const firstPost = container.querySelector('.post');
            if (firstPost) {
              firstPost.classList.add('fly-up');
              setTimeout(() => {
                renderUserCenter(container);
              }, 700);
            }
          }, 10);
          
          // 关闭编辑器
          editorDiv.remove();
          editorVisible = false;
        } else {
          const error = await res.json();
          alert(error.error || '发布失败');
        }
      } catch (error) {
        console.error('发布失败:', error);
        alert('发布失败');
      }
    };
    cancelBtn.onclick = () => {
      editorDiv.remove();
      editorVisible = false;
    };
  };

  // 我的帖子
  const postsTitle = document.createElement('h3');
  postsTitle.textContent = `${userProfile.username} 的帖子`;
  container.appendChild(postsTitle);

  // 用户中心"我的帖子"可点击，列表不显示删除按钮
  userProfile.posts.forEach((post, idx) => {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    // 内容区
    const contentArea = document.createElement('div');
    contentArea.className = 'post-content-area';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = post.content;
    contentArea.appendChild(contentDiv);
    postDiv.appendChild(contentArea);
    // 操作区不再添加删除按钮
    // 点击帖子弹窗详情
    postDiv.style.cursor = 'pointer';
    postDiv.onclick = () => showUserPostDetailModal(idx);
    container.appendChild(postDiv);
  });
}

// 渲染每周排行
function renderWeeklyRanking(container) {
  const title = document.createElement('h2');
  title.textContent = '每周排行';
  container.appendChild(title);

  const list = document.createElement('ol');
  list.className = 'ranking-list';
  // 固定10个槽位
  const topTen = weeklyRanking.slice(0, 10);
  for (let idx = 0; idx < 10; idx++) {
    const item = topTen[idx];
    const li = document.createElement('li');
    li.style.position = 'relative';
    if (item) {
    const rankSpan = document.createElement('span');
    rankSpan.className = 'rank';
    rankSpan.textContent = idx + 1;
    const userSpan = document.createElement('span');
    userSpan.className = 'username';
    userSpan.textContent = item.username;
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = `${item.count} 帖子`;
    li.append(rankSpan, userSpan, countSpan);
    } else {
      // 空槽
      li.style.opacity = '0.4';
      li.style.fontStyle = 'italic';
      li.style.color = '#888';
      li.innerHTML = `<span class="rank">${idx + 1}</span> <span class="username">（空）</span> <span class="count"></span>`;
    }
    list.appendChild(li);
  }
  // 不再添加分割线和省略号
  container.appendChild(list);
}

// 管理后台页面
function renderAdminPanel(container) {
  const title = document.createElement('h2');
  title.textContent = '管理后台 - 帖子管理';
  container.appendChild(title);

  // 帖子列表
  posts.forEach((post, index) => {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.style.position = 'relative';

    const userDiv = document.createElement('div');
    userDiv.className = 'username';
    userDiv.textContent = post.username;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = post.content;
    postDiv.appendChild(userDiv);
    postDiv.appendChild(contentDiv);

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.className = 'comment-submit-btn delete-btn';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '16px';
    delBtn.style.right = '16px';
    delBtn.style.background = 'linear-gradient(90deg, #e53935 60%, #ff7043 100%)';
    delBtn.style.fontWeight = 'bold';
    delBtn.onclick = async () => {
      if (!confirm('确定要删除这条帖子吗？')) return;
      // 预留后端接口
      /*
      await fetch(`/api/posts/${index}`, { method: 'DELETE' });
      */
      const delUser = post.username;
      posts.splice(index, 1);
      const rankUser = weeklyRanking.find(item => item.username === delUser);
      if (rankUser) {
        rankUser.count--;
        if (rankUser.count <= 0) {
          const idx = weeklyRanking.indexOf(rankUser);
          if (idx !== -1) weeklyRanking.splice(idx, 1);
        }
      }
      showAdminPanelModal();
    };
    postDiv.appendChild(delBtn);

    container.appendChild(postDiv);
  });
}

// 管理后台弹窗
function showAdminPanelModal() {
  // 创建弹窗遮罩
  let modal = document.getElementById('admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.65)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '2000';
    document.body.appendChild(modal);
  }
  modal.innerHTML = '';
  modal.style.display = 'flex';

  // 弹窗内容
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.minWidth = '420px';
  content.style.maxWidth = '600px';
  content.style.width = '90vw';
  content.style.maxHeight = '85vh';
  content.style.overflowY = 'auto';
  content.style.position = 'relative';

  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  content.appendChild(closeBtn);

  // 标题
  const title = document.createElement('h2');
  title.textContent = '管理后台 - 帖子管理';
  content.appendChild(title);

  // 帖子列表
  posts.forEach((post, index) => {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.style.position = 'relative';

    const userDiv = document.createElement('div');
    userDiv.className = 'username';
    userDiv.textContent = post.username;
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = post.content;
    postDiv.appendChild(userDiv);
    postDiv.appendChild(contentDiv);

    // 删除按钮
    const delBtn = document.createElement('button');
    delBtn.textContent = '删除';
    delBtn.className = 'comment-submit-btn delete-btn';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '16px';
    delBtn.style.right = '16px';
    delBtn.style.background = 'linear-gradient(90deg, #e53935 60%, #ff7043 100%)';
    delBtn.style.fontWeight = 'bold';
    delBtn.onclick = async () => {
      if (!confirm('确定要删除这条帖子吗？')) return;
      // 预留后端接口
      /*
      await fetch(`/api/posts/${index}`, { method: 'DELETE' });
      */
      // 1. 先找到被删帖子的用户名
      const delUser = post.username;
      // 2. 从posts数组移除
      posts.splice(index, 1);
      // 3. 同步更新排行榜数据
      const rankUser = weeklyRanking.find(item => item.username === delUser);
      if (rankUser) {
        rankUser.count--;
        if (rankUser.count <= 0) {
          // 帖子数为0则移除该用户
          const idx = weeklyRanking.indexOf(rankUser);
          if (idx !== -1) weeklyRanking.splice(idx, 1);
        }
      }
      // 4. 重新渲染弹窗内容
      showAdminPanelModal();
    };
    postDiv.appendChild(delBtn);

    content.appendChild(postDiv);
  });

  modal.appendChild(content);
  // 点击遮罩关闭弹窗
  modal.onclick = function(e) {
    if (e.target === modal) modal.style.display = 'none';
  };
}

// 用户帖子详情弹窗
function showUserPostDetailModal(idx) {
  const post = userProfile.posts[idx];
  let modal = document.getElementById('modal');
  modal.innerHTML = '';
  modal.style.display = 'flex';
  const content = document.createElement('div');
  content.className = 'modal-content';
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  content.appendChild(closeBtn);
  // 标题
  const title = document.createElement('h2');
  title.textContent = '我的帖子详情';
  content.appendChild(title);
  // 内容
  const postContent = document.createElement('div');
  postContent.className = 'modal-post-content';
  postContent.textContent = post.content;
  content.appendChild(postContent);
  // 操作按钮区
  const actions = document.createElement('div');
  actions.className = 'post-actions';
  // 删除按钮（叉icon+Delete文字）
  const delBtn = document.createElement('button');
  delBtn.innerHTML = '✖️ Delete';
  delBtn.className = 'comment-submit-btn delete-btn icon-btn';
  delBtn.setAttribute('aria-label', '删除');
  delBtn.onclick = async () => {
    if (!confirm('确定要删除这条帖子吗？')) return;
    // 预留后端接口
    /*
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    */
    userProfile.posts.splice(idx, 1);
    const globalIdx = posts.findIndex(p => p.username === userProfile.username && p.content === post.content);
    if (globalIdx !== -1) {
      posts.splice(globalIdx, 1);
      const rankUser = weeklyRanking.find(item => item.username === userProfile.username);
      if (rankUser) {
        rankUser.count--;
        if (rankUser.count <= 0) {
          const idx = weeklyRanking.indexOf(rankUser);
          if (idx !== -1) weeklyRanking.splice(idx, 1);
        }
      }
    }
    modal.style.display = 'none';
    renderUserCenter(document.getElementById('posts-container'));
  };
  actions.appendChild(delBtn);
  content.appendChild(actions);
  modal.appendChild(content);
  // 点击遮罩关闭弹窗
  modal.onclick = function(e) {
    if (e.target === modal) modal.style.display = 'none';
  };
}

// 渲染设置页
function renderSettings(container) {
  container.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = '设置';
  container.appendChild(title);

  // 主题切换
  const themeBox = document.createElement('div');
  themeBox.style.margin = '18px 0';
  const themeLabel = document.createElement('span');
  themeLabel.textContent = '主题：';
  themeLabel.style.marginRight = '12px';
  themeBox.appendChild(themeLabel);
  const themeSelect = document.createElement('select');
  themeSelect.innerHTML = '<option value="dark">暗色</option><option value="light">亮色</option>';
  themeSelect.value = localStorage.getItem('theme') || 'dark';
  themeSelect.onchange = function() {
    setTheme(themeSelect.value);
    localStorage.setItem('theme', themeSelect.value);
  };
  themeBox.appendChild(themeSelect);
  container.appendChild(themeBox);

  // 语言切换
  const langBox = document.createElement('div');
  langBox.style.margin = '18px 0';
  const langLabel = document.createElement('span');
  langLabel.textContent = '语言/Language：';
  langLabel.style.marginRight = '12px';
  langBox.appendChild(langLabel);
  const langSelect = document.createElement('select');
  langSelect.innerHTML = '<option value="zh">中文</option><option value="en">English</option>';
  langSelect.value = localStorage.getItem('lang') || 'zh';
  langSelect.onchange = function() {
    setLang(langSelect.value);
    localStorage.setItem('lang', langSelect.value);
    renderSettings(container); // 立即刷新设置页语言
  };
  langBox.appendChild(langSelect);
  container.appendChild(langBox);

  // 预留更多设置项
  const moreBox = document.createElement('div');
  moreBox.style.margin = '18px 0';
  moreBox.innerHTML = '<span style="color:#aaa;">更多设置功能，敬请期待...</span>';
  container.appendChild(moreBox);
}

// 主题切换实现
function setTheme(theme) {
  if (theme === 'light') {
    document.body.style.background = '#f5f5f5';
    document.body.style.color = '#222';
  } else {
    document.body.style.background = '#121212';
    document.body.style.color = '#e0e0e0';
  }
}
// 页面加载时自动应用主题
setTheme(localStorage.getItem('theme') || 'dark');

// 语言切换实现（简单示例，实际可扩展为多语言字典）
function setLang(lang) {
  window._lang = lang;
  // 可扩展：根据lang动态切换页面文本
}
setLang(localStorage.getItem('lang') || 'zh');

// ========== 登录/注册相关 ==========
const loginRegisterBtn = document.getElementById('loginRegisterBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('authError');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const userNickname = document.getElementById('userNickname');
const logoutBtn = document.getElementById('logoutBtn');

function showAuthModal() {
  authModal.style.display = 'flex';
  authError.textContent = '';
}
function hideAuthModal() {
  authModal.style.display = 'none';
  loginForm.reset();
  registerForm.reset();
  authError.textContent = '';
}
loginRegisterBtn.onclick = showAuthModal;
closeAuthModal.onclick = hideAuthModal;
authModal.onclick = e => { if (e.target === authModal) hideAuthModal(); };

// 切换登录/注册
loginTab.onclick = () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.style.display = '';
  registerForm.style.display = 'none';
  authError.textContent = '';
};
registerTab.onclick = () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  loginForm.style.display = 'none';
  registerForm.style.display = '';
  authError.textContent = '';
};

// 登录表单提交
loginForm.onsubmit = async e => {
  e.preventDefault();
  const username = loginForm.loginUsername.value.trim();
  const password = loginForm.loginPassword.value;
  if (!username || !password) {
    authError.textContent = '请输入用户名和密码';
    return;
  }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      setUserInfo(data.user);
      hideAuthModal();
    } else {
      authError.textContent = data.message || '登录失败';
    }
  } catch (err) {
    authError.textContent = '网络错误，请稍后再试';
  }
};

// ========== 注册邮箱验证码相关 ==========
const registerEmail = document.getElementById('registerEmail');
const registerCode = document.getElementById('registerCode');
const sendCodeBtn = document.getElementById('sendCodeBtn');
let codeTimer = null, codeTime = 0;

function validateEmail(email) {
  return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email);
}

sendCodeBtn.onclick = async () => {
  const email = registerEmail.value.trim();
  if (!validateEmail(email)) {
    authError.textContent = '请输入有效的邮箱地址';
    return;
  }
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = '发送中...';
  authError.textContent = '';
  try {
    const res = await fetch('/api/send_email_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.success) {
      startCodeTimer();
      authError.textContent = '验证码已发送，请查收邮箱';
    } else {
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '获取验证码';
      authError.textContent = data.message || '发送失败';
    }
  } catch {
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '获取验证码';
    authError.textContent = '网络错误，请稍后再试';
  }
};

function startCodeTimer() {
  codeTime = 60;
  sendCodeBtn.disabled = true;
  sendCodeBtn.textContent = codeTime + 's后重试';
  codeTimer = setInterval(() => {
    codeTime--;
    if (codeTime > 0) {
      sendCodeBtn.textContent = codeTime + 's后重试';
    } else {
      clearInterval(codeTimer);
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = '获取验证码';
    }
  }, 1000);
}

// 修改注册表单提交逻辑，增加邮箱和验证码
registerForm.onsubmit = async e => {
  e.preventDefault();
  const username = registerForm.registerUsername.value.trim();
  const email = registerForm.registerEmail.value.trim();
  const code = registerForm.registerCode.value.trim();
  const password = registerForm.registerPassword.value;
  const confirm = registerForm.registerConfirm.value;
  if (!username || !email || !code || !password || !confirm) {
    authError.textContent = '请填写所有字段';
    return;
  }
  if (!validateEmail(email)) {
    authError.textContent = '请输入有效的邮箱地址';
    return;
  }
  if (password !== confirm) {
    authError.textContent = '两次密码不一致';
    return;
  }
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, code })
    });
    const data = await res.json();
    if (data.success) {
      authError.textContent = '注册成功，请登录';
      setTimeout(() => {
        loginTab.click();
        authError.textContent = '';
      }, 1000);
    } else {
      authError.textContent = data.message || '注册失败';
    }
  } catch (err) {
    authError.textContent = '网络错误，请稍后再试';
  }
};

// 设置用户信息
function setUserInfo(user) {
  if (!user) return;
  loginRegisterBtn.style.display = 'none';
  userInfo.style.display = 'flex';
  userAvatar.src = user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(user.username);
  userNickname.textContent = user.nickname || user.username;
}
// 退出登录
logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  userInfo.style.display = 'none';
  loginRegisterBtn.style.display = '';
};

// 页面加载时自动获取用户信息
async function fetchUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('/api/user', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const data = await res.json();
      setUserInfo(data.user);
    } else {
      localStorage.removeItem('token');
    }
  } catch {}
}
fetchUserInfo();

// 页面加载完成后默认跳转到首页
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化数据
  await fetchPosts();
  await fetchWeeklyRanking();
  goTo('home');
});

// 隐藏管理后台入口逻辑
let homeClickCount = 0;
let weeklyClickCount = 0;
let adminUnlocked = false;
const ADMIN_PASSWORD = 'admin123'; // 可自定义

// 只保留一层goTo重写，settings分支优先判断
const oldGoTo = goTo;
goTo = function(section) {
  // 设置页优先判断
  if (section === 'settings') {
    clearActiveNav();
    const btn = document.querySelector(`.nav-button[data-section="settings"]`);
    if (btn) btn.classList.add('active');
    const container = document.getElementById('posts-container');
    renderSettings(container);
    return;
  }
  // 其它页面逻辑
  oldGoTo(section);
}; 