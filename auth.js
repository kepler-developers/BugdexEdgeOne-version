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
  
  // 邮件发送函数
  async function sendEmail(to, subject, content) {
    // 优先使用 SendGrid
    if (env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: env.SENDGRID_FROM_EMAIL },
            subject: subject,
            content: [{ type: 'text/html', value: content }],
          }),
        });
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.error('SendGrid error:', error);
      }
    }
    
    // 备用方案：Resend
    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
            to: [to],
            subject: subject,
            html: content,
          }),
        });
        
        if (response.ok) {
          return { success: true };
        }
      } catch (error) {
        console.error('Resend error:', error);
      }
    }
    
    // 备用方案：自定义 SMTP
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        // 这里需要实现 SMTP 发送逻辑
        // 由于 EdgeOne Functions 的限制，建议使用 SendGrid 或 Resend
        console.log('SMTP not implemented in EdgeOne Functions');
      } catch (error) {
        console.error('SMTP error:', error);
      }
    }
    
    return { success: false, error: 'No email service configured' };
  }
  
  if (pathname === '/api/login' && request.method === 'POST') {
    try {
      const { username, password } = await request.json();
      
      // 从 KV 获取用户信息
      const userKey = `user:${username}`;
      const user = await env.bugdex_kv.get(userKey, { type: 'json' });
      
      if (user && user.password === password) {
        // 生成 JWT token（简化版）
        const token = btoa(JSON.stringify({ username, exp: Date.now() + 86400000 }));
        
        return new Response(JSON.stringify({
          success: true,
          token,
          user: { username: user.username, bio: user.bio }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: '用户名或密码错误'
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '请求格式错误'
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/register' && request.method === 'POST') {
    try {
      const { username, email, password, code } = await request.json();
      
      // 验证邮箱验证码
      const codeKey = `email_code:${email}`;
      const codeData = await env.bugdex_kv.get(codeKey, { type: 'json' });
      
      if (!codeData || codeData.code !== code) {
        return new Response(JSON.stringify({
          success: false,
          message: '验证码错误或已过期'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 检查验证码是否过期（5分钟）
      if (Date.now() > codeData.expires_at) {
        return new Response(JSON.stringify({
          success: false,
          message: '验证码已过期'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 检查用户是否已存在
      const userKey = `user:${username}`;
      const existingUser = await env.bugdex_kv.get(userKey);
      
      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          message: '用户名已存在'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // 保存用户信息
      await env.bugdex_kv.put(userKey, JSON.stringify({
        username,
        email,
        password,
        bio: '这是你的个人简介，可以在"用户中心"编辑。',
        created_at: new Date().toISOString()
      }));
      
      // 删除已使用的验证码
      await env.bugdex_kv.delete(codeKey);
      
      return new Response(JSON.stringify({
        success: true,
        message: '注册成功'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '注册失败'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  if (pathname === '/api/send_email_code' && request.method === 'POST') {
    try {
      const { email } = await request.json();
      
      // 生成验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 保存验证码到 KV
      await env.bugdex_kv.put(`email_code:${email}`, JSON.stringify({
        code,
        created_at: Date.now(),
        expires_at: Date.now() + 300000 // 5分钟过期
      }));
      
      // 发送邮件
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">BugDex 验证码</h2>
          <p>您好！</p>
          <p>您的验证码是：</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">
            ${code}
          </div>
          <p>验证码有效期为 5 分钟，请尽快使用。</p>
          <p>如果这不是您的操作，请忽略此邮件。</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">此邮件由 BugDex 论坛系统自动发送</p>
        </div>
      `;
      
      const emailResult = await sendEmail(email, 'BugDex 验证码', emailContent);
      
      if (emailResult.success) {
        return new Response(JSON.stringify({
          success: true,
          message: '验证码已发送到您的邮箱'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        // 如果邮件发送失败，返回模拟成功（开发阶段）
        return new Response(JSON.stringify({
          success: true,
          message: '验证码已发送（模拟）',
          debug: '邮件服务未配置，使用模拟发送'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: '发送验证码失败'
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