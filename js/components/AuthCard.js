/**
 * Auth Card Component
 * Login/Signup form card
 */

import { authService } from '../services/AuthService.js';
import { toast } from '../services/ToastService.js';

export function createAuthCard(options = {}) {
  const {
    mode = 'login', // 'login' | 'signup'
    onSuccess = null,
    onSwitchMode = null
  } = options;

  let currentMode = mode;
  let loading = false;

  const container = document.createElement('div');
  container.className = 'auth-card';

  function render() {
    container.innerHTML = `
      <div class="auth-card__header">
        <div class="auth-card__logo">
          <span class="logo-icon">星</span>
          <span class="logo-text">星海小说</span>
        </div>
        <h1 class="auth-card__title">${currentMode === 'login' ? '登录星海小说' : '注册星海小说'}</h1>
        <p class="auth-card__subtitle">
          ${currentMode === 'login'
            ? '欢迎回来，继续你的阅读与创作之旅'
            : '加入星海，开启你的创作之旅'
          }
        </p>
      </div>

      <form class="auth-card__form" id="authForm" novalidate>
        ${currentMode === 'signup' ? `
          <div class="form-group">
            <label for="nickname" class="form-label">昵称</label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              class="form-input"
              placeholder="你的昵称"
              autocomplete="nickname"
              required
              minlength="2"
              maxlength="20"
            />
            <span class="form-error" data-error="nickname"></span>
          </div>
          <div class="form-group">
            <label for="username" class="form-label">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              class="form-input"
              placeholder="用于个人主页 URL"
              autocomplete="username"
              required
              pattern="[a-zA-Z0-9_]+"
              minlength="3"
              maxlength="20"
            />
            <span class="form-hint">只能包含字母、数字和下划线，3-20个字符</span>
            <span class="form-error" data-error="username"></span>
          </div>
        ` : ''}

        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <input
            type="email"
            id="email"
            name="email"
            class="form-input"
            placeholder="your@email.com"
            autocomplete="email"
            required
          />
          <span class="form-error" data-error="email"></span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <input
            type="password"
            id="password"
            name="password"
            class="form-input"
            placeholder="${currentMode === 'signup' ? '至少6位字符' : '输入密码'}"
            autocomplete="${currentMode === 'login' ? 'current-password' : 'new-password'}"
            required
            ${currentMode === 'signup' ? 'minlength="6"' : ''}
          />
          <span class="form-error" data-error="password"></span>
        </div>

        ${currentMode === 'signup' ? `
          <div class="form-group">
            <label for="confirmPassword" class="form-label">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              class="form-input"
              placeholder="再次输入密码"
              autocomplete="new-password"
              required
            />
            <span class="form-error" data-error="confirmPassword"></span>
          </div>
        ` : ''}

        ${currentMode === 'login' ? `
          <div class="auth-card__extras">
            <label class="checkbox-label">
              <input type="checkbox" name="remember" />
              <span class="checkbox-custom"></span>
              记住我
            </label>
            <a href="/forgot-password.html" class="auth-card__forgot">忘记密码？</a>
          </div>
        ` : ''}

        ${currentMode === 'signup' ? `
          <div class="auth-card__terms">
            <label class="checkbox-label">
              <input type="checkbox" name="terms" required />
              <span class="checkbox-custom"></span>
              <span>我已阅读并同意 <a href="/terms.html">服务条款</a> 和 <a href="/privacy.html">隐私政策</a></span>
            </label>
            <span class="form-error" data-error="terms"></span>
          </div>
        ` : ''}

        <div class="form-error auth-card__form-error" id="formError" hidden></div>

        <button type="submit" class="btn primary auth-card__submit" ${loading ? 'disabled' : ''}>
          ${loading
            ? '<span class="btn-spinner"></span> 处理中...'
            : currentMode === 'login' ? '登录' : '注册'
          }
        </button>
      </form>

      <div class="auth-card__divider">
        <span>或</span>
      </div>

      <div class="auth-card__social">
        <button type="button" class="btn social-btn social-btn--google" disabled>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        <button type="button" class="btn social-btn social-btn--apple" disabled>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Apple
        </button>
      </div>

      <div class="auth-card__footer">
        ${currentMode === 'login'
          ? `还没有账号？<a href="?mode=signup" class="auth-card__switch">立即注册</a>`
          : `已有账号？<a href="?mode=login" class="auth-card__switch">立即登录</a>`
        }
      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    const form = container.querySelector('#authForm');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', handleSubmit);

    // Input validation on blur
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => clearFieldError(input));
    });

    // Mode switch links
    container.querySelectorAll('.auth-card__switch').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        switchMode(currentMode === 'login' ? 'signup' : 'login');
      });
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Clear previous errors
    clearAllErrors();

    // Validate
    if (!validateForm(data)) {
      return;
    }

    loading = true;
    render();

    try {
      if (currentMode === 'login') {
        await authService.login(data.email, data.password, data.remember === 'on');
        toast.success('登录成功！');
      } else {
        await authService.register({
          nickname: data.nickname,
          username: data.username,
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword
        });
        toast.success('注册成功！欢迎加入星海小说。');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to homepage or intended page
        const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
        window.location.href = redirect;
      }
    } catch (error) {
      showFormError(error.message || '操作失败，请稍后重试');
    } finally {
      loading = false;
      render();
    }
  }

  function validateForm(data) {
    let valid = true;

    // Email validation
    if (!data.email || !isValidEmail(data.email)) {
      showFieldError('email', '请输入有效的邮箱地址');
      valid = false;
    }

    // Password validation
    if (!data.password || data.password.length < 6) {
      showFieldError('password', '密码至少需要6位字符');
      valid = false;
    }

    if (currentMode === 'signup') {
      // Nickname validation
      if (!data.nickname || data.nickname.length < 2) {
        showFieldError('nickname', '昵称至少需要2个字符');
        valid = false;
      }

      // Username validation
      if (!data.username || !/^[a-zA-Z0-9_]+$/.test(data.username)) {
        showFieldError('username', '用户名只能包含字母、数字和下划线');
        valid = false;
      } else if (data.username.length < 3 || data.username.length > 20) {
        showFieldError('username', '用户名需要3-20个字符');
        valid = false;
      }

      // Confirm password
      if (data.password !== data.confirmPassword) {
        showFieldError('confirmPassword', '两次输入的密码不一致');
        valid = false;
      }

      // Terms
      if (!data.terms) {
        showFieldError('terms', '请阅读并同意服务条款和隐私政策');
        valid = false;
      }
    }

    return valid;
  }

  function validateField(input) {
    const name = input.name;
    const value = input.value;

    switch (name) {
      case 'email':
        if (value && !isValidEmail(value)) {
          showFieldError(name, '请输入有效的邮箱地址');
        }
        break;
      case 'username':
        if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
          showFieldError(name, '只能包含字母、数字和下划线');
        }
        break;
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFieldError(fieldName, message) {
    const errorEl = container.querySelector(`[data-error="${fieldName}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    const input = container.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.add('input-error');
    }
  }

  function clearFieldError(input) {
    const name = input.name;
    const errorEl = container.querySelector(`[data-error="${name}"]`);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
    input.classList.remove('input-error');
  }

  function clearAllErrors() {
    container.querySelectorAll('.form-error').forEach(el => {
      el.textContent = '';
      el.hidden = true;
    });
    container.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
    });
    const formError = container.querySelector('#formError');
    if (formError) {
      formError.hidden = true;
    }
  }

  function showFormError(message) {
    const formError = container.querySelector('#formError');
    if (formError) {
      formError.textContent = message;
      formError.hidden = false;
    }
  }

  function switchMode(mode) {
    currentMode = mode;
    render();
    if (onSwitchMode) {
      onSwitchMode(mode);
    }
  }

  // Initial render
  render();

  return {
    element: container,
    setMode: (mode) => {
      currentMode = mode;
      render();
    },
    getMode: () => currentMode
  };
}
