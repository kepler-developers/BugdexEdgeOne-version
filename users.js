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
  
  if (pathname === '/api/user/profile' && request.method === 'GET') {
    try {
      const { searchParams } = new URL(request.url);
      const username = searchParams.get('username');
      
      if (!username) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户名不能为空'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      const userKey = `user:${username}`;
      const user = await env.bugdex_kv.get(userKey, { type: 'json' });
      
      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户不存在'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 获取用户的帖子
      const posts = [];
      let cursor;
      
      do {
        const result = await env.bugdex_kv.list({ prefix: 'post:', cursor });
        for (const key of result.keys) {
          const post = await env.bugdex_kv.get(key.key, { type: 'json' });
          if (post && post.username === username) {
            posts.push(post);
          }
        }
        cursor = result.cursor;
      } while (!result.complete);
      
      return new Response(JSON.stringify({
        username: user.username,
        bio: user.bio,
        posts
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '获取用户信息失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/user/profile' && request.method === 'PUT') {
    try {
      const { username, bio } = await request.json();
      
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
      
      // 更新用户信息
      const userKey = `user:${userData.username}`;
      const user = await env.bugdex_kv.get(userKey, { type: 'json' });
      
      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户不存在'
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 更新用户信息
      user.username = username;
      user.bio = bio;
      
      await env.bugdex_kv.put(userKey, JSON.stringify(user));
      
      return new Response(JSON.stringify({
        username: user.username,
        bio: user.bio
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '更新用户信息失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/weekly' && request.method === 'GET') {
    try {
      // 获取每周排行榜
      const userStats = {};
      let cursor;
      
      // 统计每个用户的发帖数
      do {
        const result = await env.bugdex_kv.list({ prefix: 'post:', cursor });
        for (const key of result.keys) {
          const post = await env.bugdex_kv.get(key.key, { type: 'json' });
          if (post) {
            const username = post.username;
            userStats[username] = (userStats[username] || 0) + 1;
          }
        }
        cursor = result.cursor;
      } while (!result.complete);
      
      // 转换为数组并排序
      const ranking = Object.entries(userStats)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // 只取前10名
      
      return new Response(JSON.stringify(ranking), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '获取排行榜失败'
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