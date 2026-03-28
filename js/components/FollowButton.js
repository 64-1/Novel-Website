/**
 * Follow Button Component
 * Toggle follow/unfollow state with optimistic UI
 */

import { toast } from '../services/ToastService.js';

export function createFollowButton(options = {}) {
  const {
    isFollowing = false,
    onToggle = null
  } = options;

  let following = isFollowing;
  let loading = false;

  const button = document.createElement('button');
  button.className = `follow-btn ${following ? 'follow-btn--following' : ''}`;
  button.setAttribute('aria-pressed', following);

  function render() {
    button.className = `follow-btn ${following ? 'follow-btn--following' : ''} ${loading ? 'follow-btn--loading' : ''}`;
    button.setAttribute('aria-pressed', following);
    button.disabled = loading;

    button.innerHTML = loading
      ? `<span class="follow-btn__spinner"></span>`
      : following
        ? `<svg class="follow-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已关注`
        : `<svg class="follow-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> + 关注`;
  }

  function handleClick() {
    if (loading) return;

    loading = true;
    render();

    // Simulate API call
    setTimeout(() => {
      following = !following;
      loading = false;

      // Trigger callback
      if (onToggle) {
        onToggle(following);
      }

      // Show toast
      if (following) {
        toast.success('已关注');
      } else {
        toast.info('已取消关注');
      }

      render();
    }, 400);
  }

  button.addEventListener('click', handleClick);

  render();

  return {
    element: button,
    setFollowing: (value) => {
      following = value;
      render();
    },
    destroy: () => {
      button.removeEventListener('click', handleClick);
    }
  };
}
