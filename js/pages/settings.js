/**
 * Settings Page
 * User account settings
 */

import { authService } from '../services/AuthService.js';
import { createUserAvatarMenu } from '../components/UserAvatarMenu.js';

document.addEventListener('DOMContentLoaded', () => {
  initSettingsPage();
});

function initSettingsPage() {
  const authGate = document.getElementById('authGate');
  const settingsContent = document.getElementById('settingsContent');
  const settingsFooter = document.getElementById('settingsFooter');
  const headerAuth = document.getElementById('headerAuth');
  const navItems = document.querySelectorAll('.settings-nav__item');
  const sections = document.querySelectorAll('.settings-section');

  const user = authService.getUser();

  if (!user) {
    authGate.hidden = false;
    settingsContent.hidden = true;
    settingsFooter.hidden = true;
    return;
  }

  authGate.hidden = true;
  settingsContent.hidden = false;
  settingsFooter.hidden = false;

  // Initialize avatar menu
  if (headerAuth) {
    createUserAvatarMenu({
      container: headerAuth,
      onNavigate: (action, href) => {
        if (action === 'logout') {
          window.location.href = '/';
        } else if (href) {
          window.location.href = href;
        }
      }
    });
  }

  // Load user data into form
  loadUserData(user);

  // Handle navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.getAttribute('href').slice(1);

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(target)?.classList.add('active');
    });
  });

  // Handle forms
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileSubmit);
  document.getElementById('accountForm')?.addEventListener('submit', handleAccountSubmit);
  document.getElementById('preferencesForm')?.addEventListener('submit', handlePreferencesSubmit);
  document.getElementById('notificationsForm')?.addEventListener('submit', handleNotificationsSubmit);

  // Font size range display
  const fontSizeRange = document.getElementById('fontSize');
  const rangeValue = document.querySelector('.range-value');
  fontSizeRange?.addEventListener('input', (e) => {
    if (rangeValue) rangeValue.textContent = e.target.value + 'px';
  });
}

function loadUserData(user) {
  const avatarPreview = document.getElementById('avatarPreview');
  const displayName = document.getElementById('displayName');
  const bio = document.getElementById('bio');
  const location = document.getElementById('location');
  const website = document.getElementById('website');
  const email = document.getElementById('email');

  if (avatarPreview) avatarPreview.src = user.avatar || '';
  if (displayName) displayName.value = user.displayName || '';
  if (bio) bio.value = user.bio || '';
  if (location) location.value = user.location || '';
  if (website) website.value = user.website || '';
  if (email) email.value = user.email || '';
}

function handleProfileSubmit(e) {
  e.preventDefault();
  const displayName = document.getElementById('displayName')?.value;
  const bio = document.getElementById('bio')?.value;
  const location = document.getElementById('location')?.value;
  const website = document.getElementById('website')?.value;

  authService.updateProfile({ displayName, bio, location, website });
  showSuccess('个人资料已更新');
}

function handleAccountSubmit(e) {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;

  if (newPassword !== confirmPassword) {
    showError('两次输入的密码不一致');
    return;
  }

  if (newPassword && newPassword.length < 6) {
    showError('密码长度至少为6位');
    return;
  }

  showSuccess('密码已更新');
}

function handlePreferencesSubmit(e) {
  e.preventDefault();
  const theme = document.querySelector('input[name="theme"]:checked')?.value;
  const fontSize = document.getElementById('fontSize')?.value;

  localStorage.setItem('reader_theme', theme);
  localStorage.setItem('reader_fontSize', fontSize);

  showSuccess('阅读偏好已保存');
}

function handleNotificationsSubmit(e) {
  e.preventDefault();
  showSuccess('通知设置已保存');
}

function showSuccess(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast--success';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast--error';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
