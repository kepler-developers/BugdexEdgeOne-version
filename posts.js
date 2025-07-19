export async function onRequest({ request, env }) {
  const { pathname } = new URL(request.url);
  
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  if (pathname === '/api/posts' && request.method === 'GET') {
    try {
      // 获取所有帖子
      const posts = [];
      let cursor;
      
      do {
        const result = await env.bugdex_kv.list({ prefix: 'post:', cursor });
        for (const key of result.keys) {
          const post = await env.bugdex_kv.get(key.key, { type: 'json' });
          if (post) posts.push(post);
        }
        cursor = result.cursor;
      } while (!result.complete);
      
      // 按创建时间排序
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return new Response(JSON.stringify(posts), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '获取帖子失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/posts' && request.method === 'POST') {
    try {
      const { title, content, image_url, codefile_url } = await request.json();
      
      // 获取用户信息（从 token）
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 创建帖子
      const postId = `post_${Date.now()}`;
      const post = {
        id: postId,
        title,
        content,
        image_url,
        codefile_url,
        username: userData.username,
        likes_count: 0,
        created_at: new Date().toISOString()
      };
      
      await env.bugdex_kv.put(`post:${postId}`, JSON.stringify(post));
      
      return new Response(JSON.stringify(post), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '发布帖子失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname.startsWith('/api/posts/') && pathname.endsWith('/like') && request.method === 'POST') {
    try {
      const postId = pathname.split('/')[3];
      
      // 获取用户信息
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 检查是否已经点赞
      const likeKey = `like:${postId}:${userData.username}`;
      const existingLike = await env.bugdex_kv.get(likeKey);
      
      if (existingLike) {
        return new Response(JSON.stringify({
          success: false,
          message: '已经点赞过了'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 添加点赞记录
      await env.bugdex_kv.put(likeKey, JSON.stringify({
        post_id: postId,
        username: userData.username,
        created_at: new Date().toISOString()
      }));
      
      // 更新帖子点赞数
      const postKey = `post:${postId}`;
      const post = await env.bugdex_kv.get(postKey, { type: 'json' });
      if (post) {
        post.likes_count = (post.likes_count || 0) + 1;
        await env.bugdex_kv.put(postKey, JSON.stringify(post));
      }
      
      return new Response(JSON.stringify({
        success: true,
        likes_count: post.likes_count
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '点赞失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comments') && request.method === 'POST') {
    try {
      const postId = pathname.split('/')[3];
      const { content } = await request.json();
      
      // 获取用户信息
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          message: '请先登录'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const userData = JSON.parse(atob(token));
      
      // 创建评论
      const commentId = `comment_${Date.now()}`;
      const comment = {
        id: commentId,
        post_id: postId,
        username: userData.username,
        content,
        created_at: new Date().toISOString()
      };
      
      await env.bugdex_kv.put(`comment:${commentId}`, JSON.stringify(comment));
      
      return new Response(JSON.stringify(comment), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '发表评论失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  return new Response(JSON.stringify({
    success: false,
    message: '接口不存在'
  }), {
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
} 