/**
 * Music Player UI Module
 * Handles music selection dropdown and playback controls
 */

export function createMusicPlayerUI({
  musicSelect,
  playMusicButton,
  playMusicButtonLabel,
  volumeSlider,
  volumeValue,
  audioPlayer,
  showToast
} = {}) {
  if (!musicSelect || !audioPlayer) {
    return null;
  }

  let customSelectController = null;

  function updateMusicButtonUI() {
    if (!playMusicButton || !playMusicButtonLabel) return;

    const isPlaying = audioPlayer.getIsPlaying();
    const currentTrack = audioPlayer.getCurrentTrack();
    const selectedTrack = musicSelect?.value;

    if (isPlaying && currentTrack === selectedTrack) {
      playMusicButtonLabel.textContent = "暂停播放";
      playMusicButton.classList.add("playing");
    } else {
      playMusicButtonLabel.textContent = "播放预设";
      playMusicButton.classList.remove("playing");
    }
  }

  async function handlePlayClick() {
    const selectedTrack = musicSelect?.value || "ambient";
    const mood = musicSelect?.options[musicSelect.selectedIndex]?.text || "氛围配乐";

    try {
      const isPlaying = await audioPlayer.toggle(selectedTrack);

      if (isPlaying) {
        const musicMessage = `正在播放「${mood}」`;
        showToast?.(musicMessage);
      } else {
        showToast?.("音乐已暂停");
      }

      updateMusicButtonUI();
    } catch (err) {
      console.warn('Music playback failed:', err);
      showToast?.("音乐加载失败，请稍后再试");
      updateMusicButtonUI();
    }
  }

  function handleVolumeChange(e) {
    const volume = parseInt(e.target.value, 10);
    audioPlayer.setVolume(volume / 100);
    if (volumeValue) {
      volumeValue.textContent = `${volume}%`;
    }
  }

  function enhanceMusicSelect(nativeSelect) {
    const container = nativeSelect.closest("[data-music-select]");
    if (!container) {
      return null;
    }

    const trigger = container.querySelector(".music-select__trigger");
    const valueNode = container.querySelector(".music-select__value");
    const menu = container.querySelector(".music-select__menu");
    if (!trigger || !valueNode || !menu) {
      return null;
    }

    nativeSelect.setAttribute("aria-hidden", "true");
    nativeSelect.tabIndex = -1;
    menu.tabIndex = -1;

    let optionNodes = [];
    let isOpen = false;
    let activeIndex = Math.max(nativeSelect.selectedIndex, 0);
    const idPrefix = `music-option-${Math.random().toString(36).slice(2, 8)}-`;

    renderOptions();

    trigger.addEventListener("click", () => {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    trigger.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowDown":
        case "Down":
          event.preventDefault();
          if (!isOpen) {
            openMenu();
          }
          setActive(Math.min(activeIndex + 1, optionNodes.length - 1));
          break;
        case "ArrowUp":
        case "Up":
          event.preventDefault();
          if (!isOpen) {
            openMenu();
          }
          setActive(Math.max(activeIndex - 1, 0));
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (isOpen) {
            commitSelection(activeIndex);
          } else {
            openMenu();
          }
          break;
        case "Escape":
          if (isOpen) {
            event.preventDefault();
            closeMenu();
          }
          break;
        default:
          break;
      }
    });

    menu.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowDown":
        case "Down":
          event.preventDefault();
          setActive(Math.min(activeIndex + 1, optionNodes.length - 1));
          break;
        case "ArrowUp":
        case "Up":
          event.preventDefault();
          setActive(Math.max(activeIndex - 1, 0));
          break;
        case "Home":
          event.preventDefault();
          setActive(0);
          break;
        case "End":
          event.preventDefault();
          setActive(optionNodes.length - 1);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          commitSelection(activeIndex);
          break;
        case "Escape":
          event.preventDefault();
          closeMenu({ focusTrigger: true });
          break;
        default:
          break;
      }
    });

    nativeSelect.addEventListener("change", () => {
      const selectedIdx = nativeSelect.selectedIndex;
      updateSelectedState(selectedIdx);
      setActive(selectedIdx, { scroll: false });
      valueNode.textContent = nativeSelect.options[selectedIdx]?.text || "";
    });

    function renderOptions() {
      menu.innerHTML = "";
      optionNodes = [];
      const selectOptions = Array.from(nativeSelect.options || []);
      if (!selectOptions.length) {
        valueNode.textContent = "";
        return;
      }
      selectOptions.forEach((option, index) => {
        const item = document.createElement("li");
        item.className = "music-select__option";
        item.id = `${idPrefix}${index}`;
        item.setAttribute("role", "option");
        item.tabIndex = -1;
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.setAttribute("aria-selected", option.selected ? "true" : "false");
        if (option.selected) {
          activeIndex = index;
          item.classList.add("is-selected", "is-active");
          menu.setAttribute("aria-activedescendant", item.id);
          valueNode.textContent = option.textContent;
        }
        item.addEventListener("click", () => commitSelection(index));
        item.addEventListener("mouseenter", () => setActive(index, { scroll: false }));
        menu.appendChild(item);
        optionNodes.push(item);
      });

      if (activeIndex < 0 && optionNodes.length) {
        activeIndex = 0;
        optionNodes[0].classList.add("is-active");
        valueNode.textContent = selectOptions[0].textContent;
      }
      updateSelectedState(nativeSelect.selectedIndex);
    }

    function openMenu() {
      if (isOpen || !optionNodes.length) {
        return;
      }
      isOpen = true;
      container.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      menu.hidden = false;
      setActive(nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0);
      document.addEventListener("pointerdown", handleDocumentPointer, true);
      document.addEventListener("focusin", handleFocusIn, true);
      document.addEventListener("keydown", handleGlobalKeydown, true);
      requestAnimationFrame(() => {
        menu.focus({ preventScroll: true });
      });
    }

    function closeMenu({ focusTrigger = false } = {}) {
      if (!isOpen) {
        return;
      }
      isOpen = false;
      container.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      document.removeEventListener("pointerdown", handleDocumentPointer, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleGlobalKeydown, true);
      if (focusTrigger) {
        trigger.focus({ preventScroll: true });
      }
    }

    function setActive(index, { scroll = true } = {}) {
      if (!optionNodes.length) {
        return;
      }
      const safeIndex = Math.max(0, Math.min(index, optionNodes.length - 1));
      optionNodes.forEach((node, nodeIndex) => {
        node.classList.toggle("is-active", nodeIndex === safeIndex);
      });
      activeIndex = safeIndex;
      const activeNode = optionNodes[safeIndex];
      if (activeNode) {
        menu.setAttribute("aria-activedescendant", activeNode.id);
        if (scroll) {
          activeNode.scrollIntoView({ block: "nearest" });
        }
      }
    }

    function commitSelection(index) {
      if (!optionNodes.length) {
        return;
      }
      const safeIndex = Math.max(0, Math.min(index, optionNodes.length - 1));
      if (nativeSelect.selectedIndex !== safeIndex) {
        nativeSelect.selectedIndex = safeIndex;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        updateSelectedState(safeIndex);
      }
      activeIndex = safeIndex;
      valueNode.textContent = nativeSelect.options[safeIndex]?.text || "";
      closeMenu({ focusTrigger: true });
    }

    function updateSelectedState(selectedIndex) {
      if (!optionNodes.length) {
        activeIndex = -1;
        return;
      }
      optionNodes.forEach((node, nodeIndex) => {
        const isSelected = nodeIndex === selectedIndex;
        node.classList.toggle("is-selected", isSelected);
        node.setAttribute("aria-selected", isSelected ? "true" : "false");
      });
      activeIndex = Math.max(0, Math.min(selectedIndex, optionNodes.length - 1));
    }

    function handleDocumentPointer(event) {
      if (!container.contains(event.target)) {
        closeMenu();
      }
    }

    function handleFocusIn(event) {
      if (!container.contains(event.target)) {
        closeMenu();
      }
    }

    function handleGlobalKeydown(event) {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeMenu({ focusTrigger: true });
      }
    }

    return {
      close: closeMenu,
      refresh: () => {
        renderOptions();
        updateSelectedState(nativeSelect.selectedIndex);
      }
    };
  }

  function initialize() {
    // Enhance music select dropdown
    if (musicSelect) {
      customSelectController = enhanceMusicSelect(musicSelect);
    }

    // Initialize button state
    if (playMusicButton && audioPlayer) {
      updateMusicButtonUI();

      // Listen to audio player events
      audioPlayer.addEventListener('play', updateMusicButtonUI);
      audioPlayer.addEventListener('pause', updateMusicButtonUI);

      // Play button click handler
      playMusicButton.addEventListener("click", handlePlayClick);
    }

    // Update button when music selection changes
    musicSelect?.addEventListener("change", updateMusicButtonUI);

    // Volume control
    if (volumeSlider && audioPlayer) {
      // Initialize volume from saved state
      const currentVolume = audioPlayer.getVolume();
      volumeSlider.value = Math.round(currentVolume * 100);
      if (volumeValue) {
        volumeValue.textContent = `${Math.round(currentVolume * 100)}%`;
      }

      // Handle volume changes
      volumeSlider.addEventListener("input", handleVolumeChange);
    }
  }

  return {
    initialize,
    updateButtonUI: updateMusicButtonUI,
    customSelect: customSelectController
  };
}
